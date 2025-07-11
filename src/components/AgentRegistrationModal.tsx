import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, Users, Image as ImageIcon, Trash2, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AgentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

const FORM_STORAGE_KEY = 'agent_registration_form_data';

export default function AgentRegistrationModal({ isOpen, onClose, onSubmitted }: AgentRegistrationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popularServices, setPopularServices] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    profile_picture: '',
    height: '',
    weight: '',
    current_location: '',
    services: [] as string[],
    pricing_short_time: '',
    pricing_long_time: '',
    pricing_overnight: '',
    pricing_private: '',
    pricing_currency: 'IDR', // Default to Indonesian Rupiah
    description: '',
    social_twitter: '',
    social_instagram: '',
    social_facebook: '',
    social_telegram: '',
    tags: [] as string[]
  });
  const [newService, setNewService] = useState('');
  const [newTag, setNewTag] = useState('');

  // Load form data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem(FORM_STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
      } catch (error) {
        console.error('Error parsing saved form data:', error);
        // Clear corrupted data
        localStorage.removeItem(FORM_STORAGE_KEY);
      }
    }
  }, []);

  // Fetch popular services and tags when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPopularServicesAndTags();
    }
  }, [isOpen]);

  // Save form data to localStorage whenever formData changes
  useEffect(() => {
    // Only save if form has some data (not empty initial state)
    const hasData = Object.values(formData).some(value => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== '' && value !== 'IDR'; // IDR is default currency
    });

    if (hasData) {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData]);

  const fetchPopularServicesAndTags = async () => {
    try {
      // Fetch all agents to analyze their services and tags
      const { data: agents } = await supabase
        .from('agents')
        .select('services, tags')
        .eq('status', 'approved');

      if (agents) {
        // Count service occurrences
        const serviceCount: Record<string, number> = {};
        const tagCount: Record<string, number> = {};

        agents.forEach(agent => {
          // Count services
          if (agent.services && Array.isArray(agent.services)) {
            agent.services.forEach((service: string) => {
              if (service && service.trim()) {
                const normalizedService = service.trim();
                serviceCount[normalizedService] = (serviceCount[normalizedService] || 0) + 1;
              }
            });
          }

          // Count tags
          if (agent.tags && Array.isArray(agent.tags)) {
            agent.tags.forEach((tag: string) => {
              if (tag && tag.trim()) {
                const normalizedTag = tag.trim();
                tagCount[normalizedTag] = (tagCount[normalizedTag] || 0) + 1;
              }
            });
          }
        });

        // Sort by popularity and take top 10
        const topServices = Object.entries(serviceCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([service]) => service);

        const topTags = Object.entries(tagCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 15)
          .map(([tag]) => tag);

        setPopularServices(topServices);
        setPopularTags(topTags);
      }
    } catch (error) {
      console.error('Error fetching popular services and tags:', error);
      // Fallback to default suggestions if fetch fails
      setPopularServices([
        'Companion', 'Dinner Date', 'Social Events', 'Travel Companion', 'Business Events',
        'Party Companion', 'City Tour Guide', 'Shopping Companion', 'Cultural Events', 'Photography Model'
      ]);
      setPopularTags([
        'professional', 'friendly', 'elegant', 'sophisticated', 'multilingual',
        'experienced', 'reliable', 'discreet', 'charming', 'educated',
        'stylish', 'outgoing', 'cultured', 'articulate', 'versatile'
      ]);
    }
  };

  if (!isOpen) return null;

  const currencies = [
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' }
  ];

  // Format number with commas
  const formatNumber = (value: string) => {
    // Remove all non-digits
    const numericValue = value.replace(/\D/g, '');
    // Add commas for thousands
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Parse formatted number back to plain number
  const parseNumber = (value: string) => {
    return value.replace(/,/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if user is verified
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Failed to verify user profile');
      }

      if (!profile?.is_verified) {
        throw new Error('Only verified users can register as agents');
      }

      // Check agent count limit
      const { count, error: countError } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        throw new Error('Failed to check agent count');
      }

      if (count && count >= 5) {
        throw new Error('You can only create up to 5 agent profiles');
      }

      // Format pricing with currency
      const formatPrice = (price: string) => {
        if (!price || price.trim() === '') return null;
        const currency = currencies.find(c => c.code === formData.pricing_currency);
        const cleanPrice = parseNumber(price.trim());
        return `${currency?.symbol || 'Rp'}${cleanPrice}`;
      };

      // Prepare agent data
      const agentData = {
        user_id: user.id,
        profile_picture: formData.profile_picture.trim() || null,
        height: formData.height.trim() ? `${formData.height.trim()} cm` : null,
        weight: formData.weight.trim() ? `${formData.weight.trim()} kg` : null,
        current_location: formData.current_location.trim() || null,
        services: formData.services.filter(service => service.trim() !== ''),
        pricing_short_time: formatPrice(formData.pricing_short_time),
        pricing_long_time: formatPrice(formData.pricing_long_time),
        pricing_overnight: formatPrice(formData.pricing_overnight),
        pricing_private: formatPrice(formData.pricing_private),
        description: formData.description.trim() || null,
        social_twitter: formData.social_twitter.trim() || null,
        social_instagram: formData.social_instagram.trim() || null,
        social_facebook: formData.social_facebook.trim() || null,
        social_telegram: formData.social_telegram.trim() || null,
        tags: formData.tags.filter(tag => tag.trim() !== ''),
        status: 'approved' // Auto-approve new agents
      };

      const { error: insertError } = await supabase
        .from('agents')
        .insert(agentData);

      if (insertError) {
        console.error('Agent insertion error:', insertError);
        throw new Error(insertError.message || 'Failed to create agent profile');
      }

      // Success - call callbacks and clear form
      onSubmitted();
      clearFormData();
      onClose();

    } catch (error: any) {
      console.error('Agent registration error:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearFormData = () => {
    const initialFormData = {
      profile_picture: '',
      height: '',
      weight: '',
      current_location: '',
      services: [],
      pricing_short_time: '',
      pricing_long_time: '',
      pricing_overnight: '',
      pricing_private: '',
      pricing_currency: 'IDR',
      description: '',
      social_twitter: '',
      social_instagram: '',
      social_facebook: '',
      social_telegram: '',
      tags: []
    };
    
    setFormData(initialFormData);
    setNewService('');
    setNewTag('');
    setError(null);
    
    // Clear from localStorage
    localStorage.removeItem(FORM_STORAGE_KEY);
  };

  const handleClose = () => {
    if (!loading) {
      // Don't clear form data on close - keep it for next time
      onClose();
    }
  };

  const handleClearForm = () => {
    if (confirm('Are you sure you want to clear all form data? This action cannot be undone.')) {
      clearFormData();
    }
  };

  const addService = () => {
    const trimmedService = newService.trim();
    if (trimmedService && !formData.services.includes(trimmedService)) {
      setFormData({
        ...formData,
        services: [...formData.services, trimmedService]
      });
      setNewService('');
    }
  };

  const addSuggestedService = (service: string) => {
    if (!formData.services.includes(service)) {
      setFormData({
        ...formData,
        services: [...formData.services, service]
      });
    }
  };

  const removeService = (index: number) => {
    setFormData({
      ...formData,
      services: formData.services.filter((_, i) => i !== index)
    });
  };

  const addTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, trimmedTag]
      });
      setNewTag('');
    }
  };

  const addSuggestedTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag]
      });
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    });
  };

  const handleNumberInput = (value: string, field: string) => {
    // Only allow numbers and decimal points
    const numericValue = value.replace(/[^0-9.]/g, '');
    setFormData({ ...formData, [field]: numericValue });
  };

  const handlePriceInput = (value: string, field: string) => {
    // Format the price with commas
    const formattedValue = formatNumber(value);
    setFormData({ ...formData, [field]: formattedValue });
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  // Check if form has any data
  const hasFormData = Object.values(formData).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== '' && value !== 'IDR';
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-600 to-purple-600"></div>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Agent Profile</h2>
                <p className="text-gray-600 dark:text-gray-400">Create a new agent profile (automatically approved)</p>
                {hasFormData && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    ✓ Form data is automatically saved as you type
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasFormData && (
                <button
                  onClick={handleClearForm}
                  disabled={loading}
                  className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  Clear Form
                </button>
              )}
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">Creation Failed</p>
                <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Profile Picture URL (Max 5MB) *
              </label>
              <input
                type="url"
                value={formData.profile_picture}
                onChange={(e) => setFormData({ ...formData, profile_picture: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="https://example.com/photo.jpg"
                disabled={loading}
                required
              />
            </div>

            {/* Physical Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Height (cm)</label>
                <input
                  type="text"
                  value={formData.height}
                  onChange={(e) => handleNumberInput(e.target.value, 'height')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="170"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Weight (kg)</label>
                <input
                  type="text"
                  value={formData.weight}
                  onChange={(e) => handleNumberInput(e.target.value, 'weight')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="55"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Current Location
                </label>
                <input
                  type="text"
                  value={formData.current_location}
                  onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Jakarta, Indonesia"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Services */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Services Offered</label>
              
              {/* Added Services */}
              {formData.services.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.services.map((service, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-2 px-3 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 rounded-full"
                    >
                      <span>{service}</span>
                      <button
                        type="button"
                        onClick={() => removeService(index)}
                        disabled={loading}
                        className="text-pink-600 dark:text-pink-400 hover:text-pink-800 dark:hover:text-pink-200 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, addService)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Add a service"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={addService}
                  disabled={loading || !newService.trim()}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              
              {/* Popular Services Suggestions */}
              {popularServices.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Popular services (click to add):</p>
                  <div className="flex flex-wrap gap-2">
                    {popularServices.filter(service => !formData.services.includes(service)).map((service) => (
                      <button
                        key={service}
                        type="button"
                        onClick={() => addSuggestedService(service)}
                        disabled={loading}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-pink-100 dark:hover:bg-pink-900/30 hover:text-pink-700 dark:hover:text-pink-300 transition-colors disabled:opacity-50"
                      >
                        + {service}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Currency Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
              <select
                value={formData.pricing_currency}
                onChange={(e) => setFormData({ ...formData, pricing_currency: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled={loading}
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pricing</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Short Time</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      {currencies.find(c => c.code === formData.pricing_currency)?.symbol}
                    </span>
                    <input
                      type="text"
                      value={formData.pricing_short_time}
                      onChange={(e) => handlePriceInput(e.target.value, 'pricing_short_time')}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="2,500,000"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Long Time</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      {currencies.find(c => c.code === formData.pricing_currency)?.symbol}
                    </span>
                    <input
                      type="text"
                      value={formData.pricing_long_time}
                      onChange={(e) => handlePriceInput(e.target.value, 'pricing_long_time')}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="5,000,000"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Overnight</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      {currencies.find(c => c.code === formData.pricing_currency)?.symbol}
                    </span>
                    <input
                      type="text"
                      value={formData.pricing_overnight}
                      onChange={(e) => handlePriceInput(e.target.value, 'pricing_overnight')}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="10,000,000"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Private</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      {currencies.find(c => c.code === formData.pricing_currency)?.symbol}
                    </span>
                    <input
                      type="text"
                      value={formData.pricing_private}
                      onChange={(e) => handlePriceInput(e.target.value, 'pricing_private')}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="15,000,000"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Tell potential clients about yourself and your services..."
                disabled={loading}
              />
            </div>

            {/* Social Media */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Social Media Links</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="url"
                  value={formData.social_twitter}
                  onChange={(e) => setFormData({ ...formData, social_twitter: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Twitter URL"
                  disabled={loading}
                />
                <input
                  type="url"
                  value={formData.social_instagram}
                  onChange={(e) => setFormData({ ...formData, social_instagram: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Instagram URL"
                  disabled={loading}
                />
                <input
                  type="url"
                  value={formData.social_facebook}
                  onChange={(e) => setFormData({ ...formData, social_facebook: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Facebook URL"
                  disabled={loading}
                />
                <input
                  type="url"
                  value={formData.social_telegram}
                  onChange={(e) => setFormData({ ...formData, social_telegram: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Telegram URL"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
              
              {/* Added Tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        disabled={loading}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, addTag)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Add a tag"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={loading || !newTag.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              {/* Popular Tags Suggestions */}
              {popularTags.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Popular tags (click to add):</p>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.filter(tag => !formData.tags.includes(tag)).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addSuggestedTag(tag)}
                        disabled={loading}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-colors disabled:opacity-50"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
              <h4 className="font-medium text-pink-900 dark:text-pink-300 mb-2">Agent Profile Guidelines</h4>
              <ul className="text-sm text-pink-700 dark:text-pink-400 space-y-1">
                <li>• Profile picture is required, all other text fields are optional</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-medium hover:from-pink-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Creating...' : 'Create Agent Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}