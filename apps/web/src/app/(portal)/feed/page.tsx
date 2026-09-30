'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { 
  Search, 
  Plus, 
  RefreshCcw, 
  X, 
  Sparkles, 
  Bookmark, 
  TrendingUp, 
  Bell, 
  Filter,
  FileText, 
  BookOpen, 
  Hash, 
  Users,
  Award,
  ShieldAlert,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Feed sub-components
import CompactComposer from '@/components/feed/CompactComposer';
import ResearchPostCard from '@/components/feed/ResearchPostCard';
import ResearchDiscoverySidebar from '@/components/feed/ResearchDiscoverySidebar';
import MobileFeedNav from '@/components/feed/MobileFeedNav';
import ResearcherProfileModal from '@/components/feed/ResearcherProfileModal';
import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import FeedComments from '@/components/feed/FeedComments';
import FeedFAB from '@/components/feed/FeedFAB';
import EditPostModal from '@/components/feed/EditPostModal';
import ReportPostModal from '@/components/feed/ReportPostModal';
import ConfirmDeleteModal from '@/components/feed/ConfirmDeleteModal';
import ShareModal from '@/components/feed/ShareModal';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { toFeedPost } from '@/lib/feed-post';

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface Thread {
  id: string;
  title: string;
  content: string;
  createdAt: string | Date;
  authorId?: string;
  author?: {
    id?: string;
    name: string | null;
    image: string | null;
    role: string;
    department: string | null;
    faculty?: string | null;
  };
  tags: string[];
  commentsCount: number;
  likesCount: number;
  collaboratorsCount: number;
  badge?: string;
  rawType?: string;
  isPaper?: boolean;
  paperInfo?: {
    journal?: string;
    publisher?: string;
  };
  interestedCount?: number;
  attachments?: any[];
  saves?: Array<{ userId: string; threadId: string; id: string; createdAt: any }>;
  comments?: any[];
}

// ─── FILTER PILLS CONFIG ────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { label: 'All', value: 'ALL', icon: Sparkles },
  { label: 'Saved', value: 'SAVED', icon: Bookmark },
  { label: 'Updates', value: 'RESEARCH_UPDATE', icon: FileText },
  { label: 'Papers', value: 'PUBLICATION', icon: BookOpen },
  { label: 'Questions', value: 'QUESTION', icon: Hash },
  { label: 'Collabs', value: 'COLLABORATION_REQUEST', icon: Users },
  { label: 'Achievements', value: 'ACHIEVEMENT', icon: Award },
  { label: 'Notices', value: 'ANNOUNCEMENT', icon: Bell }
];

function ScholarFeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentType = searchParams?.get('type') || 'ALL';
  const urlSearch = searchParams?.get('q') || '';
  const [currentSort, setCurrentSort] = useState<'latest' | 'top'>('latest');

  useEffect(() => {
    const urlSort = searchParams?.get('sort') as 'latest' | 'top' | null;
    if (urlSort) {
      setCurrentSort(urlSort);
    } else if (typeof window !== 'undefined') {
      const savedPref = localStorage.getItem('cb_pref_feed_sort') as 'latest' | 'top' | null;
      if (savedPref) setCurrentSort(savedPref);
    }
  }, [searchParams]);

  const { 
    threads, feedCounts, feedError, searchQuery, setSearchQuery, activeTag, setActiveTag, 
    isLoading, fetchFeedThreads, fetchFeedCounts, currentUser, createThread,
    toggleLikeThread, requestThreadCollaboration, shareThread, reportThread, connectWithPeer,
    toggleSaveThread, deleteThread, toggleSaveThreadLocally, addToast, fetchSuggestedPeers, fetchTrendingResearch,
    followedUserIds, followedDomains, followedTopics,
    workspaces, myScholars
  } = useStore();

  // ─── LOCAL STATE ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'foryou' | 'following' | 'discover'>('foryou');
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [reportingPost, setReportingPost] = useState<any | null>(null);
  const [deletingPost, setDeletingPost] = useState<any | null>(null);
  const [sharingPost, setSharingPost] = useState<any | null>(null);
  const [shareCounts, setShareCounts] = useState<Record<string, number>>({});
  const [selectedResearcher, setSelectedResearcher] = useState<any | null>(null);
  
  // Fetch threads and counts when URL params change
  useEffect(() => {
    fetchFeedThreads(urlSearch, currentType, currentSort);
    fetchFeedCounts(urlSearch);
  }, [urlSearch, currentType, currentSort, fetchFeedThreads, fetchFeedCounts]);

  // ─── URL HELPERS ──────────────────────────────────────────────────────────

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery) {
      params.set('q', searchQuery);
    } else {
      params.delete('q');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleTypeFilter = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (type === 'ALL') {
      params.delete('type');
    } else {
      params.set('type', type);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleSortChange = (sort: 'latest' | 'top') => {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === 'latest') {
      params.delete('sort');
    } else {
      params.set('sort', sort);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // ─── THREAD TRANSFORM ────────────────────────────────────────────────────

  const getCombinedThreads = (): Thread[] => threads.map((t) => toFeedPost(t) as Thread);

  const filteredThreads = useMemo(() => {
    const combined = getCombinedThreads();
    const q = searchQuery.toLowerCase().trim();

    // 1. Base Search & Tag Matching
    const matched = combined.filter(t => {
      const matchesSearch = !q || 
        t.title.toLowerCase().includes(q) || 
        t.content.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q)) ||
        (t.author?.name || '').toLowerCase().includes(q);
      
      const matchesTag = activeTag === '' || t.tags.includes(activeTag);
      return matchesSearch && matchesTag;
    });

    // 2. Tab Specific Filtering & Personalization
    if (activeTab === 'following') {
      const followedAuthorCount = Object.keys(followedUserIds).filter(k => followedUserIds[k]).length;
      const followedDomainCount = Object.keys(followedDomains).filter(k => followedDomains[k]).length;
      const followedTopicCount = Object.keys(followedTopics).filter(k => followedTopics[k]).length;
      const hasAnyFollows = followedAuthorCount > 0 || followedDomainCount > 0 || followedTopicCount > 0;

      if (!hasAnyFollows) {
        // Fallback: If user hasn't followed anyone yet, show matched threads so feed isn't empty
        return matched;
      }

      return matched.filter(t => {
        const isAuthorFollowed = t.authorId ? !!followedUserIds[t.authorId] : false;
        const isDomainFollowed = t.tags.some(tag => !!followedDomains[tag.toLowerCase()]);
        const isTopicFollowed = t.tags.some(tag => !!followedTopics[tag.toLowerCase().replace(/^#/, '')]);
        return isAuthorFollowed || isDomainFollowed || isTopicFollowed;
      });
    }

    if (activeTab === 'foryou') {
      const userInterests = (currentUser?.interests || []).map((i: any) => (i.interest?.name || i.name || '').toLowerCase()).filter(Boolean);
      const userDomains = ((currentUser as any)?.userDomains || []).map((d: any) => (d.domain?.name || d.name || '').toLowerCase()).filter(Boolean);
      const userTopics = ((currentUser as any)?.userTopics || []).map((t: any) => (t.topic?.name || t.name || '').toLowerCase()).filter(Boolean);
      const myScholarIds = (myScholars || []).map((s: any) => s.id);
      const myWorkspaceMemberIds = new Set(
        (workspaces || []).flatMap((ws: any) => (ws.members || []).map((m: any) => m.userId || m.user?.id))
      );

      const calculateScore = (item: Thread) => {
        let score = 0;
        const authorId = item.authorId || item.author?.id;

        // 1. Direct Supervision Relationship (+18 pts)
        if (authorId) {
          if (currentUser?.supervisorId && authorId === currentUser.supervisorId) {
            score += 18;
          }
          if (myScholarIds.includes(authorId)) {
            score += 18;
          }
        }

        // 2. Shared Research Workspace Co-membership (+14 pts)
        if (authorId && myWorkspaceMemberIds.has(authorId)) {
          score += 14;
        }

        // 3. Followed Author (+10 pts)
        if (authorId && followedUserIds[authorId]) {
          score += 10;
        }

        // 4. Research Domain & Topic Alignment (+12 pts)
        const hasDomainMatch = item.tags.some(t => {
          const cleanTag = t.toLowerCase().replace(/^#/, '');
          return userDomains.includes(cleanTag) || !!followedDomains[cleanTag];
        });
        if (hasDomainMatch) score += 12;

        const hasTopicMatch = item.tags.some(t => {
          const cleanTag = t.toLowerCase().replace(/^#/, '');
          return userTopics.includes(cleanTag) || !!followedTopics[cleanTag];
        });
        if (hasTopicMatch) score += 12;

        // 5. General Interests Match (+6 pts)
        if (item.tags.some(t => userInterests.includes(t.toLowerCase().replace(/^#/, '')))) {
          score += 6;
        }

        // 6. Department Alignment (+4 pts)
        if (item.author?.department && currentUser?.department && item.author.department.toLowerCase() === currentUser.department.toLowerCase()) {
          score += 4;
        }

        return score;
      };

      return [...matched].sort((a, b) => {
        const aScore = calculateScore(a);
        const bScore = calculateScore(b);

        if (bScore !== aScore) return bScore - aScore;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // DISCOVER: Return all matched threads chronologically
    return matched;
  }, [threads, searchQuery, activeTag, activeTab, currentUser, followedUserIds, followedDomains, followedTopics, workspaces, myScholars]);

  // ─── ACTIONS ──────────────────────────────────────────────────────────────

  const handleShare = (thread: Thread) => {
    setSharingPost(thread);
  };

  const handleShareSuccess = (platform: string) => {
    if (!sharingPost) return;
    setShareCounts(prev => ({
      ...prev,
      [sharingPost.id]: (prev[sharingPost.id] ?? (sharingPost._count?.shares || 0)) + 1
    }));
  };

  const handlePostCreated = () => {
    fetchFeedThreads(urlSearch, currentType, currentSort);
    fetchFeedCounts(urlSearch);
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    handleSearchSubmit();
  };

  const handleRefresh = () => {
    fetchFeedThreads(urlSearch, currentType, currentSort);
    fetchFeedCounts(urlSearch);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  const focusComposer = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => document.getElementById('feed-composer')?.focus(), 250);
  };

  // `/feed?compose=1` (and the old /feed/create page) opens the feed ready to write.
  const wantsCompose = searchParams.get('compose') === '1';
  useEffect(() => {
    if (!wantsCompose) return;
    focusComposer();
    const params = new URLSearchParams(searchParams.toString());
    params.delete('compose');
    const qs = params.toString();
    router.replace(qs ? `/feed?${qs}` : '/feed', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsCompose]);

  const TABS = [
    { id: 'foryou', label: 'For you' },
    { id: 'following', label: 'Following' },
    { id: 'discover', label: 'Discover' },
  ] as const;

  return (
    <div className="mx-auto grid max-w-[1120px] items-start gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      <MobileFeedNav onOpenCreate={focusComposer} />

      <section aria-labelledby="feed-title" className="min-w-0">
        <div className="mb-5 flex flex-col gap-4">
          <div>
            <h1 id="feed-title" className="text-2xl font-semibold tracking-tight text-ink">Research feed</h1>
            <p className="mt-1 text-sm text-ink-secondary">Updates, papers and questions from researchers across SRMIST.</p>
          </div>

          <form onSubmit={handleSearchSubmit} role="search" className="relative">
            <label htmlFor="feed-search" className="sr-only">Search the research feed</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              id="feed-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts, papers and people"
              className="cb-input h-10 pl-9 pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchQuery('');
                  router.push(`?type=${currentType}`);
                }}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-100 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            )}
          </form>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="Feed" className="inline-flex rounded-lg border border-line bg-surface-muted p-0.5">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`h-8 rounded-md px-3.5 text-sm font-medium transition-colors duration-fast ${
                      isActive ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Filter by post type">
            <div className="flex min-w-max items-center gap-1.5">
              {TYPE_FILTERS.map((filter) => {
                const Icon = filter.icon;
                const isActive = currentType === filter.value;
                return (
                  <button
                    key={filter.value}
                    onClick={() => handleTypeFilter(filter.value)}
                    aria-pressed={isActive}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors duration-fast ${
                      isActive
                        ? 'border-ink bg-ink font-medium text-ink-inverse'
                        : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink'
                    }`}
                  >
                    {Icon && <Icon className="size-3.5" aria-hidden />}
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <CompactComposer onPostCreated={handlePostCreated} />

        <div className="mt-4 space-y-3">
          {isLoading && filteredThreads.length === 0 && !feedError ? (
            <FeedSkeleton count={3} />
          ) : feedError && filteredThreads.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface">
              <EmptyState
                icon={ShieldAlert}
                title="The research feed didn't load"
                description="This is usually a temporary connection problem. Your posts are safe."
                action={
                  <Button variant="secondary" onClick={handleRefresh}>
                    <RefreshCcw aria-hidden />
                    Try again
                  </Button>
                }
              />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface">
              {urlSearch ? (
                <EmptyState
                  icon={Search}
                  title={`No results for "${urlSearch}"`}
                  description="Try a different term, or clear the search to see all posts."
                  action={
                    <Button variant="secondary" onClick={() => { setSearchQuery(''); router.push('/feed'); }}>
                      Clear search
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="Nothing here yet"
                  description={
                    activeTab === 'following'
                      ? 'Posts from researchers and topics you follow will appear here.'
                      : 'Follow researchers and research areas to shape this feed, or share your first update above.'
                  }
                  action={
                    <Link href="/researchers" className={buttonVariants({ variant: 'secondary' })}>
                      Find researchers
                    </Link>
                  }
                />
              )}
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <ResearchPostCard
                key={thread.id}
                post={thread}
                onAuthorClick={(author) => setSelectedResearcher(author)}
                onShareClick={(post) => handleShare(post)}
                onReportClick={(post) => setReportingPost(post)}
                onDeleteClick={(post) => setDeletingPost(post)}
                onEditClick={(post) => setEditingPost(post)}
              />
            ))
          )}

          {isLoading && filteredThreads.length > 0 && (
            <div className="flex justify-center py-6 text-ink-muted" role="status">
              <Loader2 className="size-5 animate-spin" aria-label="Loading more posts" />
            </div>
          )}
        </div>
      </section>

      <aside className="sticky top-[calc(var(--layout-header)+2rem)] hidden max-h-[calc(100dvh-var(--layout-header)-4rem)] overflow-y-auto xl:block" aria-label="Discover">
        <ResearchDiscoverySidebar
          onSearchChange={(q) => {
            setSearchQuery(q);
          }}
          onTagClick={handleTagClick}
        />
      </aside>

      {/* ─── FLOATING ACTION BUTTON ─── */}
      <FeedFAB onWrite={focusComposer} />

      {/* ─── MODALS ─── */}
      {editingPost && (
        <EditPostModal 
          isOpen={!!editingPost} 
          onClose={() => setEditingPost(null)} 
          thread={editingPost} 
        />
      )}
      {reportingPost && (
        <ReportPostModal 
          isOpen={!!reportingPost} 
          onClose={() => setReportingPost(null)} 
          thread={reportingPost} 
        />
      )}
      {deletingPost && (
        <ConfirmDeleteModal 
          isOpen={!!deletingPost} 
          onClose={() => setDeletingPost(null)} 
          thread={deletingPost} 
        />
      )}
      {sharingPost && (
        <ShareModal
          isOpen={!!sharingPost}
          onClose={() => setSharingPost(null)}
          thread={sharingPost}
          onShareSuccess={handleShareSuccess}
        />
      )}
      <ResearcherProfileModal
        isOpen={!!selectedResearcher}
        onClose={() => setSelectedResearcher(null)}
        researcher={selectedResearcher}
      />

      {/* Space for the mobile tab bar */}
      <div className="h-16 md:hidden xl:col-span-2" aria-hidden />
    </div>
  );
}

export default function ScholarFeedPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <ScholarFeedContent />
    </Suspense>
  );
}
