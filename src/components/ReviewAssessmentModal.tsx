import React, { useState } from 'react';
import { X, Send, AlertCircle, Flag, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReviewAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: any;
  onAssessmentSubmitted: () => void;
}

export default function ReviewAssessmentModal({ 
  isOpen, 
  onClose, 
  review, 
  onAssessmentSubmitted 
}: ReviewAssessmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  if (!isOpen || !review) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('review_assessments')
        .insert({
          review_id: review.id,
          user_id: user.id,
          reason: reason.trim() || null
        });

      if (error) throw error;

      onAssessmentSubmitted();
      onClose();
      setReason('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 to-red-600"></div>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
                <Flag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Request Review Assessment</h2>
                <p className="text-gray-600 dark:text-gray-400">Submit this review for admin assessment</p>
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

          {/* Review Preview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Review About You:</h3>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                {review.reviewer?.avatar_url ? (
                  <img
                    src={review.reviewer.avatar_url}
                    alt={review.reviewer.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {review.reviewer?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    From {review.reviewer?.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Deal: {review.deal?.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {renderStars(review.rating)}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {review.rating}/5
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{review.review_text}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Assessment (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Explain why you believe this review should be assessed by admins..."
              />
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h4 className="font-medium text-orange-900 dark:text-orange-300 mb-2">Assessment Guidelines</h4>
              <ul className="text-sm text-orange-700 dark:text-orange-400 space-y-1">
                <li>• Only reviews with 1-4 stars can be assessed</li>
                <li>• You can only request assessment for reviews about you</li>
                <li>• Admins will review your request and may delete the review</li>
                <li>• Each review can only be assessed once</li>
                <li>• Provide a clear reason if you believe the review violates guidelines</li>
                <li>• Assessment requests cannot be cancelled once submitted</li>
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
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-medium hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Submitting...' : 'Submit Assessment Request'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}