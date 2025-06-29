import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Eye, Clock, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import UserBadge from './UserBadge';

interface ThreadViewProps {
  threadId: string;
  onBack: () => void;
  user?: any;
}

export default function ThreadView({ threadId, onBack, user }: ThreadViewProps) {
  const navigate = useNavigate();
  const [thread, setThread] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchThread();
    fetchPosts();
    incrementViews();
  }, [threadId]);

  const fetchThread = async () => {
    const { data } = await supabase
      .from('threads')
      .select(`
        *,
        profiles(*),
        categories(*)
      `)
      .eq('id', threadId)
      .single();
    
    if (data) setThread(data);
  };

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(*)
      `)
      .eq('thread_id', threadId)
      .order('created_at');
    
    if (data) setPosts(data);
    setLoading(false);
  };

  const incrementViews = async () => {
    await supabase
      .from('threads')
      .update({ views: thread?.views + 1 || 1 })
      .eq('id', threadId);
  };

  const ensureProfileExists = async (userId: string) => {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      const { data: { user } } = await supabase.auth.getUser();
      const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';

      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: username,
        });

      if (error) {
        throw new Error(`Failed to create profile: ${error.message}`);
      }
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() || !user) return;

    setSubmitting(true);
    try {
      await ensureProfileExists(user.id);

      const { error } = await supabase.from('posts').insert({
        content: postContent,
        thread_id: threadId,
        author_id: user.id,
      });

      if (error) throw error;

      setPostContent('');
      fetchPosts();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!thread) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Forum</span>
        </button>
      </div>

      {/* Thread Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <span
              className="px-3 py-1 text-sm font-medium rounded-full"
              style={{
                backgroundColor: thread.categories.color + '20',
                color: thread.categories.color,
              }}
            >
              {thread.categories.name}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{thread.title}</h1>
          
          <div className="flex items-center justify-between mb-6">
            <UserBadge profile={thread.profiles} clickable={true} />
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-4 h-4" />
                <span>{posts.length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{thread.views}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(thread.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{thread.content}</p>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4 mb-8">
        {posts.map((post) => (
          <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <UserBadge profile={post.profiles} clickable={true} />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="prose max-w-none">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{post.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Form */}
      {user && !thread.is_locked && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reply to Thread</h3>
            <form onSubmit={handleSubmitPost}>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Share your thoughts..."
                required
              />
              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Posting...' : 'Post Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}