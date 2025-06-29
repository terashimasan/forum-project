import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Calendar, Award, TrendingUp, Handshake, Star, MoreVertical, Flag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserLevel } from '../lib/userLevels';
import ProfileModal from '../components/ProfileModal';
import ThreadCard from '../components/ThreadCard';
import DealModal from '../components/DealModal';
import DealsPanel from '../components/DealsPanel';
import ReviewAssessmentModal from '../components/ReviewAssessmentModal';

export default function UserPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userThreads, setUserThreads] = useState<any[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [reviewAssessments, setReviewAssessments] = useState<Record<string, any>>({});
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [showReviewMenu, setShowReviewMenu] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'threads' | 'posts' | 'deals' | 'reviews'>('threads');

  useEffect(() => {
    if (userId) {
      fetchUser();
      fetchUserThreads();
      fetchUserPosts();
      fetchUserReviews();
      fetchCurrentUser();
    }
  }, [userId]);

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

  const fetchUser = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setUser(data);
    } else {
      // User not found, redirect to forum
      navigate('/');
    }
  };

  const fetchUserThreads = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('threads')
      .select(`
        *,
        profiles(*),
        categories(*)
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setUserThreads(data);
      
      // Fetch post counts for each thread
      const counts: Record<string, number> = {};
      for (const thread of data) {
        const { count } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', thread.id);
        counts[thread.id] = count || 0;
      }
      setPostCounts(counts);
    }
  };

  const fetchUserPosts = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(*),
        threads(id, title, categories(*))
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setUserPosts(data);
    }
  };

  const fetchUserReviews = async () => {
    if (!userId) return;

    try {
      const { data } = await supabase
        .from('deal_reviews')
        .select(`
          *,
          reviewer:profiles!deal_reviews_reviewer_id_fkey(*),
          deal:deals(title, created_at)
        `)
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false });

      if (data) {
        setUserReviews(data);
        
        // Fetch assessment status for each review if current user is the reviewee
        if (currentUser && currentUser.id === userId) {
          const assessments: Record<string, any> = {};
          for (const review of data) {
            const { data: assessment } = await supabase
              .from('review_assessments')
              .select('*')
              .eq('review_id', review.id)
              .maybeSingle();
            
            if (assessment) {
              assessments[review.id] = assessment;
            }
          }
          setReviewAssessments(assessments);
        }
        
        // Calculate review statistics
        if (data.length > 0) {
          const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
          const averageRating = totalRating / data.length;
          setReviewStats({
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews: data.length
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssessmentRequest = (review: any) => {
    setSelectedReview(review);
    setShowAssessmentModal(true);
    setShowReviewMenu(null);
  };

  const canRequestAssessment = (review: any) => {
    // Only reviewee can request assessment, only for 1-4 star reviews, and only if no assessment exists
    return currentUser && 
           currentUser.id === userId && // Current user is viewing their own profile
           review.reviewee_id === currentUser.id && // Current user is the reviewee
           review.rating >= 1 && 
           review.rating <= 4 && 
           !reviewAssessments[review.id];
  };

  const renderStars = (rating: number, showNumber: boolean = false) => {
    const stars = Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));

    return (
      <div className="flex items-center space-x-1">
        <div className="flex items-center">{stars}</div>
        {showNumber && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {rating.toFixed(1)} ({reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''})
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">User not found</h1>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            Return to Forum
          </button>
        </div>
      </div>
    );
  }

  const level = getUserLevel(user.post_count, user.reputation);
  const isOwnProfile = currentUser?.id === user.id;
  const canMakeDeal = currentUser && !isOwnProfile;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Forum</span>
        </button>
      </div>

      {/* User Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
        <div className="p-8">
          <div className="flex items-center space-x-6 mb-6">
            <div className="relative">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className={`w-24 h-24 rounded-full object-cover ${level.specialEffect ? 'ring-4 ring-offset-4 ring-opacity-60 animate-pulse shadow-2xl' : 'shadow-lg'}`}
                  style={level.specialEffect ? { 
                    ringColor: level.glowColor.replace('shadow-', '').replace('/60', ''),
                    boxShadow: `0 0 30px ${level.glowColor.replace('shadow-', '').replace('/60', '')}` 
                  } : {}}
                />
              ) : (
                <div className={`w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-3xl font-bold text-white ${level.specialEffect ? 'animate-pulse shadow-2xl' : 'shadow-lg'}`}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{user.username}</h1>
                {user.is_verified && (
                  <span className="text-blue-500 text-2xl">✓</span>
                )}
                {user.is_admin && (
                  <span className="text-red-500 text-2xl">👑</span>
                )}
                {user.is_owner && (
                  <span className="text-purple-500 text-2xl">💎</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2 mb-3">
                <span className={`text-xl font-semibold ${level.color} ${level.specialEffect ? 'animate-pulse' : ''}`}>
                  {level.title}
                </span>
                {level.badge && (
                  <span className="text-xl">{level.badge}</span>
                )}
              </div>

              {/* Honorable Title */}
              {user.honorable_title && (
                <div className="flex items-center space-x-2 mb-3">
                  <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-purple-600 dark:text-purple-400 font-medium italic text-lg">
                    {user.honorable_title}
                  </span>
                </div>
              )}

              {/* Review Rating */}
              {reviewStats.totalReviews > 0 && (
                <div className="flex items-center space-x-2 mb-3">
                  {renderStars(reviewStats.averageRating, true)}
                </div>
              )}

              {/* Bio */}
              {user.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-4">{user.bio}</p>
              )}

              <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{user.post_count} posts</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{user.reputation} reputation</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              <button
                onClick={() => setShowProfileModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                View Full Profile
              </button>
              
              {canMakeDeal && (
                <button
                  onClick={() => setShowDealModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  <Handshake className="w-4 h-4" />
                  <span>Make a Deal</span>
                </button>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{user.post_count}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Posts</div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{userThreads.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Threads Created</div>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{user.reputation}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Reputation</div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {reviewStats.totalReviews > 0 ? reviewStats.averageRating.toFixed(1) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Deal Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-1 p-1">
            <button
              onClick={() => setActiveTab('threads')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'threads'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Threads ({userThreads.length})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Posts ({userPosts.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'reviews'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Star className="w-4 h-4 inline mr-1" />
              Reviews ({reviewStats.totalReviews})
            </button>
            {(isOwnProfile || (currentUser?.is_admin || currentUser?.is_owner)) && (
              <button
                onClick={() => setActiveTab('deals')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  activeTab === 'deals'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Handshake className="w-4 h-4 inline mr-1" />
                Deals
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'threads' && (
            <div className="space-y-4">
              {userThreads.length > 0 ? (
                userThreads.map((thread) => (
                  <ThreadCard
                    key={thread.id}
                    thread={thread}
                    postCount={postCounts[thread.id] || 0}
                    onClick={() => navigate(`/thread/${thread.id}`)}
                    viewMode="list"
                    currentUser={currentUser}
                    onThreadUpdated={() => fetchUserThreads()}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No threads created yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="space-y-4">
              {userPosts.length > 0 ? (
                userPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transition-colors ${
                      post.threads ? 'hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer' : ''
                    }`}
                    onClick={post.threads ? () => navigate(`/thread/${post.threads.id}`) : undefined}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {post.threads ? (
                          <>
                            <span
                              className="px-2 py-1 text-xs font-medium rounded-full"
                              style={{
                                backgroundColor: post.threads.categories?.color + '20',
                                color: post.threads.categories?.color,
                              }}
                            >
                              {post.threads.categories?.name || 'Uncategorized'}
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {post.threads.title}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400">
                              Deleted Thread
                            </span>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 italic">
                              [Thread no longer exists]
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                      {post.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No posts yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {userReviews.length > 0 ? (
                <>
                  {/* Review Summary */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                          Deal Reviews Summary
                        </h3>
                        <div className="flex items-center space-x-4">
                          {renderStars(reviewStats.averageRating, true)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                          {reviewStats.averageRating.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          out of 5 stars
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Reviews */}
                  <div className="space-y-4">
                    {userReviews.map((review) => (
                      <div key={review.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            {review.reviewer.avatar_url ? (
                              <img
                                src={review.reviewer.avatar_url}
                                alt={review.reviewer.username}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                                {review.reviewer.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{review.reviewer.username}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Deal: {review.deal?.title || 'Deleted Deal'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              {renderStars(review.rating)}
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(review.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            
                            {/* Assessment Menu for Reviewee */}
                            {canRequestAssessment(review) && (
                              <div className="relative">
                                <button
                                  onClick={() => setShowReviewMenu(showReviewMenu === review.id ? null : review.id)}
                                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </button>

                                {showReviewMenu === review.id && (
                                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-48">
                                    <button
                                      onClick={() => handleAssessmentRequest(review)}
                                      className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center space-x-2 rounded-lg"
                                    >
                                      <Flag className="w-4 h-4" />
                                      <span>Request Assessment</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Assessment Status */}
                            {reviewAssessments[review.id] && (
                              <div className="text-xs">
                                <span className={`px-2 py-1 rounded-full font-medium ${
                                  reviewAssessments[review.id].status === 'pending'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                    : reviewAssessments[review.id].status === 'approved'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                }`}>
                                  Assessment {reviewAssessments[review.id].status}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{review.review_text}</p>

                        {/* Click overlay to close menu */}
                        {showReviewMenu === review.id && (
                          <div
                            className="fixed inset-0 z-5"
                            onClick={() => setShowReviewMenu(null)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No reviews yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Reviews will appear here after completing approved deals
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'deals' && (
            <DealsPanel 
              userProfile={user} 
              isAdmin={currentUser?.is_admin || currentUser?.is_owner}
            />
          )}
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={user}
        onProfileUpdate={() => fetchUser()}
        isOwnProfile={isOwnProfile}
      />

      {/* Deal Modal */}
      <DealModal
        isOpen={showDealModal}
        onClose={() => setShowDealModal(false)}
        recipientUser={user}
        onDealCreated={() => {
          setShowDealModal(false);
          // Optionally refresh deals if on deals tab
          if (activeTab === 'deals') {
            window.location.reload();
          }
        }}
      />

      {/* Review Assessment Modal */}
      <ReviewAssessmentModal
        isOpen={showAssessmentModal}
        onClose={() => setShowAssessmentModal(false)}
        review={selectedReview}
        onAssessmentSubmitted={() => {
          fetchUserReviews();
          setShowAssessmentModal(false);
        }}
      />
    </div>
  );
}