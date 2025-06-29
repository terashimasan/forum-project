import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Crown, Shield, LogOut, Home, Settings, Handshake, Users, Bell, MessageSquare, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  user?: any;
  profile?: any;
  onAuthClick: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
}

export default function Layout({ 
  children, 
  user, 
  profile, 
  onAuthClick, 
  onProfileClick,
  onSettingsClick,
  onLogout
}: LayoutProps) {
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const isAdminPage = location.pathname === '/admin';
  const isOwnerPage = location.pathname === '/owner';
  const isDealsPage = location.pathname === '/deals';
  const isAgentPage = location.pathname === '/agents';
  const [siteSettings, setSiteSettings] = useState({
    site_title: 'Elite Forum',
    site_logo_url: ''
  });

  useEffect(() => {
    fetchSiteSettings();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const fetchSiteSettings = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .single();
      
      if (data) {
        setSiteSettings({
          site_title: data.site_title || 'Elite Forum',
          site_logo_url: data.site_logo_url || ''
        });
        
        // Update document title
        document.title = data.site_title || 'Elite Forum';
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    }
  };

  const handleLogoutClick = async () => {
    setShowProfileMenu(false);
    if (onLogout) {
      await onLogout();
    }
  };

  const handleProfileMenuClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleMenuItemClick = (action: () => void) => {
    setShowProfileMenu(false);
    action();
  };

  // Check if user has admin access (either admin or owner)
  const hasAdminAccess = profile?.is_admin || profile?.is_owner;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  {siteSettings.site_logo_url ? (
                    <img
                      src={siteSettings.site_logo_url}
                      alt="Site Logo"
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <Crown className={`w-5 h-5 text-white ${siteSettings.site_logo_url ? 'hidden' : ''}`} />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {siteSettings.site_title}
                </h1>
              </Link>
              
              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-1 ml-8">
                <Link
                  to="/"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                    !isAdminPage && !isOwnerPage && !isDealsPage && !isAgentPage
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Forum</span>
                </Link>

                <Link
                  to="/agents"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                    isAgentPage
                      ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Agents</span>
                </Link>

                {user && (
                  <Link
                    to="/deals"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                      isDealsPage
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Handshake className="w-4 h-4" />
                    <span>Deals</span>
                  </Link>
                )}
                
                {hasAdminAccess && (
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                      isAdminPage
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                )}

                {profile?.is_owner && (
                  <Link
                    to="/owner"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                      isOwnerPage
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    <span>Owner</span>
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {user && profile ? (
                <div className="flex items-center space-x-3">
                  {/* Mobile Navigation Links */}
                  <Link
                    to="/agents"
                    className={`md:hidden flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isAgentPage
                        ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                        : 'text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Agents</span>
                  </Link>

                  <Link
                    to="/deals"
                    className={`md:hidden flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isDealsPage
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    <Handshake className="w-4 h-4" />
                    <span>Deals</span>
                  </Link>

                  {hasAdminAccess && (
                    <Link
                      to="/admin"
                      className={`md:hidden flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isAdminPage
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin</span>
                    </Link>
                  )}

                  {profile.is_owner && (
                    <Link
                      to="/owner"
                      className={`md:hidden flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isOwnerPage
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                      }`}
                    >
                      <Crown className="w-4 h-4" />
                      <span>Owner</span>
                    </Link>
                  )}
                  
                  {/* Google-style Profile Menu */}
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={handleProfileMenuClick}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-colors group"
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center ring-2 ring-transparent group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Profile Dropdown Menu */}
                    {showProfileMenu && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                        {/* Profile Header */}
                        <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-4">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={profile.username}
                                className="w-16 h-16 rounded-full object-cover shadow-lg"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                                <User className="w-8 h-8 text-white" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                  {profile.username}
                                </h3>
                                {profile.is_verified && (
                                  <span className="text-blue-500" title="Verified">✓</span>
                                )}
                                {profile.is_admin && (
                                  <span className="text-red-500" title="Admin">👑</span>
                                )}
                                {profile.is_owner && (
                                  <span className="text-purple-500" title="Owner">💎</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {profile.post_count} posts • {profile.reputation} reputation
                              </p>
                              {profile.bio && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                                  {profile.bio}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          <button
                            onClick={() => handleMenuItemClick(onProfileClick || (() => {}))}
                            className="w-full flex items-center space-x-3 px-6 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">Profile</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">View and edit your profile</div>
                            </div>
                          </button>

                          <button
                            onClick={() => handleMenuItemClick(onSettingsClick || (() => {}))}
                            className="w-full flex items-center space-x-3 px-6 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">Settings</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Preferences and security</div>
                            </div>
                          </button>

                          <button
                            onClick={() => handleMenuItemClick(() => {})}
                            className="w-full flex items-center space-x-3 px-6 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                              <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">Messages</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Private conversations</div>
                            </div>
                          </button>

                          <button
                            onClick={() => handleMenuItemClick(() => {})}
                            className="w-full flex items-center space-x-3 px-6 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                              <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">Notifications</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Alerts and updates</div>
                            </div>
                          </button>

                          {/* Separator */}
                          <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                          <button
                            onClick={handleLogoutClick}
                            className="w-full flex items-center space-x-3 px-6 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                              <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <div className="font-medium text-red-600 dark:text-red-400">Sign out</div>
                              <div className="text-sm text-red-500 dark:text-red-500">Sign out of your account</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  {/* Mobile Agent Link for non-authenticated users */}
                  <Link
                    to="/agents"
                    className={`md:hidden flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isAgentPage
                        ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                        : 'text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Agents</span>
                  </Link>

                  <button
                    onClick={onAuthClick}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}