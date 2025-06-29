import React, { useState } from 'react';
import { X, Star, Send, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DealReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: any;
  revieweeUser: any; // The user being reviewed
  onReviewSubmitted: () => void;
}

export default function DealReviewModal({ 
  isOpen, 
  onClose, 
  deal, 
  revieweeUser, 
  onReviewSubmitted 
}: DealReviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  if (!isOpen || !deal || !revieweeUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('deal_reviews')
        .insert({
          deal_id: deal.id,
          reviewer_id: user.id,
          reviewee_id: revieweeUser.id,
          rating: rating,
          review_text: reviewText
        });

      if (error) throw error;

      onReviewSubmitted();
      onClose();
      setRating(0);
      setReviewText('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isActive = starValue <= (hoverRating || rating);
      
      return (
        <button
          key={index}
          type="button"
          onClick={() => setRating(starValue)}
          onMouseEnter={() => setHoverRating(starValue)}
          onMouseLeave={() => setHoverRating(0)}
          className={`text-3xl transition-colors ${
            isActive ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
          } hover:text-yellow-400`}
        >
          <Star className={`w-8 h-8 ${isActive ? 'fill-current' : ''}`} />
        </button>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Review Deal Partner</h2>
                <p className="text-gray-600 dark:text-gray-400">Rate your experience with {revieweeUser.username}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Deal Information */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Deal: {deal.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{deal.description}</p>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                How would you rate your experience with {revieweeUser.username}?
              </label>
              <div className="flex items-center space-x-1 mb-2">
                {renderStars()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {rating === 0 && 'Click to rate'}
                {rating === 1 && 'Poor - Very unsatisfied'}
                {rating === 2 && 'Fair - Somewhat unsatisfied'}
                {rating === 3 && 'Good - Neutral experience'}
                {rating === 4 && 'Very Good - Satisfied'}
                {rating === 5 && 'Excellent - Highly satisfied'}
              </div>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Write your review
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Share your experience working with this user. Was the deal completed as agreed? Were they professional and reliable?"
                required
              />
            </div>

            {/* Guidelines */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Review Guidelines</h4>
              <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                <li>• Be honest and constructive in your feedback</li>
                <li>• Focus on the deal experience and professionalism</li>
                <li>• Avoid personal attacks or inappropriate language</li>
                <li>• Reviews are public and help build community trust</li>
                <li>• You can edit or delete your review later if needed</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || rating === 0}
                className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-medium hover:from-yellow-500 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Submitting...' : 'Submit Review'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}