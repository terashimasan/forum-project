import React, { useState, useEffect } from 'react';
import { X, Users, Search, MoreVertical, Award, Crown, Ban, UserCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import UserBadge from './UserBadge';

interface UserManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: any;
}

export default function UserManagerModal({ isOpen, onClose, currentUserProfile }: UserManagerModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserMenu, setShowUserMenu] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('username');

      // Apply visibility rules
      if (currentUserProfile?.is_owner) {
        // Owners can see all users
      } else if (currentUserProfile?.is_admin) {
        // Admins can see all users except other admins and owners
        query = query.eq('is_admin', false).eq('is_owner', false);
      } else {
        // Non-admin/owner users shouldn't access this
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter out the current user from the list
      const filteredData = data?.filter(user => user.id !== currentUserProfile?.id) || [];
      setUsers(filteredData);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.bio && user.bio.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.honorable_title && user.honorable_title.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredUsers(filtered);
  };

  const handleAssignHonorableTitle = async (userId: string, currentTitle: string | null) => {
    const newTitle = prompt('Enter honorable title (leave empty to remove):', currentTitle || '');
    
    // User cancelled the prompt
    if (newTitle === null) return;

    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ honorable_title: newTitle.trim() || null })
        .eq('id', userId);

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: newTitle.trim() ? 'Honorable title assigned successfully' : 'Honorable title removed successfully'
      });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(null);
      setShowUserMenu(null);
    }
  };

  const handleBanUser = async (userId: string, currentlyBanned: boolean) => {
    const action = currentlyBanned ? 'unban' : 'ban';
    const confirmed = confirm(`Are you sure you want to ${action} this user?`);
    
    if (!confirmed) return;

    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !currentlyBanned })
        .eq('id', userId);

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: `User ${action}ned successfully`
      });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(null);
      setShowUserMenu(null);
    }
  };

  const getUserRole = (user: any) => {
    if (user.is_owner) return 'Owner';
    if (user.is_admin) return 'Admin';
    return 'User';
  };

  const getUserRoleColor = (user: any) => {
    if (user.is_owner) return 'text-purple-600 dark:text-purple-400';
    if (user.is_admin) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl relative overflow-hidden max-h-[90vh]">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
        
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Manager</h2>
                <p className="text-gray-600 dark:text-gray-400">Manage user roles, titles, and permissions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-start gap-3 ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${
                message.type === 'success' 
                  ? 'text-green-700 dark:text-green-400' 
                  : 'text-red-700 dark:text-red-400'
              }`}>
                {message.text}
              </p>
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users by username, bio, or honorable title..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Users Count */}
              <div className="mb-4">
                <p className="text-gray-600 dark:text-gray-400">
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                  {searchTerm && ` for "${searchTerm}"`}
                </p>
              </div>

              {/* Users List */}
              <div className="space-y-4">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          {/* User Avatar and Basic Info */}
                          <div className="flex items-center space-x-3">
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
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white">{user.username}</h3>
                                {user.is_verified && (
                                  <span className="text-blue-500">✓</span>
                                )}
                                {user.is_admin && (
                                  <span className="text-red-500">👑</span>
                                )}
                                {user.is_owner && (
                                  <span className="text-purple-500">💎</span>
                                )}
                                {user.is_banned && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                                    BANNED
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                <span className={`font-medium ${getUserRoleColor(user)}`}>
                                  {getUserRole(user)}
                                </span>
                                <span>{user.post_count} posts</span>
                                <span>{user.reputation} reputation</span>
                                <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                              </div>
                              {user.honorable_title && (
                                <div className="flex items-center space-x-1 mt-1">
                                  <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                  <span className="text-sm text-purple-600 dark:text-purple-400 font-medium italic">
                                    {user.honorable_title}
                                  </span>
                                </div>
                              )}
                              {user.bio && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                  {user.bio}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setShowUserMenu(showUserMenu === user.id ? null : user.id)}
                            disabled={actionLoading === user.id}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          </button>

                          {showUserMenu === user.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-48">
                              <button
                                onClick={() => handleAssignHonorableTitle(user.id, user.honorable_title)}
                                disabled={actionLoading === user.id}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 first:rounded-t-lg disabled:opacity-50"
                              >
                                <Award className="w-4 h-4" />
                                <span>{user.honorable_title ? 'Edit' : 'Assign'} Honorable Title</span>
                              </button>
                              
                              <button
                                onClick={() => handleBanUser(user.id, user.is_banned)}
                                disabled={actionLoading === user.id}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 last:rounded-b-lg disabled:opacity-50 ${
                                  user.is_banned 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {user.is_banned ? (
                                  <>
                                    <UserCheck className="w-4 h-4" />
                                    <span>Unban User</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-4 h-4" />
                                    <span>Ban User</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Click overlay to close menu */}
                      {showUserMenu === user.id && (
                        <div
                          className="fixed inset-0 z-5"
                          onClick={() => setShowUserMenu(null)}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'No users found matching your search' : 'No users found'}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Info Panel */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">User Management Guidelines</h3>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• <strong>Honorable Title:</strong> Custom titles that appear alongside user roles</li>
                  <li>• <strong>Ban:</strong> Prevents users from accessing the platform</li>
                  <li>• <strong>Badges:</strong> Special privileges system (coming in future updates)</li>
                  {currentUserProfile?.is_owner ? (
                    <li>• <strong>Owner Privilege:</strong> You can manage all users including admins</li>
                  ) : (
                    <li>• <strong>Admin Privilege:</strong> You can manage regular users (not other admins/owners)</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}