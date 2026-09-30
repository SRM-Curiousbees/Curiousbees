'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Send, Loader2, MoreHorizontal, Edit2, Trash2, Heart, Reply, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getProfileImageUrl, handleAvatarError } from '@/lib/avatar';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  const roleLabel = comment.author?.role === 'RESEARCH_SUPERVISOR' ? 'Supervisor' : comment.author?.role === 'RESEARCH_SCHOLAR' ? 'Scholar' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`relative ${depth > 0 ? 'ml-5 pl-4' : ''}`}
    >
      {/* Thread line connector for nested replies */}
      {depth > 0 && (
        <div className="absolute bottom-0 left-0 top-0 w-px bg-line" aria-hidden />
      )}

      <div className="flex items-start gap-2.5 py-2.5 group">
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={(e) => handleAvatarError(e, authorName)}
          className="mt-0.5 size-8 shrink-0 rounded-full border border-line object-cover"
        />

        <div className="flex-1 min-w-0">
          {/* Header: name, role, time */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-ink">{authorName}</span>
            {roleLabel && <span className="text-xs text-ink-muted">{roleLabel}</span>}
            <span className="text-xs text-ink-muted" aria-hidden>
              ·
            </span>
            <time dateTime={new Date(comment.createdAt || Date.now()).toISOString()} className="text-xs text-ink-muted">
              {formatRelativeTime(comment.createdAt)}
            </time>
          </div>

          {/* Content / Edit Mode */}
          {isEditing ? (
            <div className="mt-1.5 space-y-2">
              <input
                type="text"
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                aria-label="Edit comment"
                className="cb-input"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit()}
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="h-8 rounded-lg px-3 text-sm text-ink-secondary transition-colors hover:bg-neutral-100 hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditSubmit}
                  className="h-8 rounded-lg bg-brand px-3 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-secondary">{comment.content}</p>
          )}

          {/* Action bar: Like, Reply, Menu */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-1.5">
              {/* Like */}
              <button
                type="button"
                onClick={() => onLike(comment.id)}
                aria-pressed={!!isLiked}
                aria-label={isLiked ? 'Unlike comment' : 'Like comment'}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  isLiked ? 'text-danger-600' : 'text-ink-muted hover:text-danger-600'
                }`}
              >
                <Heart className={`size-3.5 ${isLiked ? 'fill-current' : ''}`} aria-hidden />
                {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
              </button>

              {/* Reply (only if below max nesting depth) */}
              {depth < maxDepth && (
                <button
                  type="button"
                  onClick={() => setShowReplyInput(!showReplyInput)}
                  aria-expanded={showReplyInput}
                  className="flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink"
                >
                  <Reply className="size-3.5" aria-hidden />
                  <span>Reply</span>
                </button>
              )}

              {/* Edit / Delete (Inline for owner) */}
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setEditingContent(comment.content);
                    }}
                    className="flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    <Edit2 className="size-3.5" aria-hidden />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    className="flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-danger-700"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
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
                <img
                  src={getProfileImageUrl(currentUser)}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(e) => handleAvatarError(e, currentUser?.name)}
                  className="size-6 shrink-0 rounded-full object-cover"
                />
                <div className="flex-1 relative">
                  <input
                    ref={replyInputRef}
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`Reply to ${authorName}…`}
                    aria-label={`Reply to ${authorName}`}
                    className="h-9 w-full rounded-full border border-line bg-surface-muted pl-3.5 pr-10 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingReply || !replyContent.trim()}
                    aria-label="Send reply"
                    className="absolute bottom-1 right-1 top-1 flex aspect-square items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-strong disabled:opacity-40"
                  >
                    {isSubmittingReply ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Send className="size-3.5" aria-hidden />}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Nested Replies */}
          {replies.length > 0 && (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setShowReplies(!showReplies)}
                aria-expanded={showReplies}
                className="mb-1 flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand-strong"
              >
                {showReplies ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
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
  const { threads, addComment, updateComment, deleteComment, toggleCommentLike, currentUser, addToast } = useStore();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // The feed embeds only the latest few comments; link to the post for the rest.
  const countAll = (list: any[] = []): number => list.reduce((n, c) => n + 1 + countAll(c.replies), 0);
  const totalComments: number = (thread as any)?._count?.comments ?? 0;
  const pathname = usePathname();
  const onPostPage = pathname === `/feed/${threadId}`;
  const hiddenCount = onPostPage ? 0 : Math.max(0, totalComments - countAll(commentTree));

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment(threadId, content);
      setContent('');
    } catch (e: any) {
      addToast(e?.message || 'The comment could not be posted.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (replyContent: string, parentId: string) => {
    try {
      await addComment(threadId, replyContent, parentId);
    } catch (e: any) {
      addToast(e?.message || 'The reply could not be posted.', 'error');
      throw e;
    }
  };

  const handleEdit = async (commentId: string, newContent: string) => {
    try {
      await updateComment(commentId, newContent);
    } catch (e: any) {
      addToast(e?.message || 'The comment could not be updated.', 'error');
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteComment(deletingId);
      setDeletingId(null);
    } catch (e: any) {
      addToast(e?.message || 'The comment could not be deleted.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      await toggleCommentLike(commentId);
    } catch (e: any) {
      addToast(e?.message || 'The like could not be saved.', 'error');
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
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl border border-line bg-surface-muted text-ink-muted">
              <MessageSquare className="size-5" aria-hidden />
            </div>
            <p className="text-sm font-medium text-ink">No comments yet</p>
            <p className="mt-0.5 text-sm text-ink-muted">Share your thoughts on this research.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
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

      {hiddenCount > 0 && (
        <Link href={`/feed/${threadId}`} className="mt-2 inline-block text-sm font-medium text-brand underline-offset-2 hover:underline">
          View all {totalComments} comments
        </Link>
      )}

      {/* Comment Input */}
      <form onSubmit={handleCommentSubmit} className="mt-3 flex gap-2 border-t border-line pt-3">
        <img
          src={getProfileImageUrl(currentUser)}
          alt=""
          referrerPolicy="no-referrer"
          onError={(e) => handleAvatarError(e, currentUser?.name)}
          className="size-8 shrink-0 rounded-full border border-line object-cover"
        />
        <div className="flex-1 relative">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment…"
            aria-label="Write a comment"
            className="h-9 w-full rounded-full border border-line bg-surface-muted pl-3.5 pr-10 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            aria-label="Post comment"
            className="absolute bottom-1 right-1 top-1 flex aspect-square items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-strong disabled:opacity-40"
          >
            {isSubmitting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Send className="size-3.5" aria-hidden />}
          </button>
        </div>
      </form>

      <Dialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        dismissible={!isDeleting}
        size="sm"
        title="Delete this comment?"
        description="Replies to it are deleted too. This can't be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={isDeleting}>
              Delete comment
            </Button>
          </>
        }
      />
    </motion.div>
  );
}
