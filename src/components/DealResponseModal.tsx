import React, { useState } from 'react';
import { X, Send, AlertCircle, MessageSquare, Image as ImageIcon, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DealResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: any;
  responseType: 'recipient_response' | 'admin_approval';
  onResponseSubmitted: () => void;
}

export default function DealResponseModal({ 
  isOpen, 
  onClose, 
  deal, 
  responseType, 
  onResponseSubmitted 
}: DealResponseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    content: '',
    images: [] as string[],
    isApproved: null as boolean | null
  });

  if (!isOpen || !deal) return null;

  const isAdminResponse = responseType === 'admin_approval';
  const isRecipientResponse = responseType === 'recipient_response';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert the response
      const { error: responseError } = await supabase
        .from('deal_responses')
        .insert({
          deal_id: deal.id,
          user_id: user.id,
          content: formData.content,
          images: formData.images.filter(img => img.trim() !== ''),
          response_type: responseType,
          is_approved: formData.isApproved
        });

      if (responseError) throw responseError;

      // Update deal status based on response
      let newStatus = deal.status;
      
      if (isRecipientResponse) {
        if (formData.isApproved === true) {
          // Recipient approved - move to negotiating status (ready for admin review)
          newStatus = 'negotiating';
        } else if (formData.isApproved === false) {
          // Recipient rejected - deal is rejected
          newStatus = 'rejected';
        }
      } else if (isAdminResponse) {
        // Admin can only respond when deal is in 'negotiating' status (both parties agreed)
        if (deal.status === 'negotiating') {
          if (formData.isApproved === true) {
            newStatus = 'approved';
          } else if (formData.isApproved === false) {
            newStatus = 'rejected';
          }
        } else {
          throw new Error('Admin can only review deals after both parties have agreed');
        }
      }

      const { error: dealError } = await supabase
        .from('deals')
        .update({ status: newStatus })
        .eq('id', deal.id);

      if (dealError) throw dealError;

      onResponseSubmitted();
      onClose();
      setFormData({ content: '', images: [], isApproved: null });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addImageUrl = () => {
    if (formData.images.length < 5) {
      setFormData({
        ...formData,
        images: [...formData.images, '']
      });
    }
  };

  const updateImageUrl = (index: number, url: string) => {
    const newImages = [...formData.images];
    newImages[index] = url;
    setFormData({ ...formData, images: newImages });
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const modalTitle = isAdminResponse ? 'Admin Review' : 'Respond to Deal';
  const modalDescription = isAdminResponse 
    ? `Review and approve/reject this deal between ${deal.initiator?.username} and ${deal.recipient?.username}`
    : `Respond to deal proposal from ${deal.initiator?.username}`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          isAdminResponse 
            ? 'bg-gradient-to-r from-red-600 to-orange-600' 
            : 'bg-gradient-to-r from-blue-600 to-purple-600'
        }`}></div>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isAdminResponse 
                  ? 'bg-gradient-to-r from-red-600 to-orange-600' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600'
              }`}>
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{modalTitle}</h2>
                <p className="text-gray-600 dark:text-gray-400">{modalDescription}</p>
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

          {/* Show warning for admin if deal is not ready for review */}
          {isAdminResponse && deal.status !== 'negotiating' && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700 dark:text-yellow-400">
                <p className="font-medium">Deal Not Ready for Admin Review</p>
                <p>This deal can only be reviewed after both parties have agreed to the terms. Current status: {deal.status}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Approval Decision */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {isAdminResponse ? 'Admin Decision' : 'Your Response'}
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isApproved: true })}
                  disabled={isAdminResponse && deal.status !== 'negotiating'}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    formData.isApproved === true
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-green-300 dark:hover:border-green-600'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{isAdminResponse ? 'Approve Deal' : 'Accept Proposal'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isApproved: false })}
                  disabled={isAdminResponse && deal.status !== 'negotiating'}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    formData.isApproved === false
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-red-300 dark:hover:border-red-600'
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                  <span>{isAdminResponse ? 'Reject Deal' : 'Decline Proposal'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isAdminResponse ? 'Admin Notes' : 'Response Message'}
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder={isAdminResponse 
                  ? "Add any notes about your decision..." 
                  : "Share your thoughts on this deal proposal..."
                }
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Supporting Images (Optional)
                </label>
                <button
                  type="button"
                  onClick={addImageUrl}
                  disabled={formData.images.length >= 5}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Add Image ({formData.images.length}/5)</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.images.map((imageUrl, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => updateImageUrl(index, e.target.value)}
                      placeholder="Enter image URL"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
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
                disabled={loading || formData.isApproved === null || (isAdminResponse && deal.status !== 'negotiating')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Submitting...' : 'Submit Response'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}