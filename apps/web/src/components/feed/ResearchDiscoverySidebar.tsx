'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  UserPlus, 
  Check, 
  Tag, 
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { getProfileImageUrl, handleAvatarError } from '@/lib/avatar';
import { ROLE_LABEL } from '@/lib/navigation';
import { Skeleton } from '@/components/ui/skeleton';

interface ResearchDiscoverySidebarProps {
  onSearchChange?: (query: string) => void;
  onTagClick?: (tag: string) => void;
}

export default function ResearchDiscoverySidebar({
  onSearchChange,
  onTagClick
}: ResearchDiscoverySidebarProps) {
  const { 
    currentUser,
    fetchSuggestedPeers, 
    fetchTrendingResearch, 
    followedUserIds,
    followedTopics,
    toggleFollowUser,
    toggleFollowTopic
  } = useStore();

  const [peers, setPeers] = useState<any[]>([]);
  const [trendingTags, setTrendingTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [peersLoaded, setPeersLoaded] = useState(false);
  const [topicsLoaded, setTopicsLoaded] = useState(false);

  useEffect(() => {
    fetchSuggestedPeers().then(data => {
      setPeers(data || []);
      setPeersLoaded(true);
    });

    fetchTrendingResearch().then(tags => {
      setTrendingTags(tags || []);
      setTopicsLoaded(true);
    });
  }, [fetchSuggestedPeers, fetchTrendingResearch]);

  return (
    <div className="space-y-6 text-left">
      <section aria-labelledby="discover-people" className="rounded-2xl border border-line bg-surface shadow-xs">
        <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-4">
          <h2 id="discover-people" className="text-sm font-semibold text-ink">Researchers to follow</h2>
          <Link href="/researchers" className="text-sm font-medium text-brand hover:underline">View all</Link>
        </div>
        {!peersLoaded ? (
          <div className="space-y-3 px-4 pb-4 pt-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : peers.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-ink-muted">Suggestions appear once your research areas are set in your profile.</p>
        ) : (
          <ul className="pb-2">
            {peers.slice(0, 5).map((peer) => {
              const name = peer.name || 'Researcher';
              const domainsList: string[] = peer.domains || peer.researchInterests || [];
              return (
                <li key={peer.id}>
                  <Link href={`/researchers/${peer.id}`} className="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-surface-muted">
                    <img
                      src={getProfileImageUrl(peer)}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => handleAvatarError(e, name)}
                      className="size-9 shrink-0 rounded-full bg-neutral-100 object-cover ring-1 ring-line"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink group-hover:text-brand">{name}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        {ROLE_LABEL[peer.role] || 'Researcher'}{peer.department && ` · ${peer.department}`}
                      </span>
                      {domainsList.length > 0 && (
                        <span className="mt-1 block truncate text-xs text-ink-secondary">{domainsList.slice(0, 2).join(', ')}</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="discover-topics" className="rounded-2xl border border-line bg-surface shadow-xs">
        <div className="px-4 pb-2 pt-4">
          <h2 id="discover-topics" className="text-sm font-semibold text-ink">Active topics</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Follow a topic to see more of it in your feed.</p>
        </div>
        {!topicsLoaded ? (
          <div className="space-y-2.5 px-4 pb-4 pt-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-3/4" />)}
          </div>
        ) : trendingTags.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-ink-muted">Topics will appear here as researchers tag their posts.</p>
        ) : (
          <ul className="pb-2">
            {trendingTags.slice(0, 6).map((item) => {
              const cleanKey = item.tag.trim().toLowerCase().replace(/^#/, '');
              const isTopicFollowed = !!followedTopics[cleanKey];
              return (
                <li key={item.tag} className="flex items-center gap-2 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => onTagClick?.(item.tag)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium text-ink hover:text-brand">{item.tag.replace(/^#/, '')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFollowTopic(item.tag)}
                    aria-pressed={isTopicFollowed}
                    className={`h-7 shrink-0 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                      isTopicFollowed
                        ? 'border-brand-200 bg-brand-50 text-brand-800'
                        : 'border-line-strong bg-surface text-ink hover:bg-surface-muted'
                    }`}
                  >
                    {isTopicFollowed ? 'Following' : 'Follow'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
