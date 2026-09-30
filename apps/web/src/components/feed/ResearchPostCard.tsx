'use client';

import React, { useState } from 'react';
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  FileText,
  BookOpen,
  ExternalLink,
  UserPlus,
  Users,
  Trash2,
  Flag,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import FeedComments from './FeedComments';
import { getProfileImageUrl, handleAvatarError } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { ROLE_LABEL } from '@/lib/navigation';
import { Badge, type Tone } from '@/components/ui/badge';
import { CollabRequestDialog } from '@/components/collaboration/CollabRequestDialog';

interface ResearchPostCardProps {
  post: any;
  onAuthorClick?: (author: any) => void;
  onShareClick?: (post: any) => void;
  onReportClick?: (post: any) => void;
  onDeleteClick?: (post: any) => void;
  onEditClick?: (post: any) => void;
  isFeedView?: boolean;
  /** Open the comments on first render (the single-post page). */
  defaultShowComments?: boolean;
}

export default function ResearchPostCard({
  post,
  onAuthorClick,
  onShareClick,
  onReportClick,
  onDeleteClick,
  onEditClick,
  isFeedView = true,
  defaultShowComments = false,
}: ResearchPostCardProps) {
  const { 
    currentUser, 
    toggleLikeThread, 
    toggleSaveThread, 
    addToast,
    followedUserIds,
    toggleFollowUser,
    followedTopics,
    toggleFollowTopic,
    collabStatuses,
    fetchCollabStatus,
  } = useStore();

  const isLiked = (post.likes && post.likes.length > 0) || false;
  const likesCount = post.likesCount ?? post._count?.likes ?? 0;
  const [isSaved, setIsSaved] = useState(
    (post.saves || []).some((s: any) => s.userId === currentUser?.id)
  );
  
  const authorId = post.authorId || post.author?.id;
  const isOwner = authorId === currentUser?.id;
  
  React.useEffect(() => {
    if (authorId && currentUser && !isOwner) {
      fetchCollabStatus(authorId, post.id);
    }
  }, [authorId, post.id, currentUser, isOwner, fetchCollabStatus]);

  const collabState = collabStatuses[authorId]?.status || 'NONE';
  const collabRequestId = collabStatuses[authorId]?.requestId;
  const collabId = collabStatuses[authorId]?.collaborationId;

  const isFollowingAuthor = authorId ? !!followedUserIds[authorId] : false;
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [collabDialogOpen, setCollabDialogOpen] = useState(false);
  const [collabMessage, setCollabMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const isCompact = typeof window !== 'undefined' && localStorage.getItem('cb_pref_compact_cards') === 'true';
  const autoExpandPref = typeof window !== 'undefined' && localStorage.getItem('cb_pref_auto_abstracts') === 'true';
  const [isExpanded, setIsExpanded] = useState(autoExpandPref);

  const authorName = post.author?.name || 'Researcher';
  const authorDept: string | undefined = post.author?.department || undefined;
  const authorRole = post.author?.role || 'RESEARCH_SCHOLAR';
  const avatarUrl = getProfileImageUrl(post.author);

  const formatDate = (dateStr: string | Date) => {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleLikeThread(post.id);
    } catch (err: any) {
      addToast('Failed to update like status', 'error');
    }
  };

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    try {
      if (currentUser?.id) {
        useStore.getState().toggleSaveThreadLocally(post.id, nextSaved, currentUser.id);
      }
      await toggleSaveThread(post.id);
      addToast(nextSaved ? 'Post saved to your bookmarks' : 'Post removed from bookmarks', 'info');
    } catch (err: any) {
      setIsSaved(!nextSaved);
      addToast('Failed to update bookmark status', 'error');
    }
  };

  const handleCollabRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!authorId || isOwner) return;

    if (collabState === 'ACTIVE' && collabId) {
      window.location.href = `/nexus?collab=${collabId}`;
      return;
    }

    if (collabState === 'PENDING_SENT' || collabState === 'PENDING_RECEIVED') {
      window.location.href = `/nexus?view=requests`;
      return;
    }

    // Start from a message about this post; the sender can rewrite it.
    let defaultMsg = `I would like to collaborate with you on your research.`;
    if (post.title) defaultMsg = `I am interested in collaborating on "${post.title}".`;
    else if (post.isPaper) defaultMsg = `I found your recent publication very insightful and would love to explore a collaboration.`;
    setCollabMessage(defaultMsg);
    setCollabDialogOpen(true);
  };


  const POST_TYPES: Record<string, { label: string; tone: Tone }> = {
    PUBLICATION: { label: 'Publication', tone: 'plum' },
    QUESTION: { label: 'Question', tone: 'warning' },
    COLLABORATION_REQUEST: { label: 'Collaboration request', tone: 'brand' },
    ACHIEVEMENT: { label: 'Achievement', tone: 'success' },
    ANNOUNCEMENT: { label: 'Announcement', tone: 'sea' },
  };
  const postType = POST_TYPES[post.rawType] || { label: 'Research update', tone: 'neutral' as Tone };
  const textContent = post.content || '';
  const isLongContent = textContent.length > 280;
  const commentsCount = post.commentsCount ?? post._count?.comments ?? 0;
  const roleLabel = ROLE_LABEL[authorRole] || authorRole.replace(/_/g, ' ').toLowerCase();
  const openAuthor = () => onAuthorClick?.(post.author || { name: authorName, department: authorDept });

  const collabLabel =
    collabState === 'ACTIVE' ? 'Open collaboration'
      : collabState === 'PENDING_SENT' ? 'Request sent'
      : collabState === 'PENDING_RECEIVED' ? 'Review request'
      : 'Collaborate';

  const actionClass =
    'inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-ink-muted transition-colors duration-fast hover:bg-neutral-100 hover:text-ink [&_svg]:size-[17px]';

  return (
    <article className={cn('rounded-2xl border border-line bg-surface shadow-xs', isCompact ? 'p-4' : 'p-5')}>
      <header className="flex items-start gap-3">
        <button type="button" onClick={openAuthor} className="shrink-0 rounded-full" aria-label={`View ${authorName}'s profile`}>
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => handleAvatarError(e, authorName)}
            className="size-10 rounded-full bg-neutral-100 object-cover ring-1 ring-line"
          />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={openAuthor} className="max-w-full truncate text-left text-sm font-semibold text-ink hover:underline">
            {authorName}
          </button>
          <p className="truncate text-xs text-ink-muted">
            <span className="capitalize">{roleLabel}</span>
            {authorDept && <> · {authorDept}</>}
          </p>
        </div>
        {isFeedView ? (
          <Link
            href={`/feed/${post.id}`}
            className="shrink-0 rounded pt-0.5 text-xs text-ink-muted hover:text-ink hover:underline"
            aria-label={`Open post, ${formatDate(post.createdAt)}`}
          >
            <time dateTime={new Date(post.createdAt || Date.now()).toISOString()}>{formatDate(post.createdAt)}</time>
          </Link>
        ) : (
          <time dateTime={new Date(post.createdAt || Date.now()).toISOString()} className="shrink-0 pt-0.5 text-xs text-ink-muted">
            {formatDate(post.createdAt)}
          </time>
        )}

        <div className="relative -mr-1.5 -mt-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Post options"
            aria-haspopup="menu"
            aria-expanded={showMenu}
            className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-neutral-100 hover:text-ink"
          >
            <MoreHorizontal className="size-[18px]" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-dropdown" onClick={() => setShowMenu(false)} aria-hidden />
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  onKeyDown={(e) => e.key === 'Escape' && setShowMenu(false)}
                  className="absolute right-0 top-9 z-dropdown w-48 rounded-xl border border-line bg-surface p-1 text-sm shadow-xl"
                >
                  {!isOwner && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (post.authorId) toggleFollowUser(post.authorId);
                        setShowMenu(false);
                      }}
                      className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-ink-secondary hover:bg-neutral-100 hover:text-ink"
                    >
                      <UserPlus className="size-4" />
                      {isFollowingAuthor ? 'Unfollow author' : 'Follow author'}
                    </button>
                  )}
                  {isOwner && onEditClick && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { onEditClick(post); setShowMenu(false); }}
                      className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-ink-secondary hover:bg-neutral-100 hover:text-ink"
                    >
                      <FileText className="size-4" />
                      Edit post
                    </button>
                  )}
                  {isOwner && onDeleteClick && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { onDeleteClick(post); setShowMenu(false); }}
                      className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-danger-700 hover:bg-danger-50"
                    >
                      <Trash2 className="size-4" />
                      Delete post
                    </button>
                  )}
                  {!isOwner && onReportClick && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { onReportClick(post); setShowMenu(false); }}
                      className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-danger-700 hover:bg-danger-50"
                    >
                      <Flag className="size-4" />
                      Report post
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="mt-4">
        <Badge tone={postType.tone}>{postType.label}</Badge>
        {post.title && (
          <h3 className="mt-2 font-serif text-[19px] font-semibold leading-snug tracking-[-0.005em] text-ink">{post.title}</h3>
        )}
        <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-secondary">
          {isExpanded || !isLongContent ? textContent : textContent.slice(0, 280).trimEnd() + '…'}
          {isLongContent && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="ml-1 font-medium text-brand hover:underline"
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </p>

        {(post.isPaper || post.paperInfo) && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-surface-muted px-3.5 py-3">
            <BookOpen className="size-[18px] shrink-0 text-plum-600" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{post.paperInfo?.journal || 'Research publication'}</p>
              {post.paperInfo?.publisher && <p className="truncate text-xs text-ink-muted">{post.paperInfo.publisher}</p>}
            </div>
          </div>
        )}

        {post.attachments && post.attachments.length > 0 && (
          <ul className="mt-4 space-y-2">
            {post.attachments.map((att: any, idx: number) => (
              <li key={idx}>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-2.5 text-sm transition-colors hover:border-line-strong hover:bg-surface-muted"
                >
                  <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden />
                  <span className="flex-1 truncate font-medium text-ink group-hover:text-brand">{att.name || 'Attachment'}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        )}

        {post.tags && post.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Topics">
            {post.tags.map((tag: string, i: number) => (
              <li key={i} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-ink-secondary">
                {tag.replace(/^#/, '')}
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="-mx-2 mt-4 flex items-center gap-1 border-t border-line pt-3">
        <button
          type="button"
          onClick={handleLikeToggle}
          aria-pressed={isLiked}
          aria-label={isLiked ? 'Unlike' : 'Like'}
          className={cn(actionClass, isLiked && 'text-danger-600 hover:text-danger-700')}
        >
          <Heart className={cn(isLiked && 'fill-current')} />
          {likesCount > 0 && <span className="tabular-nums">{likesCount}</span>}
        </button>
        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          aria-expanded={showComments}
          aria-label="Comments"
          className={cn(actionClass, showComments && 'bg-neutral-100 text-ink')}
        >
          <MessageSquare />
          {commentsCount > 0 && <span className="tabular-nums">{commentsCount}</span>}
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onShareClick?.(post); }} aria-label="Share" className={actionClass}>
          <Share2 />
        </button>
        <button
          type="button"
          onClick={handleSaveToggle}
          aria-pressed={isSaved}
          aria-label={isSaved ? 'Remove from saved' : 'Save'}
          className={cn(actionClass, isSaved && 'text-warning-600 hover:text-warning-700')}
        >
          <Bookmark className={cn(isSaved && 'fill-current')} />
        </button>

        {!isOwner && (
          <button
            type="button"
            onClick={handleCollabRequest}
            className={cn(
              'ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-50 [&_svg]:size-4',
              collabState === 'ACTIVE'
                ? 'border-brand bg-brand text-white hover:bg-brand-strong'
                : collabState === 'PENDING_SENT'
                ? 'border-warning-200 bg-warning-50 text-warning-700'
                : 'border-line-strong bg-surface text-ink hover:bg-surface-muted',
            )}
          >
            <Users aria-hidden />
            {collabLabel}
          </button>
        )}
      </footer>

      {showComments && (
        <div className="mt-4 border-t border-line pt-4">
          <FeedComments threadId={post.id} />
        </div>
      )}

      {authorId && (
        <CollabRequestDialog
          open={collabDialogOpen}
          onClose={() => setCollabDialogOpen(false)}
          recipientId={authorId}
          recipientName={authorName}
          threadId={post.id}
          defaultMessage={collabMessage}
        />
      )}
    </article>
  );
}
