import React, { useState } from 'react';
import { MessageCircle, Eye, Clock, Pin, Lock, Edit, Trash2, MoreVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import UserBadge from './UserBadge';
import EditThreadModal from './EditThreadModal';

interface ThreadCardProps {
  thread: {
    id: string;
    title: string;
    content: string;
    author_id: string;
    is_pinned: boolean;
    is_locked: boolean;
    views: number;
    created_at: string;
    is_edited?: boolean;
    edited_at?: string;
    edit_count?: number;
    profiles: any;
    categories: any;
  };
  postCount: number;
  onClick: () => void;
  viewMode?: 'list' | 'grid';
  currentUser?: any;
  onThreadUpdated?: () => void;
}

export default function ThreadCard({ 
  thread, 
  postCount, 
  onClick, 
  viewMode = 'list', 
  currentUser,
  onThreadUpdated 
}: ThreadCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const timeAgo = new Date(thread.created_at).toLocaleDateString();
  
  // Only authors can edit, admins/owners can only delete
  const canEdit = currentUser && currentUser.id === thread.author_id;
  const canDelete = currentUser && (currentUser.id === thread.author_id || currentUser.is_admin || currentUser.is_owner);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditModal(true);
    setShowMenu(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this thread? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', thread.id);

      if (error) throw error;

      if (onThreadUpdated) onThreadUpdated();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setDeleting(false);
      setShowMenu(false);
    }
  };

  const handleCardClick = () => {
    if (!showMenu) {
      onClick();
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 relative ${
          thread.is_pinned ? 'ring-2 ring-yellow-200 dark:ring-yellow-800 bg-yellow-50 dark:bg-yellow-900/10' : ''
        } ${viewMode === 'grid' ? 'h-full' : ''}`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                {thread.is_pinned && (
                  <Pin className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                )}
                {thread.is_locked && (
                  <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <span
                  className="px-2 py-1 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: thread.categories.color + '20',
                    color: thread.categories.color,
                  }}
                >
                  {thread.categories.name}
                </span>
                {thread.is_edited && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">
                    Edited
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2">
                {thread.title}
              </h3>
              
              <p className={`text-gray-600 dark:text-gray-400 mb-4 ${viewMode === 'grid' ? 'line-clamp-3' : 'line-clamp-2'}`}>
                {thread.content}
              </p>
            </div>

            {(canEdit || canDelete) && (
              <div className="relative ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-32">
                    {canEdit && (
                      <button
                        onClick={handleEdit}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 first:rounded-t-lg"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 last:rounded-b-lg disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{deleting ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto">
            <UserBadge profile={thread.profiles} size="sm" showLevel={false} />
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-4 h-4" />
                <span>{postCount}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{thread.views}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{timeAgo}</span>
              </div>
            </div>
          </div>

          {thread.is_edited && thread.edited_at && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Last edited {new Date(thread.edited_at).toLocaleString()}
                {thread.edit_count && thread.edit_count > 1 && ` (${thread.edit_count} times)`}
              </p>
            </div>
          )}
        </div>

        {/* Click overlay to close menu when clicking outside */}
        {showMenu && (
          <div
            className="fixed inset-0 z-5"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
            }}
          />
        )}
      </div>

      <EditThreadModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        thread={thread}
        onThreadUpdated={() => {
          if (onThreadUpdated) onThreadUpdated();
          setShowEditModal(false);
        }}
      />
    </>
  );
}