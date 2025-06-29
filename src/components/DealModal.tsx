import React, { useState } from 'react';
import { X, Send, AlertCircle, Handshake, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUser: any;
  onDealCreated: () => void;
  defaultDealType?: 'hire_agent' | 'transaction' | 'other';
}

export default function DealModal({ isOpen, onClose, recipientUser, onDealCreated, defaultDealType = 'other' }: DealModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deal_type: defaultDealType,
    images: [] as string[]
  });

  if (!isOpen || !recipientUser) return null;

  const dealTypes = [
    { value: 'hire_agent', label: 'Hire Agent', description: 'Hiring an agent for services' },
    { value: 'transaction', label: 'Transaction', description: 'Business transaction or trade' },
    { value: 'other', label: 'Other', description: 'Other type of deal or agreement' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('deals')
        .insert({
          initiator_id: user.id,
          recipient_id: recipientUser.id,
          title: formData.title,
          description: formData.description,
          deal_type: formData.deal_type,
          initiator_images: formData.images.filter(img => img.trim() !== '')
        });

      if (error) throw error;

      onDealCreated();
      onClose();
      setFormData({ title: '', description: '', deal_type: defaultDealType, images: [] });
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-600 to-blue-600"></div>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Handshake className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Make a Deal</h2>
                <p className="text-gray-600 dark:text-gray-400">Propose a deal with {recipientUser.username}</p>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deal Type
              </label>
              <select
                value={formData.deal_type}
                onChange={(e) => setFormData({ ...formData, deal_type: e.target.value as 'hire_agent' | 'transaction' | 'other' })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                {dealTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deal Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter a title for your deal"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deal Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Describe your deal proposal in detail..."
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
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
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

              {formData.images.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  You can add up to 5 images to support your deal proposal
                </p>
              )}
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Deal Process</h4>
              <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                <li>• Your deal proposal will be sent to {recipientUser.username}</li>
                <li>• They can respond with their own terms and images</li>
                <li>• Once both parties agree, an admin will review and approve</li>
                <li>• All deal communications are tracked and secure</li>
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
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Sending...' : 'Send Deal Proposal'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}