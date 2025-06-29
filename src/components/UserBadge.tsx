import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, Crown } from 'lucide-react';
import { getUserLevel } from '../lib/userLevels';

interface UserBadgeProps {
  profile: {
    id: string;
    username: string;
    post_count: number;
    reputation: number;
    is_verified: boolean;
    is_admin: boolean;
    is_owner?: boolean;
    avatar_url?: string | null;
    honorable_title?: string | null;
  };
  showLevel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
}

export default function UserBadge({ profile, showLevel = true, size = 'md', clickable = true }: UserBadgeProps) {
  const navigate = useNavigate();
  const level = getUserLevel(profile.post_count, profile.reputation);
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const handleClick = () => {
    if (clickable) {
      navigate(`/user/${profile.id}`);
    }
  };

  return (
    <div 
      className={`flex items-center space-x-2 ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={handleClick}
    >
      <div className="relative">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username}
            className={`${sizeClasses[size]} rounded-full object-cover ${level.specialEffect ? 'ring-2 ring-offset-2 ring-opacity-60 animate-pulse' : ''}`}
            style={level.specialEffect ? { ringColor: level.glowColor.replace('shadow-', '').replace('/60', '') } : {}}
          />
        ) : (
          <div className={`${sizeClasses[size]} bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center ${level.specialEffect ? 'animate-pulse shadow-lg' : ''}`}>
            <span className="text-white font-medium">
              {profile.username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="absolute -bottom-1 -right-1 flex space-x-1">
          {profile.is_verified && (
            <CheckCircle className="w-4 h-4 text-blue-500 bg-white dark:bg-gray-800 rounded-full" />
          )}
          
          {profile.is_admin && (
            <Shield className="w-4 h-4 text-red-500 bg-white dark:bg-gray-800 rounded-full" />
          )}

          {profile.is_owner && (
            <Crown className="w-4 h-4 text-purple-500 bg-white dark:bg-gray-800 rounded-full" />
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center space-x-1">
          <span className={`font-medium text-gray-900 dark:text-white ${textSizeClasses[size]} ${clickable ? 'hover:text-blue-600 dark:hover:text-blue-400' : ''}`}>
            {profile.username}
          </span>
          {level.badge && (
            <span className="text-xs">{level.badge}</span>
          )}
        </div>
        
        {profile.honorable_title && (
          <div className={`font-medium text-purple-600 dark:text-purple-400 ${textSizeClasses[size]} italic`}>
            {profile.honorable_title}
          </div>
        )}
        
        {showLevel && (
          <div className="flex items-center space-x-2">
            <span className={`font-medium ${level.color} ${textSizeClasses[size]} ${level.specialEffect ? 'animate-pulse' : ''}`}>
              {level.title}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Rep: {profile.reputation}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}