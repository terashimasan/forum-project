import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Eye, Clock, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ForumPost from '../components/ForumPost';

interface ThreadPageProps {
  user?: any;
}

export default function ThreadPage({ user }: ThreadPageProps) {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (threadId) {
      fetchThread();
      fetchPosts();
      fetchCurrentUser();
      incrementViews();
    }
  }, [threadId]);

  const fetchCurrentUser = async () => {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const fetchThread = async () => {
    if (!threadId) return;
    
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
    if (!threadId) return;
    
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
    if (!threadId) return;
    
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
    if (!postContent.trim() || !user || !threadId) return;

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

  const handleLike = (postId: string) => {
    // TODO: Implement like functionality
    console.log('Like post:', postId);
  };

  const handleQuote = (postId: string) => {
    // TODO: Implement quote functionality
    console.log('Quote post:', postId);
  };

  const handleReply = () => {
    // Scroll to reply form
    const replyForm = document.getElementById('reply-form');
    if (replyForm) {
      replyForm.scrollIntoView({ behavior: 'smooth' });
      const textarea = replyForm.querySelector('textarea');
      if (textarea) textarea.focus();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Thread not found</h1>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            Return to Forum
          </button>
        </div>
      </div>
    );
  }

  // Create a post object for the original thread
  const originalPost = {
    id: thread.id,
    content: thread.content,
    created_at: thread.created_at,
    is_edited: thread.is_edited,
    edited_at: thread.edited_at,
    edit_count: thread.edit_count,
    profiles: thread.profiles
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Forum</span>
        </button>
      </div>

      {/* Thread Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 p-6">
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
          {thread.is_edited && (
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">
              Edited
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{thread.title}</h1>
        
        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <MessageCircle className="w-4 h-4" />
            <span>{posts.length} replies</span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>{thread.views} views</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>Started {new Date(thread.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {thread.is_edited && thread.edited_at && (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-sm text-orange-700 dark:text-orange-400">
              Thread last edited {new Date(thread.edited_at).toLocaleString()}
              {thread.edit_count && thread.edit_count > 1 && ` (${thread.edit_count} times)`}
            </p>
          </div>
        )}
      </div>

      {/* Original Post */}
      <div className="mb-6">
        <ForumPost
          post={originalPost}
          isOriginalPost={true}
          currentUser={currentUser}
          onLike={() => handleLike(originalPost.id)}
          onQuote={() => handleQuote(originalPost.id)}
          onReply={handleReply}
          onPostUpdated={() => {
            fetchThread();
            fetchPosts();
          }}
        />
      </div>

      {/* Replies */}
      <div className="space-y-6 mb-8">
        {posts.map((post, index) => (
          <ForumPost
            key={post.id}
            post={post}
            postNumber={index + 2}
            currentUser={currentUser}
            onLike={() => handleLike(post.id)}
            onQuote={() => handleQuote(post.id)}
            onReply={handleReply}
            onPostUpdated={fetchPosts}
          />
        ))}
      </div>

      {/* Reply Form */}
      {user && !thread.is_locked && (
        <div id="reply-form" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Post a Reply</h3>
            <form onSubmit={handleSubmitPost}>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Write your reply..."
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

      {/* Locked Thread Message */}
      {thread.is_locked && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
          <p className="text-yellow-800 dark:text-yellow-400 font-medium">This thread has been locked by an administrator.</p>
        </div>
      )}

      {/* Sign In Prompt */}
      {!user && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Join the Discussion</h3>
          <p className="text-blue-700 dark:text-blue-400 mb-4">Sign in to post replies and interact with the community.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      )}
    </div>
  );
}