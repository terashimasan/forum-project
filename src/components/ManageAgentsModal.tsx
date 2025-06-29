import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AgentRegistrationModal from './AgentRegistrationModal';
import EditAgentModal from './EditAgentModal';

interface ManageAgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentsUpdated: () => void;
}

export default function ManageAgentsModal({ isOpen, onClose, onAgentsUpdated }: ManageAgentsModalProps) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [deletingAgent, setDeletingAgent] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUserAgents();
    }
  }, [isOpen]);

  const fetchUserAgents = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAgents(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent profile? This action cannot be undone.')) {
      return;
    }

    setDeletingAgent(agentId);

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      await fetchUserAgents();
      onAgentsUpdated();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setDeletingAgent(null);
    }
  };

  const handleEditAgent = (agent: any) => {
    setSelectedAgent(agent);
    setShowEditModal(true);
  };

  const canCreateMore = agents.length < 5;

  if (!isOpen) return null;

  return (
    <>
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
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Agents</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Create, edit, and manage your agent profiles ({agents.length}/5)
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {canCreateMore && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Agent</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Agent Limit Info */}
                <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-pink-900 dark:text-pink-300 mb-1">Agent Profiles</h3>
                      <p className="text-sm text-pink-700 dark:text-pink-400">
                        You can create up to 5 agent profiles. Each profile is automatically approved.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                        {agents.length}/5
                      </div>
                      <div className="text-xs text-pink-500 dark:text-pink-500">
                        {canCreateMore ? `${5 - agents.length} remaining` : 'Limit reached'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3 w-full bg-pink-200 dark:bg-pink-800 rounded-full h-2">
                    <div
                      className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(agents.length / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Agents Grid */}
                {agents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {agents.map((agent) => (
                      <div key={agent.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        {/* Agent Image */}
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={agent.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400'}
                            alt="Agent profile"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                          
                          {/* Status Badge */}
                          <div className="absolute top-3 right-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${
                              agent.status === 'approved'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                : agent.status === 'pending'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                            }`}>
                              <CheckCircle className="w-3 h-3" />
                              <span>{agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}</span>
                            </span>
                          </div>
                        </div>

                        <div className="p-4">
                          {/* Basic Info */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                Agent Profile #{agents.indexOf(agent) + 1}
                              </h3>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(agent.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            
                            {agent.current_location && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                📍 {agent.current_location}
                              </p>
                            )}
                            
                            {agent.description && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                {agent.description}
                              </p>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                              <div className="text-gray-600 dark:text-gray-400">Height</div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {agent.height || '—'}
                              </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                              <div className="text-gray-600 dark:text-gray-400">Weight</div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {agent.weight || '—'}
                              </div>
                            </div>
                          </div>

                          {/* Services */}
                          {agent.services && agent.services.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Services</div>
                              <div className="flex flex-wrap gap-1">
                                {agent.services.slice(0, 3).map((service: string, index: number) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 text-xs rounded-full"
                                  >
                                    {service}
                                  </span>
                                ))}
                                {agent.services.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                                    +{agent.services.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditAgent(agent)}
                              className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteAgent(agent.id)}
                              disabled={deletingAgent === agent.id}
                              className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{deletingAgent === agent.id ? 'Deleting...' : 'Delete'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Agent Profiles</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      You haven't created any agent profiles yet. Create your first one to get started.
                    </p>
                    {canCreateMore && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition-colors font-medium"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Create Your First Agent</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Limit Reached Message */}
                {!canCreateMore && agents.length > 0 && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center">
                    <h3 className="font-medium text-orange-900 dark:text-orange-300 mb-2">Agent Limit Reached</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-400">
                      You've reached the maximum of 5 agent profiles. Delete an existing profile to create a new one.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Agent Modal */}
      <AgentRegistrationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmitted={() => {
          fetchUserAgents();
          onAgentsUpdated();
          setShowCreateModal(false);
        }}
      />

      {/* Edit Agent Modal */}
      <EditAgentModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        agentData={selectedAgent}
        onUpdated={() => {
          fetchUserAgents();
          onAgentsUpdated();
          setShowEditModal(false);
        }}
      />
    </>
  );
}