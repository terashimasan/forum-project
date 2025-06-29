import React, { useState, useEffect } from 'react';
import { Handshake, MessageSquare, Calendar, CheckCircle, XCircle, Clock, Eye, User, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DealResponseModal from './DealResponseModal';
import DealReviewModal from './DealReviewModal';
import UserBadge from './UserBadge';

interface DealsPanelProps {
  userProfile?: any;
  isAdmin?: boolean;
}

export default function DealsPanel({ userProfile, isAdmin = false }: DealsPanelProps) {
  const [deals, setDeals] = useState<any[]>([]);
  const [dealResponses, setDealResponses] = useState<Record<string, any[]>>({});
  const [dealReviews, setDealReviews] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [revieweeUser, setRevieweeUser] = useState<any>(null);
  const [responseType, setResponseType] = useState<'recipient_response' | 'admin_approval'>('recipient_response');
  const [activeTab, setActiveTab] = useState<'my-deals' | 'all-deals'>('my-deals');

  useEffect(() => {
    fetchDeals();
  }, [userProfile, isAdmin, activeTab]);

  const fetchDeals = async () => {
    if (!userProfile) return;

    try {
      let query = supabase
        .from('deals')
        .select(`
          *,
          initiator:profiles!deals_initiator_id_fkey(*),
          recipient:profiles!deals_recipient_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (!isAdmin || activeTab === 'my-deals') {
        query = query.or(`initiator_id.eq.${userProfile.id},recipient_id.eq.${userProfile.id}`);
      }

      const { data } = await query;

      if (data) {
        setDeals(data);
        
        // Fetch responses and reviews for each deal
        const responses: Record<string, any[]> = {};
        const reviews: Record<string, any[]> = {};
        
        for (const deal of data) {
          // Fetch responses
          const { data: dealResponses } = await supabase
            .from('deal_responses')
            .select(`
              *,
              profiles(*)
            `)
            .eq('deal_id', deal.id)
            .order('created_at');
          
          if (dealResponses) {
            responses[deal.id] = dealResponses;
          }

          // Fetch reviews for approved deals
          if (deal.status === 'approved') {
            const { data: dealReviews } = await supabase
              .from('deal_reviews')
              .select(`
                *,
                reviewer:profiles!deal_reviews_reviewer_id_fkey(*),
                reviewee:profiles!deal_reviews_reviewee_id_fkey(*)
              `)
              .eq('deal_id', deal.id)
              .order('created_at');
            
            if (dealReviews) {
              reviews[deal.id] = dealReviews;
            }
          }
        }
        
        setDealResponses(responses);
        setDealReviews(reviews);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'negotiating':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'negotiating':
        return <MessageSquare className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Waiting for recipient response';
      case 'negotiating':
        return 'Both parties agreed - awaiting admin approval';
      case 'approved':
        return 'Deal approved by admin';
      case 'rejected':
        return 'Deal rejected';
      case 'cancelled':
        return 'Deal cancelled';
      default:
        return status;
    }
  };

  const canRespond = (deal: any) => {
    // Admin can only respond to deals in 'negotiating' status (both parties agreed)
    if (isAdmin && deal.status === 'negotiating') return true;
    // Recipient can respond to pending deals
    if (deal.recipient_id === userProfile?.id && deal.status === 'pending') return true;
    return false;
  };

  const canReview = (deal: any) => {
    if (deal.status !== 'approved') return false;
    
    const existingReviews = dealReviews[deal.id] || [];
    const userHasReviewed = existingReviews.some(review => review.reviewer_id === userProfile?.id);
    
    return !userHasReviewed && (deal.initiator_id === userProfile?.id || deal.recipient_id === userProfile?.id);
  };

  const getRevieweeUser = (deal: any) => {
    if (deal.initiator_id === userProfile?.id) {
      return deal.recipient;
    } else {
      return deal.initiator;
    }
  };

  const handleRespond = (deal: any) => {
    setSelectedDeal(deal);
    setResponseType(isAdmin && deal.status === 'negotiating' ? 'admin_approval' : 'recipient_response');
    setShowResponseModal(true);
  };

  const handleReview = (deal: any) => {
    setSelectedDeal(deal);
    setRevieweeUser(getRevieweeUser(deal));
    setShowReviewModal(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs for Admin */}
      {isAdmin && (
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('my-deals')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'my-deals'
                ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            My Deals
          </button>
          <button
            onClick={() => setActiveTab('all-deals')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'all-deals'
                ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            All Deals ({deals.filter(d => d.status === 'negotiating').length} ready for review)
          </button>
        </div>
      )}

      {/* Deals List */}
      <div className="space-y-4">
        {deals.length === 0 ? (
          <div className="text-center py-12">
            <Handshake className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {activeTab === 'all-deals' ? 'No deals found' : 'No deals yet'}
            </p>
          </div>
        ) : (
          deals.map((deal) => (
            <div key={deal.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{deal.title}</h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${getStatusColor(deal.status)}`}>
                      {getStatusIcon(deal.status)}
                      <span>{deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}</span>
                    </span>
                    {deal.deal_type && deal.deal_type !== 'other' && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                        {deal.deal_type === 'hire_agent' ? 'Hire Agent' : deal.deal_type === 'transaction' ? 'Transaction' : deal.deal_type}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-6 mb-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <span>From:</span>
                      <UserBadge profile={deal.initiator} size="sm" showLevel={false} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>To:</span>
                      <UserBadge profile={deal.recipient} size="sm" showLevel={false} />
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(deal.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Status Description */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      {getStatusDescription(deal.status)}
                    </p>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-4">{deal.description}</p>
                  
                  {/* Deal Images */}
                  {deal.initiator_images && deal.initiator_images.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Attached Images:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {deal.initiator_images.map((imageUrl: string, index: number) => (
                          <img
                            key={index}
                            src={imageUrl}
                            alt={`Deal image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2 ml-4">
                  {canRespond(deal) && (
                    <button
                      onClick={() => handleRespond(deal)}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors font-medium"
                    >
                      {isAdmin ? 'Review Deal' : 'Respond'}
                    </button>
                  )}
                  
                  {canReview(deal) && (
                    <button
                      onClick={() => handleReview(deal)}
                      className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:from-yellow-500 hover:to-orange-600 transition-colors font-medium flex items-center space-x-2"
                    >
                      <Star className="w-4 h-4" />
                      <span>Review</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Deal Responses */}
              {dealResponses[deal.id] && dealResponses[deal.id].length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">Responses:</h5>
                  <div className="space-y-3">
                    {dealResponses[deal.id].map((response: any) => (
                      <div key={response.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <UserBadge profile={response.profiles} size="sm" showLevel={false} />
                          <div className="flex items-center space-x-2">
                            {response.is_approved !== null && (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                response.is_approved 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                              }`}>
                                {response.is_approved ? 'Approved' : 'Rejected'}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(response.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">{response.content}</p>
                        
                        {/* Response Images */}
                        {response.images && response.images.length > 0 && (
                          <div className="mt-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {response.images.map((imageUrl: string, index: number) => (
                                <img
                                  key={index}
                                  src={imageUrl}
                                  alt={`Response image ${index + 1}`}
                                  className="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-600"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deal Reviews */}
              {deal.status === 'approved' && dealReviews[deal.id] && dealReviews[deal.id].length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">Reviews:</h5>
                  <div className="space-y-3">
                    {dealReviews[deal.id].map((review: any) => (
                      <div key={review.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <UserBadge profile={review.reviewer} size="sm" showLevel={false} />
                            <span className="text-sm text-gray-600 dark:text-gray-400">reviewed</span>
                            <UserBadge profile={review.reviewee} size="sm" showLevel={false} />
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">{review.review_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Response Modal */}
      <DealResponseModal
        isOpen={showResponseModal}
        onClose={() => setShowResponseModal(false)}
        deal={selectedDeal}
        responseType={responseType}
        onResponseSubmitted={() => {
          fetchDeals();
          setShowResponseModal(false);
        }}
      />

      {/* Review Modal */}
      <DealReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        deal={selectedDeal}
        revieweeUser={revieweeUser}
        onReviewSubmitted={() => {
          fetchDeals();
          setShowReviewModal(false);
        }}
      />
    </div>
  );
}