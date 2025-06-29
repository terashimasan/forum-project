import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Plus, Minus, Shield, Hash, MessageSquare, Edit, Trash2, Save, Eye, EyeOff, Pin, Lock, Unlock, Flag, Star, Users, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import UserBadge from './UserBadge';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  const [reviewAssessments, setReviewAssessments] = useState<any[]>([]);
  const [agentRequests, setAgentRequests] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('verification');
  
  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    description: '',
    color: '#3b82f6'
  });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentUser();
      fetchCategories();
      fetchThreads();
      fetchPosts();
      fetchVerificationRequests();
      fetchReviewAssessments();
      fetchAgentRequests();
    }
  }, [isOpen]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .order('name');
    
    if (data) setCategories(data);
  };

  const fetchThreads = async () => {
    const { data } = await supabase
      .from('threads')
      .select(`
        *,
        profiles(*),
        categories(*)
      `)
      .order('created_at', { ascending: false });
    
    if (data) setThreads(data);
  };

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(*),
        threads(title)
      `)
      .order('created_at', { ascending: false });
    
    if (data) setPosts(data);
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
          *,
          reviewer:profiles!deal_reviews_reviewer_id_fkey(username, avatar_url),
          reviewee:profiles!deal_reviews_reviewee_id_fkey(username, avatar_url),
          deal:deals(title)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (data) setReviewAssessments(data);
  };

  const fetchAgentRequests = async () => {
    const { data } = await supabase
      .from('agents')
      .select(`
        *,
        profiles(username, avatar_url)
      `)
      .order('created_at', { ascending: false });
    
    if (data) setAgentRequests(data);
  };

  // Verification Request Functions
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

  // Review Assessment Functions
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

  // Agent Request Functions
  const handleAgentRequest = async (agentId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ 
          status, 
          admin_notes: adminNotes || null 
        })
        .eq('id', agentId);

      if (error) throw error;

      fetchAgentRequests();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Category Management Functions
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description,
            color: categoryForm.color
          })
          .eq('id', editingCategory);
        
        if (error) throw error;
      } else {
        // Get the highest sort_order and add 1
        const maxSortOrder = Math.max(...categories.map(c => c.sort_order || 0), 0);
        
        const { error } = await supabase
          .from('categories')
          .insert({
            name: categoryForm.name,
            description: categoryForm.description,
            color: categoryForm.color,
            sort_order: maxSortOrder + 1
          });
        
        if (error) throw error;
      }
      
      setCategoryForm({ id: '', name: '', description: '', color: '#3b82f6' });
      setEditingCategory(null);
      fetchCategories();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const editCategory = (category: any) => {
    setCategoryForm({
      id: category.id,
      name: category.name,
      description: category.description || '',
      color: category.color
    });
    setEditingCategory(category.id);
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setCategoryForm({ id: '', name: '', description: '', color: '#3b82f6' });
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? All threads in this category will also be deleted.')) {
      return;
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (!error) {
      fetchCategories();
      fetchThreads();
    }
  };

  // Category Sorting Functions
  const moveCategoryUp = async (categoryId: string, currentOrder: number) => {
    const targetCategory = categories.find(c => c.sort_order === currentOrder - 1);
    if (!targetCategory) return;

    try {
      // Swap sort orders
      await supabase
        .from('categories')
        .update({ sort_order: currentOrder })
        .eq('id', targetCategory.id);

      await supabase
        .from('categories')
        .update({ sort_order: currentOrder - 1 })
        .eq('id', categoryId);

      fetchCategories();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const moveCategoryDown = async (categoryId: string, currentOrder: number) => {
    const targetCategory = categories.find(c => c.sort_order === currentOrder + 1);
    if (!targetCategory) return;

    try {
      // Swap sort orders
      await supabase
        .from('categories')
        .update({ sort_order: currentOrder })
        .eq('id', targetCategory.id);

      await supabase
        .from('categories')
        .update({ sort_order: currentOrder + 1 })
        .eq('id', categoryId);

      fetchCategories();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Thread Management Functions
  const toggleThreadPin = async (threadId: string, isPinned: boolean) => {
    const { error } = await supabase
      .from('threads')
      .update({ is_pinned: !isPinned })
      .eq('id', threadId);

    if (!error) {
      fetchThreads();
    }
  };

  const toggleThreadLock = async (threadId: string, isLocked: boolean) => {
    const { error } = await supabase
      .from('threads')
      .update({ is_locked: !isLocked })
      .eq('id', threadId);

    if (!error) {
      fetchThreads();
    }
  };

  const deleteThread = async (threadId: string) => {
    if (!confirm('Are you sure you want to delete this thread? All posts in this thread will also be deleted.')) {
      return;
    }

    const { error } = await supabase
      .from('threads')
      .delete()
      .eq('id', threadId);

    if (!error) {
      fetchThreads();
      fetchPosts();
    }
  };

  // Post Management Functions
  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (!error) {
      fetchPosts();
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-orange-600"></div>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto">
            <button
              onClick={() => setActiveTab('verification')}
              className={`flex-shrink-0 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'verification'
                  ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Verification Requests
            </button>
            <button
              onClick={() => setActiveTab('agent-verification')}
              className={`flex-shrink-0 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'agent-verification'
                  ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Agent Verification ({agentRequests.filter(a => a.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('review-assessments')}
              className={`flex-shrink-0 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'review-assessments'
                  ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Flag className="w-4 h-4 inline mr-2" />
              Review Assessments ({reviewAssessments.filter(a => a.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex-shrink-0 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'categories'
                  ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Hash className="w-4 h-4 inline mr-2" />
              Category Manager
            </button>
            <button
              onClick={() => setActiveTab('threads')}
              className={`flex-shrink-0 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'threads'
                  ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Thread Manager
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-shrink-0 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Post Manager
            </button>
          </div>

          {/* Verification Requests */}
          {activeTab === 'verification' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Verification Requests ({verificationRequests.length})</h3>
              </div>

              <div className="space-y-4">
                {verificationRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No verification requests pending</p>
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
                                className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
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

          {/* Agent Verification */}
          {activeTab === 'agent-verification' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Agent Verification ({agentRequests.length})</h3>
              </div>

              <div className="space-y-4">
                {agentRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No agent requests</p>
                  </div>
                ) : (
                  agentRequests.map((agent) => (
                    <div key={agent.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {agent.profiles?.avatar_url ? (
                            <img
                              src={agent.profiles.avatar_url}
                              alt={agent.profiles.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                              {agent.profiles?.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{agent.profiles?.username}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Submitted {new Date(agent.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          agent.status === 'pending' 
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                            : agent.status === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}>
                          {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                        </span>
                      </div>

                      {/* Agent Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Physical Stats</h5>
                          <div className="space-y-1 text-sm">
                            <div>Height: {agent.height || '—'}</div>
                            <div>Weight: {agent.weight || '—'}</div>
                            <div>Location: {agent.current_location || '—'}</div>
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Pricing</h5>
                          <div className="space-y-1 text-sm">
                            <div>Short: {agent.pricing_short_time || '—'}</div>
                            <div>Long: {agent.pricing_long_time || '—'}</div>
                            <div>Overnight: {agent.pricing_overnight || '—'}</div>
                            <div>Private: {agent.pricing_private || '—'}</div>
                          </div>
                        </div>
                      </div>

                      {agent.services && agent.services.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Services:</h5>
                          <div className="flex flex-wrap gap-2">
                            {agent.services.map((service: string, index: number) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 text-sm rounded-full"
                              >
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {agent.description && (
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Description:</h5>
                          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{agent.description}</p>
                        </div>
                      )}

                      {agent.profile_picture && (
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Profile Picture:</h5>
                          <img
                            src={agent.profile_picture}
                            alt="Agent profile"
                            className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {agent.admin_notes && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-1">Admin Notes:</h5>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">{agent.admin_notes}</p>
                        </div>
                      )}

                      {agent.status === 'pending' && (
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              const notes = prompt('Add admin notes (optional):');
                              handleAgentRequest(agent.id, 'approved', notes || undefined);
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('Add admin notes (optional):');
                              handleAgentRequest(agent.id, 'rejected', notes || undefined);
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
          {activeTab === 'review-assessments' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Review Assessments ({reviewAssessments.length})</h3>
              </div>

              <div className="space-y-4">
                {reviewAssessments.length === 0 ? (
                  <div className="text-center py-12">
                    <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No review assessments pending</p>
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

                      {/* Review Details */}
                      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-3">Review Being Assessed:</h5>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {assessment.deal_reviews?.reviewer?.avatar_url ? (
                              <img
                                src={assessment.deal_reviews.reviewer.avatar_url}
                                alt={assessment.deal_reviews.reviewer.username}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {assessment.deal_reviews?.reviewer?.username?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {assessment.deal_reviews?.reviewer?.username} → {assessment.deal_reviews?.reviewee?.username}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Deal: {assessment.deal_reviews?.deal?.title}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {renderStars(assessment.deal_reviews?.rating || 0)}
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {assessment.deal_reviews?.rating}/5
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {assessment.deal_reviews?.review_text}
                        </p>
                      </div>

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

          {/* Category Management */}
          {activeTab === 'categories' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Categories ({categories.length})</h3>
              </div>

              {/* Category Form */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h4>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                      <input
                        type="text"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                      <input
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                        className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-md"
                      />
                    </div>
                    <div className="flex items-end space-x-2">
                      <button
                        type="submit"
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>{editingCategory ? 'Update' : 'Create'}</span>
                      </button>
                      {editingCategory && (
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </form>
              </div>

              {/* Categories List */}
              <div className="space-y-3">
                {categories.map((category, index) => (
                  <div key={category.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{category.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{category.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {threads.filter(t => t.category_id === category.id).length} threads
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Sort Controls */}
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveCategoryUp(category.id, category.sort_order)}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveCategoryDown(category.id, category.sort_order)}
                            disabled={index === categories.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => editCategory(category)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit category"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thread Management */}
          {activeTab === 'threads' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Threads ({threads.length})</h3>
              </div>

              <div className="space-y-3">
                {threads.map((thread) => (
                  <div key={thread.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {thread.is_pinned && <Pin className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />}
                          {thread.is_locked && <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />}
                          <span
                            className="px-2 py-1 text-xs font-medium rounded-full"
                            style={{
                              backgroundColor: thread.categories?.color + '20',
                              color: thread.categories?.color,
                            }}
                          >
                            {thread.categories?.name}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">{thread.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{thread.content}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                          <span>By {thread.profiles?.username}</span>
                          <span>{thread.views} views</span>
                          <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => toggleThreadPin(thread.id, thread.is_pinned)}
                          className={`p-2 rounded-lg transition-colors ${
                            thread.is_pinned
                              ? 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                              : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={thread.is_pinned ? 'Unpin thread' : 'Pin thread'}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleThreadLock(thread.id, thread.is_locked)}
                          className={`p-2 rounded-lg transition-colors ${
                            thread.is_locked
                              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={thread.is_locked ? 'Unlock thread' : 'Lock thread'}
                        >
                          {thread.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteThread(thread.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete thread"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post Management */}
          {activeTab === 'posts' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Posts ({posts.length})</h3>
              </div>

              <div className="space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <UserBadge profile={post.profiles} size="sm" showLevel={false} />
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            in thread: {post.threads?.title}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-3">{post.content}</p>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => deletePost(post.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}