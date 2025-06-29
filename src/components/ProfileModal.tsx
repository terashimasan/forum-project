import React, { useState, useEffect } from 'react';
import { X, Camera, Save, Award, TrendingUp, Upload, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserLevel, getNextLevel } from '../lib/userLevels';
import UserBadge from './UserBadge';
import VerificationModal from './VerificationModal';
import AdminRequestModal from './AdminRequestModal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onProfileUpdate: () => void;
  isOwnProfile?: boolean;
}

export default function ProfileModal({ isOpen, onClose, profile, onProfileUpdate, isOwnProfile = true }: ProfileModalProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showAdminRequestModal, setShowAdminRequestModal] = useState(false);
  const [hasVerificationRequest, setHasVerificationRequest] = useState(false);
  const [hasAdminRequest, setHasAdminRequest] = useState(false);
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || '',
  });

  useEffect(() => {
    if (isOpen && profile && isOwnProfile) {
      // Only check for verification/admin requests if user is not already admin/owner and it's their own profile
      if (!profile.is_verified && !profile.is_admin && !profile.is_owner) {
        checkVerificationRequest();
      }
      if (profile.is_verified && !profile.is_admin && !profile.is_owner) {
        checkAdminRequest();
      }
    }
  }, [isOpen, profile, isOwnProfile]);

  const checkVerificationRequest = async () => {
    if (!profile) return;
    
    const { data } = await supabase
      .from('verification_requests')
      .select('id')
      .eq('user_id', profile.id)
      .eq('status', 'pending')
      .maybeSingle();
    
    setHasVerificationRequest(!!data);
  };

  const checkAdminRequest = async () => {
    if (!profile) return;
    
    const { data } = await supabase
      .from('admin_requests')
      .select('id')
      .eq('user_id', profile.id)
      .eq('status', 'pending')
      .maybeSingle();
    
    setHasAdminRequest(!!data);
  };

  if (!isOpen || !profile) return null;

  const currentLevel = getUserLevel(profile.post_count, profile.reputation);
  const nextLevel = getNextLevel(profile.post_count, profile.reputation);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          bio: formData.bio,
          avatar_url: formData.avatar_url || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setEditing(false);
      onProfileUpdate();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const progressToNext = nextLevel ? 
    Math.min(100, ((profile.post_count - currentLevel.minPosts) / (nextLevel.minPosts - currentLevel.minPosts)) * 100) : 
    100;

  // Check if user should see verification button
  // Only show if: own profile, not verified, not admin, not owner, no pending request
  const shouldShowVerificationButton = isOwnProfile && 
    !profile.is_verified && 
    !profile.is_admin && 
    !profile.is_owner && 
    !hasVerificationRequest;
  
  // Check if user should see admin request button
  // Only show if: own profile, verified, not admin, not owner, no pending request
  const shouldShowAdminRequestButton = isOwnProfile && 
    profile.is_verified && 
    !profile.is_admin && 
    !profile.is_owner && 
    !hasAdminRequest;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className={`absolute top-0 left-0 right-0 h-1 ${currentLevel.specialEffect ? 'bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 animate-pulse' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`}></div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isOwnProfile ? 'User Profile' : `${profile.username}'s Profile`}
              </h2>
              <div className="flex items-center space-x-2">
                {/* Verification Button - Only show for non-verified, non-admin, non-owner users without pending requests */}
                {shouldShowVerificationButton && (
                  <button
                    onClick={() => setShowVerificationModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Request Verification</span>
                  </button>
                )}
                
                {/* Admin Request Button - Only show for verified, non-admin, non-owner users without pending requests */}
                {shouldShowAdminRequestButton && (
                  <button
                    onClick={() => setShowAdminRequestModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin Request</span>
                  </button>
                )}
                
                {/* Pending Status Indicators */}
                {hasVerificationRequest && (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded-lg text-sm font-medium">
                    <Upload className="w-4 h-4" />
                    <span>Verification Pending</span>
                  </div>
                )}

                {hasAdminRequest && (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 rounded-lg text-sm font-medium">
                    <Shield className="w-4 h-4" />
                    <span>Admin Request Pending</span>
                  </div>
                )}
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  {formData.avatar_url ? (
                    <img
                      src={formData.avatar_url}
                      alt={formData.username}
                      className={`w-20 h-20 rounded-full object-cover ${currentLevel.specialEffect ? 'ring-4 ring-offset-4 ring-opacity-60 animate-pulse shadow-2xl' : 'shadow-lg'}`}
                      style={currentLevel.specialEffect ? { 
                        ringColor: currentLevel.glowColor.replace('shadow-', '').replace('/60', ''),
                        boxShadow: `0 0 30px ${currentLevel.glowColor.replace('shadow-', '').replace('/60', '')}` 
                      } : {}}
                    />
                  ) : (
                    <div className={`w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold text-white ${currentLevel.specialEffect ? 'animate-pulse shadow-2xl' : 'shadow-lg'}`}>
                      {formData.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  {editing && isOwnProfile && (
                    <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex-1">
                  {editing && isOwnProfile ? (
                    <input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-600 focus:outline-none bg-white dark:bg-gray-900"
                    />
                  ) : (
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.username}</h3>
                  )}
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`text-lg font-semibold ${currentLevel.color} ${currentLevel.specialEffect ? 'animate-pulse' : ''}`}>
                      {currentLevel.title}
                    </span>
                    {currentLevel.badge && (
                      <span className="text-lg">{currentLevel.badge}</span>
                    )}
                    {profile.is_verified && (
                      <span className="text-blue-500">✓</span>
                    )}
                    {profile.is_admin && (
                      <span className="text-red-500">👑</span>
                    )}
                    {profile.is_owner && (
                      <span className="text-purple-500">💎</span>
                    )}
                  </div>

                  {/* Honorable Title Display */}
                  {profile.honorable_title && (
                    <div className="mt-2 flex items-center space-x-2">
                      <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-purple-600 dark:text-purple-400 font-medium italic">
                        {profile.honorable_title}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{profile.post_count}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Posts</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{profile.reputation}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Reputation</div>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Days Active</div>
                </div>
              </div>

              {/* Level Progress */}
              {nextLevel && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress to {nextLevel.title}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(progressToNext)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressToNext}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {nextLevel.minPosts - profile.post_count} posts and {nextLevel.minReputation - profile.reputation} reputation needed
                  </div>
                </div>
              )}

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
                {editing && isOwnProfile ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    {profile.bio || 'No bio available'}
                  </p>
                )}
              </div>

              {editing && isOwnProfile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avatar URL</label>
                  <input
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              )}

              {/* Actions */}
              {isOwnProfile && (
                <div className="flex justify-end space-x-3">
                  {editing ? (
                    <>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSubmitted={() => {
          setHasVerificationRequest(true);
          setShowVerificationModal(false);
        }}
      />

      {/* Admin Request Modal */}
      <AdminRequestModal
        isOpen={showAdminRequestModal}
        onClose={() => setShowAdminRequestModal(false)}
        onSubmitted={() => {
          setHasAdminRequest(true);
          setShowAdminRequestModal(false);
        }}
      />
    </>
  );
}