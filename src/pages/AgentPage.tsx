import React, { useState, useEffect } from 'react';
import { Search, Users, Twitter, Instagram, Facebook, MessageCircle, ChevronLeft, ChevronRight, Plus, Settings, MapPin, Handshake } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import ManageAgentsModal from '../components/ManageAgentsModal';
import DealModal from '../components/DealModal';

const AGENTS_PER_PAGE = 9;

export default function AgentPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<any[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAgents, setUserAgents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchAgents();
  }, []);

  useEffect(() => {
    filterAgents();
  }, [searchTerm, agents]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile);

      // Fetch user's agent profiles
      const { data: agentProfiles } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id);
      setUserAgents(agentProfiles || []);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data } = await supabase
        .from('agents')
        .select(`
          *,
          profiles(id, username, avatar_url, is_verified, is_admin, is_owner)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (data) {
        setAgents(data);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAgents = () => {
    if (!searchTerm.trim()) {
      setFilteredAgents(agents);
      return;
    }

    const filtered = agents.filter(agent => {
      const searchLower = searchTerm.toLowerCase();
      return (
        agent.services?.some((service: string) => service.toLowerCase().includes(searchLower)) ||
        agent.description?.toLowerCase().includes(searchLower) ||
        agent.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower)) ||
        agent.current_location?.toLowerCase().includes(searchLower) ||
        agent.profiles?.username?.toLowerCase().includes(searchLower)
      );
    });

    setFilteredAgents(filtered);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredAgents.length / AGENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * AGENTS_PER_PAGE;
  const endIndex = startIndex + AGENTS_PER_PAGE;
  const currentAgents = filteredAgents.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUserClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const handleHireAgent = (agent: any) => {
    if (!currentUser) {
      // Redirect to login or show auth modal
      return;
    }
    setSelectedAgent(agent);
    setShowDealModal(true);
  };

  const renderSocialIcon = (platform: string, url: string) => {
    const iconProps = { className: "w-4 h-4" };
    
    switch (platform) {
      case 'social_twitter':
        return <Twitter {...iconProps} />;
      case 'social_instagram':
        return <Instagram {...iconProps} />;
      case 'social_facebook':
        return <Facebook {...iconProps} />;
      case 'social_telegram':
        return <MessageCircle {...iconProps} />;
      default:
        return null;
    }
  };

  const canCreateAgents = currentUser?.is_verified && userAgents.length < 5;
  const hasAgents = userAgents.length > 0;

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agent Directory</h1>
              <p className="text-gray-600 dark:text-gray-400">Browse our professional companion services</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {hasAgents && (
              <button
                onClick={() => setShowManageModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Settings className="w-4 h-4" />
                <span>Manage Agents ({userAgents.length}/5)</span>
              </button>
            )}

            {canCreateAgents && !hasAgents && (
              <button
                onClick={() => setShowManageModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Create Agent Profile</span>
              </button>
            )}

            {currentUser?.is_verified && userAgents.length >= 5 && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 rounded-lg font-medium">
                <Users className="w-4 h-4" />
                <span>Agent Limit Reached (5/5)</span>
              </div>
            )}

            {!currentUser?.is_verified && currentUser && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded-lg font-medium">
                <Users className="w-4 h-4" />
                <span>Verification Required</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="h-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full"></div>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search agents by services, tags, location, username, or description..."
            className="w-full pl-12 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg"
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-400 text-center">
          {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} found
          {searchTerm && ` for "${searchTerm}"`}
        </p>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
        {currentAgents.map((agent) => (
          <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            {/* Profile Picture */}
            <div className="relative h-64 overflow-hidden">
              <img
                src={agent.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400'}
                alt="Agent profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              
              {/* Location Badge */}
              {agent.current_location && (
                <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                  <MapPin className="w-3 h-3" />
                  <span>{agent.current_location}</span>
                </div>
              )}

              {/* Hire Agent Button */}
              {currentUser && currentUser.id !== agent.user_id && (
                <button
                  onClick={() => handleHireAgent(agent)}
                  className="absolute bottom-3 right-3 bg-gradient-to-r from-green-600 to-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-1"
                >
                  <Handshake className="w-4 h-4" />
                  <span>Hire Agent</span>
                </button>
              )}
            </div>

            <div className="p-6">
              {/* User Info */}
              <div className="mb-4">
                <div 
                  className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleUserClick(agent.profiles.id)}
                >
                  {agent.profiles.avatar_url ? (
                    <img
                      src={agent.profiles.avatar_url}
                      alt={agent.profiles.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {agent.profiles.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {agent.profiles.username}
                    </span>
                    {agent.profiles.is_verified && (
                      <span className="text-blue-500">✓</span>
                    )}
                    {agent.profiles.is_admin && (
                      <span className="text-red-500">👑</span>
                    )}
                    {agent.profiles.is_owner && (
                      <span className="text-purple-500">💎</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Physical Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Height</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {agent.height || '—'}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Weight</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {agent.weight || '—'}
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Services</h4>
                <div className="flex flex-wrap gap-2">
                  {agent.services && agent.services.length > 0 ? (
                    agent.services.map((service: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 text-sm rounded-full"
                      >
                        {service}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">—</span>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Pricing</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Short time:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {agent.pricing_short_time || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Long time:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {agent.pricing_long_time || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Overnight:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {agent.pricing_overnight || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Private:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {agent.pricing_private || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">About</h4>
                <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {agent.description ? (
                    <div className="whitespace-pre-line">
                      {agent.description}
                    </div>
                  ) : (
                    '—'
                  )}
                </div>
              </div>

              {/* Social Media */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Connect</h4>
                <div className="flex space-x-3">
                  {['social_twitter', 'social_instagram', 'social_facebook', 'social_telegram'].some(platform => agent[platform]) ? (
                    ['social_twitter', 'social_instagram', 'social_facebook', 'social_telegram'].map((platform) => {
                      if (!agent[platform]) return null;
                      return (
                        <a
                          key={platform}
                          href={agent[platform]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-lg transition-colors"
                        >
                          {renderSocialIcon(platform, agent[platform])}
                        </a>
                      );
                    })
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 text-sm">—</span>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {agent.tags && agent.tags.length > 0 ? (
                    agent.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded-md"
                      >
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 text-sm">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No agents found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try adjusting your search terms or browse all available agents.
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === page
                  ? 'bg-pink-600 text-white'
                  : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Manage Agents Modal */}
      <ManageAgentsModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        onAgentsUpdated={() => {
          fetchCurrentUser();
          fetchAgents();
        }}
      />

      {/* Deal Modal */}
      <DealModal
        isOpen={showDealModal}
        onClose={() => setShowDealModal(false)}
        recipientUser={selectedAgent?.profiles}
        defaultDealType="hire_agent"
        onDealCreated={() => {
          setShowDealModal(false);
          // Optionally show success message or redirect
        }}
      />
    </div>
  );
}