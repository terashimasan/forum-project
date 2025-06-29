import React, { useState, useEffect } from 'react';
import { Shield, Users, Hash, MessageSquare, BarChart3, TrendingUp, Eye, Calendar, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminPanel from '../components/AdminPanel';
import UserBadge from '../components/UserBadge';

export default function AdminPage() {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalThreads: 0,
    totalPosts: 0,
    totalCategories: 0,
    verificationRequests: 0,
    todayPosts: 0,
    weeklyGrowth: 0
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [recentThreads, setRecentThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentUsers();
    fetchTopUsers();
    fetchRecentThreads();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total counts
      const [usersResult, threadsResult, postsResult, categoriesResult, verificationResult] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('threads').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      // Get today's posts
      const today = new Date().toISOString().split('T')[0];
      const { count: todayPostsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Get last week's user count for growth calculation
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const { count: lastWeekUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', lastWeek.toISOString());

      const currentUsers = usersResult.count || 0;
      const weeklyGrowth = lastWeekUsers ? Math.round(((currentUsers - lastWeekUsers) / lastWeekUsers) * 100) : 0;

      setStats({
        totalUsers: currentUsers,
        totalThreads: threadsResult.count || 0,
        totalPosts: postsResult.count || 0,
        totalCategories: categoriesResult.count || 0,
        verificationRequests: verificationResult.count || 0,
        todayPosts: todayPostsCount || 0,
        weeklyGrowth
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setRecentUsers(data);
  };

  const fetchTopUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('reputation', { ascending: false })
      .limit(5);
    
    if (data) setTopUsers(data);
  };

  const fetchRecentThreads = async () => {
    const { data } = await supabase
      .from('threads')
      .select(`
        *,
        profiles(*),
        categories(*)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setRecentThreads(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Monitor and manage your forum community</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAdminPanel(true)}
            className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:from-red-700 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
          >
            <Shield className="w-5 h-5" />
            <span>Admin Panel</span>
          </button>
        </div>
        
        <div className="h-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-full mt-4"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers.toLocaleString()}</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                +{stats.weeklyGrowth}% this week
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Threads</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalThreads.toLocaleString()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {stats.totalCategories} categories
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Posts</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalPosts.toLocaleString()}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                {stats.todayPosts} today
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Verifications</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.verificationRequests}</p>
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                Requires attention
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Users</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <UserBadge profile={user} size="sm" />
                  <div className="text-right">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {user.post_count} posts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Users by Reputation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Contributors</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topUsers.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <UserBadge profile={user} size="sm" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.reputation} rep
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user.post_count} posts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Threads */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Threads</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentThreads.map((thread) => (
                <div key={thread.id} className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span
                        className="px-2 py-1 text-xs font-medium rounded-full"
                        style={{
                          backgroundColor: thread.categories.color + '20',
                          color: thread.categories.color,
                        }}
                      >
                        {thread.categories.name}
                      </span>
                      {thread.is_pinned && (
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-2 py-1 rounded-full">
                          Pinned
                        </span>
                      )}
                      {thread.is_locked && (
                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 px-2 py-1 rounded-full">
                          Locked
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">
                      {thread.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {thread.content}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>By {thread.profiles.username}</span>
                      <div className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{thread.views} views</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />
    </div>
  );
}