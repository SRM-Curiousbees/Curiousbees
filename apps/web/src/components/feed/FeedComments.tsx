'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Send, Loader2, MoreHorizontal, Edit2, Trash2, Heart, Reply, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfileImageUrl } from '@/lib/avatar';

interface FeedCommentsProps {
  threadId: string;
}

// ─── RELATIVE TIME FORMATTER ────────────────────────────────────────────────
function formatRelativeTime(dateStr: string | Date): string {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── SINGLE COMMENT ITEM (Recursive for Replies) ───────────────────────────
function CommentItem({
  comment,
  threadId,
  depth = 0,
  currentUserId,
  onReplySubmit,
  onEdit,
  onDelete,
  onLike,
}: {
  comment: any;
  threadId: string;
  depth?: number;
  currentUserId?: string;
  onReplySubmit: (content: string, parentId: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useStore();

  const replies = comment.replies || [];
  const isOwner = currentUserId === comment.authorId;
  const isLiked = comment.likes && comment.likes.length > 0;
  const likeCount = comment._count?.likes || 0;
  const maxDepth = 3;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setIsSubmittingReply(true);
    try {
      await onReplySubmit(replyContent, comment.id);
      setReplyContent('');
      setShowReplyInput(false);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingContent.trim()) return;
    await onEdit(comment.id, editingContent);
    setIsEditing(false);
  };

  useEffect(() => {
    if (showReplyInput && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [showReplyInput]);

  const authorName = comment.author?.name || 'Scholar';
  const avatarUrl = getProfileImageUrl(comment.author);
  const roleLabel = comment.author?.role === 'RESEARCH_SUPERVISOR' ? 'Supervisor' : 'Scholar';
  const roleBadgeStyle = comment.author?.role === 'RESEARCH_SUPERVISOR'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-blue-50 text-brand border-blue-200';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`relative ${depth > 0 ? 'ml-5 pl-4' : ''}`}
    >
      {/* Thread line connector for nested replies */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-slate-200 via-slate-200/60 to-transparent" />
      )}

      <div className="flex items-start gap-2.5 py-2.5 group">
        {/* Avatar */}
        <img
          src={avatarUrl}
          alt={authorName}
          className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
        />

        <div className="flex-1 min-w-0">
          {/* Header: name, role, time */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-2xs font-semibold text-slate-900">{authorName}</span>
            <span className={`inline-flex px-1.5 py-0.5 rounded-full text-2xs font-bold uppercase border leading-none ${roleBadgeStyle}`}>
              {roleLabel}
            </span>
            <span className="text-2xs font-semibold text-slate-400">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>

          {/* Content / Edit Mode */}
          {isEditing ? (
            <div className="mt-1.5 space-y-2">
              <input
                type="text"
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="w-full bg-surface border border-slate-200 text-slate-900 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit()}
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-2xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="text-2xs font-bold text-white bg-brand hover:bg-brand-strong px-3 py-1 rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-slate-700 text-xs leading-relaxed font-medium mt-0.5">
              {comment.content}
            </p>
          )}

          {/* Action bar: Like, Reply, Menu */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-1.5">
              {/* Like */}
              <button
                onClick={() => onLike(comment.id)}
                className={`flex items-center gap-1 text-2xs font-bold transition-colors ${
                  isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                }`}
              >
                <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
                {likeCount > 0 && <span>{likeCount}</span>}
              </button>

              {/* Reply (only if below max nesting depth) */}
              {depth < maxDepth && (
                <button
                  onClick={() => setShowReplyInput(!showReplyInput)}
                  className="flex items-center gap-1 text-2xs font-bold text-slate-400 hover:text-brand transition-colors"
                >
                  <Reply className="w-3 h-3" />
                  <span>Reply</span>
                </button>
              )}

              {/* Edit / Delete (Inline for owner) */}
              {isOwner && (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditingContent(comment.content);
                    }}
                    className="flex items-center gap-1 text-2xs font-bold text-slate-400 hover:text-slate-600 transition-colors ml-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="flex items-center gap-1 text-2xs font-bold text-slate-400 hover:text-red-500 transition-colors ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Nested Reply Input */}
          <AnimatePresence>
            {showReplyInput && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleReplySubmit}
                className="mt-2 flex items-center gap-2 overflow-hidden"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                  <img
                    src={getProfileImageUrl(currentUser)}
                    alt="You"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 relative">
                  <input
                    ref={replyInputRef}
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`Reply to ${authorName}...`}
                    className="w-full pl-3 pr-9 py-1.5 rounded-full border border-slate-200 focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none text-2xs font-medium transition-all bg-slate-50/80 text-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingReply || !replyContent.trim()}
                    className="absolute right-1 top-1 bottom-1 p-1 rounded-full bg-brand hover:bg-brand-strong disabled:opacity-40 text-white transition-all cursor-pointer"
                  >
                    {isSubmittingReply ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Nested Replies */}
          {replies.length > 0 && (
            <div className="mt-1">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-2xs font-bold text-brand hover:text-brand-950 transition-colors mb-1"
              >
                {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
              </button>

              <AnimatePresence>
                {showReplies && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    {replies.map((reply: any) => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        threadId={threadId}
                        depth={depth + 1}
                        currentUserId={currentUserId}
                        onReplySubmit={onReplySubmit}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onLike={onLike}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── MAIN FEED COMMENTS COMPONENT ───────────────────────────────────────────
export default function FeedComments({ threadId }: FeedCommentsProps) {
  const { threads, addComment, updateComment, deleteComment, toggleCommentLike, currentUser } = useStore();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const thread = threads.find((t) => t.id === threadId);
  const allComments = thread?.comments || [];

  // Build tree: top-level comments (no parentId) with nested replies
  const topLevelComments = allComments.filter((c: any) => !c.parentId);

  // Group replies by parentId and attach to their parents
  const buildTree = (comments: any[]): any[] => {
    const byParent: Record<string, any[]> = {};
    comments.forEach((c: any) => {
      if (c.parentId) {
        if (!byParent[c.parentId]) byParent[c.parentId] = [];
        byParent[c.parentId].push(c);
      }
    });

    const attachReplies = (comment: any): any => ({
      ...comment,
      replies: (byParent[comment.id] || comment.replies || []).map(attachReplies),
    });

    return topLevelComments.map(attachReplies);
  };

  const commentTree = buildTree(allComments);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment(threadId, content);
      setContent('');
    } catch (e: any) {
      console.error('Error adding comment:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (replyContent: string, parentId: string) => {
    await addComment(threadId, replyContent, parentId);
  };

  const handleEdit = async (commentId: string, newContent: string) => {
    try {
      await updateComment(commentId, newContent);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await deleteComment(commentId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      await toggleCommentLike(commentId);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2"
    >
      {/* Comments List */}
      <div className="max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
        {commentTree.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
              <MessageSquare className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-xs font-bold text-slate-400">
              Be the first to comment
            </p>
            <p className="text-2xs font-medium text-slate-300 mt-0.5">
              Share your thoughts on this research
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/60">
            {commentTree.map((comment: any) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                threadId={threadId}
                currentUserId={currentUser?.id}
                onReplySubmit={handleReplySubmit}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onLike={handleLike}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comment Input */}
      <form onSubmit={handleCommentSubmit} className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-sm flex items-center justify-center">
          <img
            src={getProfileImageUrl(currentUser)}
            className="w-full h-full object-cover"
            alt={currentUser?.name || 'User'}
          />
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment..."
            className="w-full pl-3 pr-10 py-1.5 rounded-full border border-slate-200 focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none text-xs font-semibold transition-all bg-slate-50 text-slate-900 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="absolute right-1 top-1 bottom-1 p-1.5 rounded-full bg-brand hover:bg-brand-strong disabled:opacity-40 text-white transition-all shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
