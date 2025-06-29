import React, { useState, useEffect } from 'react';
import { Handshake, Plus, Filter, Search, Eye, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DealsPanel from '../components/DealsPanel';
import DealModal from '../components/DealModal';

export default function DealsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDealModal, setShowDealModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'my-deals' | 'create-deal'>('my-deals');

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

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
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('username');
    
    if (data) {
      setUsers(data);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!currentUser || user.id === currentUser.id) return false;
    return user.username.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleCreateDeal = (user: any) => {
    setSelectedUser(user);
    setShowDealModal(true);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Handshake className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sign In Required</h1>
          <p className="text-gray-600 dark:text-gray-400">Please sign in to view and manage your deals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Handshake className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Deal Center</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your deals and create new negotiations</p>
          </div>
        </div>
        
        <div className="h-1 bg-gradient-to-r from-green-600 to-blue-600 rounded-full"></div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('my-deals')}
          className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'my-deals'
              ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4 inline mr-2" />
          My Deals
        </button>
        <button
          onClick={() => setActiveTab('create-deal')}
          className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'create-deal'
              ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Create Deal
        </button>
      </div>

      {/* Content */}
      {activeTab === 'my-deals' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <DealsPanel 
              userProfile={currentUser} 
              isAdmin={currentUser?.is_admin || currentUser?.is_owner}
            />
          </div>
        </div>
      )}

      {activeTab === 'create-deal' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Deal</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Select a user to start a new deal negotiation. You can propose terms, share images, and negotiate until both parties agree.
              </p>

              {/* Search Users */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users to make a deal with..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Users List */}
            <div className="space-y-3">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center space-x-4">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{user.username}</h3>
                          {user.is_verified && (
                            <span className="text-blue-500">✓</span>
                          )}
                          {user.is_admin && (
                            <span className="text-red-500">👑</span>
                          )}
                          {user.is_owner && (
                            <span className="text-purple-500">💎</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {user.post_count} posts • {user.reputation} reputation
                        </div>
                        {user.bio && (
                          <div className="text-sm text-gray-500 dark:text-gray-500 mt-1 line-clamp-1">
                            {user.bio}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCreateDeal(user)}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors font-medium flex items-center space-x-2"
                    >
                      <Handshake className="w-4 h-4" />
                      <span>Make Deal</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No users found matching your search' : 'No users available for deals'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Deal Process Info */}
            <div className="mt-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <Handshake className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">How Deals Work</h3>
                  <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                    <li>• Create a deal proposal with description and images</li>
                    <li>• The other user can respond with their terms and images</li>
                    <li>• Once both parties agree, an admin reviews and approves</li>
                    <li>• All communications are tracked and secure</li>
                    <li>• Deals can be cancelled at any time before admin approval</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deal Creation Modal */}
      <DealModal
        isOpen={showDealModal}
        onClose={() => setShowDealModal(false)}
        recipientUser={selectedUser}
        onDealCreated={() => {
          setShowDealModal(false);
          setActiveTab('my-deals'); // Switch to deals view after creation
        }}
      />
    </div>
  );
}