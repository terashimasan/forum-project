import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, Filter, Grid, List } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CreateThread from '../components/CreateThread';
import ThreadCard from '../components/ThreadCard';
import CategorySelector from '../components/CategorySelector';

interface ForumPageProps {
  user?: any;
  profile?: any;
  onAuthClick: () => void;
}

export default function ForumPage({ user, profile, onAuthClick }: ForumPageProps) {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showCreateThread, setShowCreateThread] = useState(false);

  useEffect(() => {
    fetchThreads();
    fetchCategories();
  }, []);

  const fetchThreads = async () => {
    const { data } = await supabase
      .from('threads')
      .select(`
        *,
        profiles(*),
        categories(*)
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (data) {
      setThreads(data);
      
      // Fetch post counts for each thread
      const counts: Record<string, number> = {};
      for (const thread of data) {
        const { count } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', thread.id);
        counts[thread.id] = count || 0;
      }
      setPostCounts(counts);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const filteredThreads = threads.filter(thread => {
    const matchesSearch = thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         thread.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || thread.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Community Forum</h1>
          <p className="text-gray-600 dark:text-gray-400">Join the discussion and share your thoughts</p>
        </div>
        
        {user ? (
          <button
            onClick={() => setShowCreateThread(true)}
            className="mt-4 lg:mt-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>New Thread</span>
          </button>
        ) : (
          <button
            onClick={onAuthClick}
            className="mt-4 lg:mt-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Sign In to Post</span>
          </button>
        )}
      </div>

      {/* Category Selection */}
      <CategorySelector
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        threads={threads}
      />

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search threads..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-12 pr-8 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-w-48"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Category Banner */}
      {selectedCategoryData && (
        <div className="mb-6 p-4 rounded-lg border-2 border-dashed" style={{ borderColor: selectedCategoryData.color }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: selectedCategoryData.color }}
              ></div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{selectedCategoryData.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedCategoryData.description}</p>
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredThreads.length} thread{filteredThreads.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Threads */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-4'}>
        {filteredThreads.length > 0 ? (
          filteredThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              postCount={postCounts[thread.id] || 0}
              onClick={() => navigate(`/thread/${thread.id}`)}
              viewMode={viewMode}
              currentUser={profile}
              onThreadUpdated={fetchThreads}
            />
          ))
        ) : (
          <div className="text-center py-12 col-span-full">
            <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">No threads found</div>
            <div className="text-gray-500 dark:text-gray-400">
              {selectedCategory ? 'No threads in this category' : 'Try adjusting your search or filters'}
            </div>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory('')}
                className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                View all categories
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Thread Modal */}
      <CreateThread
        isOpen={showCreateThread}
        onClose={() => setShowCreateThread(false)}
        onThreadCreated={() => {
          fetchThreads();
          setShowCreateThread(false);
        }}
      />
    </div>
  );
}