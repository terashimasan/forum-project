import React, { useState, useEffect } from 'react';
import { X, Shield, CheckCircle, XCircle, AlertTriangle, UserCheck, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import UserManagerModal from './UserManagerModal';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [activeSection, setActiveSection] = useState('verification-requests');
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  const [reviewAssessments, setReviewAssessments] = useState<any[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentUserProfile();
      fetchData();
    }
  }, [isOpen, activeSection]);

  const fetchCurrentUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching current user profile:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSection === 'verification-requests') {
        await fetchVerificationRequests();
      } else if (activeSection === 'review-assessments') {
        await fetchReviewAssessments();
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
      count: 0
    }
  ];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-orange-600"></div>
          
          <div className="flex h-full max-h-[90vh]">
            {/* Sidebar */}
            <div className="w-80 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
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
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
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
                        onClick={() => {
                          if (item.id === 'user-manager') {
                            setShowUserManager(true);
                          } else {
                            setActiveSection(item.id);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
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
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
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
                              <div key={request.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
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
                                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
                              <div key={assessment.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
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
                                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Manager Modal */}
      <UserManagerModal
        isOpen={showUserManager}
        onClose={() => setShowUserManager(false)}
        currentUserProfile={currentUserProfile}
      />
    </>
  );
}