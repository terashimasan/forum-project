import React, { useState, useEffect } from 'react';
import { X, Shield, Users, CheckCircle, XCircle, Award, Ban, UserCheck, AlertTriangle, Search, Filter, MoreVertical, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import UserBadge from './UserBadge';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [activeSection, setActiveSection] = useState('verification-requests');
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  const [reviewAssessments, setReviewAssessments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, activeSection]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, userFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSection === 'verification-requests') {
        await fetchVerificationRequests();
      } else if (activeSection === 'review-assessments') {
        await fetchReviewAssessments();
      } else if (activeSection === 'user-manager') {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificationRequests = async () => {
    const { data } = await supabase
      .from('verification_requests')
      .select(`
        *,
        profiles(username, avatar_url)
      `)
      .order('created_at', { ascending: false });
    
    if (data) setVerificationRequests(data);
  };

  const fetchReviewAssessments = async () => {
    const { data } = await supabase
      .from('review_assessments')
      .select(`
        *,
        profiles(username, avatar_url),
        deal_reviews(
          rating,
          review_text,
          reviewer:profiles!deal_reviews_reviewer_id_fkey(username, avatar_url),
          deal:deals(title)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (data) setReviewAssessments(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setUsers(data);
  };

  const filterUsers = () => {
    let filtered = users;

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(search) ||
        (user.bio && user.bio.toLowerCase().includes(search)) ||
        (user.honorable_title && user.honorable_title.toLowerCase().includes(search))
      );
    }

    // Apply status filter
    switch (userFilter) {
      case 'verified':
        filtered = filtered.filter(user => user.is_verified);
        break;
      case 'admin':
        filtered = filtered.filter(user => user.is_admin);
        break;
      case 'owner':
        filtered = filtered.filter(user => user.is_owner);
        break;
      case 'banned':
        filtered = filtered.filter(user => user.is_banned);
        break;
      case 'regular':
        filtered = filtered.filter(user => !user.is_verified && !user.is_admin && !user.is_owner && !user.is_banned);
        break;
    }

    setFilteredUsers(filtered);
  };

  const handleVerificationRequest = async (requestId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    const request = verificationRequests.find(r => r.id === requestId);
    if (!request) return;

    try {
      // Update the verification request
      const { error: requestError } = await supabase
        .from('verification_requests')
        .update({ 
          status, 
          admin_notes: adminNotes || null 
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // If approved, update the user's verification status
      if (status === 'approved') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_verified: true })
          .eq('id', request.user_id);

        if (profileError) throw profileError;
      }

      fetchVerificationRequests();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleReviewAssessment = async (assessmentId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    const assessment = reviewAssessments.find(a => a.id === assessmentId);
    if (!assessment) return;

    try {
      // Update the assessment
      const { error: assessmentError } = await supabase
        .from('review_assessments')
        .update({ 
          status, 
          admin_notes: adminNotes || null 
        })
        .eq('id', assessmentId);

      if (assessmentError) throw assessmentError;

      // If approved, delete the review
      if (status === 'approved') {
        const { error: reviewError } = await supabase
          .from('deal_reviews')
          .delete()
          .eq('id', assessment.review_id);

        if (reviewError) throw reviewError;
      }

      fetchReviewAssessments();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUserAction = async (userId: string, action: string, value?: any) => {
    try {
      let updateData: any = {};

      switch (action) {
        case 'verify':
          updateData.is_verified = true;
          break;
        case 'unverify':
          updateData.is_verified = false;
          break;
        case 'make-admin':
          updateData.is_admin = true;
          break;
        case 'remove-admin':
          updateData.is_admin = false;
          break;
        case 'ban':
          updateData.is_banned = true;
          break;
        case 'unban':
          updateData.is_banned = false;
          break;
        case 'set-title':
          updateData.honorable_title = value || null;
          break;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      fetchUsers();
      setShowUserMenu(null);
      setEditingUser(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const menuItems = [
    {
      id: 'verification-requests',
      label: 'Verification Requests',
      icon: UserCheck,
      count: verificationRequests.filter(r => r.status === 'pending').length
    },
    {
      id: 'review-assessments',
      label: 'Review Assessments',
      icon: AlertTriangle,
      count: reviewAssessments.filter(a => a.status === 'pending').length
    },
    {
      id: 'user-manager',
      label: 'User Manager',
      icon: Users,
      count: users.length
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex z-50">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage forum operations</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.count > 0 && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      isActive
                        ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-800 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <>
              {/* Verification Requests */}
              {activeSection === 'verification-requests' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Verification Requests ({verificationRequests.filter(r => r.status === 'pending').length} pending)
                  </h3>
                  
                  <div className="space-y-4">
                    {verificationRequests.length === 0 ? (
                      <div className="text-center py-12">
                        <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No verification requests</p>
                      </div>
                    ) : (
                      verificationRequests.map((request) => (
                        <div key={request.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              {request.profiles?.avatar_url ? (
                                <img
                                  src={request.profiles.avatar_url}
                                  alt={request.profiles.username}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                                  {request.profiles?.username?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{request.profiles?.username}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Submitted {new Date(request.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              request.status === 'pending' 
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                : request.status === 'approved'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                            }`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </div>

                          <div className="mb-4">
                            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Request Details:</h5>
                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{request.content}</p>
                          </div>

                          {request.images && request.images.length > 0 && (
                            <div className="mb-4">
                              <h5 className="font-medium text-gray-900 dark:text-white mb-2">Supporting Images:</h5>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {request.images.map((imageUrl: string, index: number) => (
                                  <img
                                    key={index}
                                    src={imageUrl}
                                    alt={`Verification image ${index + 1}`}
                                    className="w-full h-32 object-cover rounded border border-gray-200 dark:border-gray-700"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {request.admin_notes && (
                            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <h5 className="font-medium text-gray-900 dark:text-white mb-1">Admin Notes:</h5>
                              <p className="text-gray-700 dark:text-gray-300 text-sm">{request.admin_notes}</p>
                            </div>
                          )}

                          {request.status === 'pending' && (
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => {
                                  const notes = prompt('Add admin notes (optional):');
                                  handleVerificationRequest(request.id, 'approved', notes || undefined);
                                }}
                                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => {
                                  const notes = prompt('Add admin notes (optional):');
                                  handleVerificationRequest(request.id, 'rejected', notes || undefined);
                                }}
                                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Review Assessments */}
              {activeSection === 'review-assessments' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Review Assessments ({reviewAssessments.filter(a => a.status === 'pending').length} pending)
                  </h3>
                  
                  <div className="space-y-4">
                    {reviewAssessments.length === 0 ? (
                      <div className="text-center py-12">
                        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No review assessments</p>
                      </div>
                    ) : (
                      reviewAssessments.map((assessment) => (
                        <div key={assessment.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              {assessment.profiles?.avatar_url ? (
                                <img
                                  src={assessment.profiles.avatar_url}
                                  alt={assessment.profiles.username}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                                  {assessment.profiles?.username?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{assessment.profiles?.username}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Submitted {new Date(assessment.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              assessment.status === 'pending' 
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                : assessment.status === 'approved'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                            }`}>
                              {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                            </span>
                          </div>

                          {/* Review Being Assessed */}
                          {assessment.deal_reviews && (
                            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                              <h5 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Review Under Assessment:</h5>
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm text-yellow-700 dark:text-yellow-400">
                                  From: {assessment.deal_reviews.reviewer?.username}
                                </span>
                                <span className="text-sm text-yellow-700 dark:text-yellow-400">
                                  Rating: {assessment.deal_reviews.rating}/5 stars
                                </span>
                              </div>
                              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                "{assessment.deal_reviews.review_text}"
                              </p>
                              {assessment.deal_reviews.deal && (
                                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                                  Deal: {assessment.deal_reviews.deal.title}
                                </p>
                              )}
                            </div>
                          )}

                          {assessment.reason && (
                            <div className="mb-4">
                              <h5 className="font-medium text-gray-900 dark:text-white mb-2">Assessment Reason:</h5>
                              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{assessment.reason}</p>
                            </div>
                          )}

                          {assessment.admin_notes && (
                            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <h5 className="font-medium text-gray-900 dark:text-white mb-1">Admin Notes:</h5>
                              <p className="text-gray-700 dark:text-gray-300 text-sm">{assessment.admin_notes}</p>
                            </div>
                          )}

                          {assessment.status === 'pending' && (
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => {
                                  const notes = prompt('Add admin notes (optional):');
                                  handleReviewAssessment(assessment.id, 'approved', notes || undefined);
                                }}
                                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Approve & Delete Review</span>
                              </button>
                              <button
                                onClick={() => {
                                  const notes = prompt('Add admin notes (optional):');
                                  handleReviewAssessment(assessment.id, 'rejected', notes || undefined);
                                }}
                                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject Assessment</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* User Manager */}
              {activeSection === 'user-manager' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      User Manager ({filteredUsers.length} users)
                    </h3>
                  </div>

                  {/* Search and Filter */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search users by username, bio, or title..."
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                      <select
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="pl-12 pr-8 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-w-48"
                      >
                        <option value="all">All Users</option>
                        <option value="regular">Regular Users</option>
                        <option value="verified">Verified Users</option>
                        <option value="admin">Admins</option>
                        <option value="owner">Owners</option>
                        <option value="banned">Banned Users</option>
                      </select>
                    </div>
                  </div>

                  {/* Users List */}
                  <div className="space-y-4">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          {searchTerm || userFilter !== 'all' ? 'No users match your filters' : 'No users found'}
                        </p>
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <div key={user.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-4 flex-1">
                              <UserBadge profile={user} size="md" showLevel={false} clickable={false} />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {user.post_count} posts • {user.reputation} reputation
                                  </span>
                                </div>
                                {user.bio && (
                                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
                                    {user.bio}
                                  </p>
                                )}
                                {user.honorable_title && (
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    <span className="text-sm text-purple-600 dark:text-purple-400 font-medium italic">
                                      {user.honorable_title}
                                    </span>
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Joined {new Date(user.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>

                            {/* User Actions Menu */}
                            <div className="relative">
                              <button
                                onClick={() => setShowUserMenu(showUserMenu === user.id ? null : user.id)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </button>

                              {showUserMenu === user.id && (
                                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-48">
                                  {/* Verification Actions */}
                                  {!user.is_verified ? (
                                    <button
                                      onClick={() => handleUserAction(user.id, 'verify')}
                                      className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center space-x-2 first:rounded-t-lg"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      <span>Verify User</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleUserAction(user.id, 'unverify')}
                                      className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center space-x-2"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      <span>Remove Verification</span>
                                    </button>
                                  )}

                                  {/* Admin Actions */}
                                  {!user.is_admin && !user.is_owner && (
                                    <button
                                      onClick={() => handleUserAction(user.id, 'make-admin')}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                                    >
                                      <Shield className="w-4 h-4" />
                                      <span>Make Admin</span>
                                    </button>
                                  )}

                                  {user.is_admin && !user.is_owner && (
                                    <button
                                      onClick={() => handleUserAction(user.id, 'remove-admin')}
                                      className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center space-x-2"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      <span>Remove Admin</span>
                                    </button>
                                  )}

                                  {/* Honorable Title */}
                                  <button
                                    onClick={() => {
                                      const title = prompt('Enter honorable title (leave empty to remove):', user.honorable_title || '');
                                      if (title !== null) {
                                        handleUserAction(user.id, 'set-title', title.trim() || null);
                                      }
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center space-x-2"
                                  >
                                    <Award className="w-4 h-4" />
                                    <span>Set Honorable Title</span>
                                  </button>

                                  {/* Ban Actions */}
                                  {!user.is_banned && !user.is_owner ? (
                                    <button
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to ban ${user.username}?`)) {
                                          handleUserAction(user.id, 'ban');
                                        }
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 last:rounded-b-lg"
                                    >
                                      <Ban className="w-4 h-4" />
                                      <span>Ban User</span>
                                    </button>
                                  ) : user.is_banned ? (
                                    <button
                                      onClick={() => handleUserAction(user.id, 'unban')}
                                      className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center space-x-2 last:rounded-b-lg"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      <span>Unban User</span>
                                    </button>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Click overlay to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowUserMenu(null)}
        />
      )}
    </div>
  );
}