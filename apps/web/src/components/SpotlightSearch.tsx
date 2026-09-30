'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Briefcase, Calendar, CornerDownLeft, MessageSquare, Search, Users } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

type Category = 'Posts' | 'Opportunities' | 'Events' | 'Researchers';

interface SearchResultItem {
  id: string;
  title: string;
  category: Category | 'Action';
  url: string;
  meta?: string;
}

const FILTERS: { id: 'ALL' | Category; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'Posts', label: 'Posts' },
  { id: 'Researchers', label: 'Researchers' },
  { id: 'Opportunities', label: 'Opportunities' },
  { id: 'Events', label: 'Events' },
];

const ICONS: Record<SearchResultItem['category'], React.ElementType> = {
  Posts: MessageSquare,
  Opportunities: Briefcase,
  Events: Calendar,
  Researchers: Users,
  Action: Search,
};

const MAX_RESULTS = 8;

/**
 * Quick jump to posts, researchers, opportunities and events already loaded in
 * the portal (⌘K / Ctrl K). "Search all posts" runs the full server search on the feed.
 */
export default function SpotlightSearch({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { threads, opportunities, events, collaborators, fetchCollaborators } = useStore();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | Category>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    setQuery('');
    setSelectedIndex(0);
    fetchCollaborators();
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, fetchCollaborators]);

  const results = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    const list: SearchResultItem[] = [];

    (threads || []).forEach((t: any) => {
      if (!t) return;
      const title = t.title || (t.content ? String(t.content).slice(0, 80) : '');
      if (!title) return;
      list.push({
        id: `t-${t.id}`,
        title,
        category: 'Posts',
        url: `/feed/${t.id}`,
        meta: [t.author?.name, (t.tags || []).slice(0, 3).join(', ')].filter(Boolean).join(' · '),
      });
    });
    (collaborators || []).forEach((c: any) => {
      if (!c?.id) return;
      const interests = (c.interests || []).map((i: any) => i?.interest?.name || i?.name).filter(Boolean).slice(0, 3).join(', ');
      list.push({
        id: `c-${c.id}`,
        title: c.name || c.email || 'Researcher',
        category: 'Researchers',
        url: `/researchers/${c.id}`,
        meta: [c.department, interests].filter(Boolean).join(' · '),
      });
    });
    (opportunities || []).forEach((o: any) => {
      if (!o?.title) return;
      list.push({
        id: `o-${o.id}`,
        title: o.title,
        category: 'Opportunities',
        url: '/opportunities',
        meta: [o.opportunityType, o.author?.name].filter(Boolean).join(' · '),
      });
    });
    (events || []).forEach((e: any) => {
      if (!e?.title) return;
      const d = e.date ? new Date(e.date) : null;
      const when = d && !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : e.date;
      list.push({ id: `e-${e.id}`, title: e.title, category: 'Events', url: '/events', meta: [when, e.venue].filter(Boolean).join(' · ') });
    });

    const matched = list
      .filter((item) => filter === 'ALL' || item.category === filter)
      .filter((item) => !q || item.title.toLowerCase().includes(q) || (item.meta || '').toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);

    // The feed search covers every post, not just the ones loaded here.
    if (q && (filter === 'ALL' || filter === 'Posts')) {
      matched.push({ id: 'search-feed', title: `Search all posts for “${query.trim()}”`, category: 'Action', url: `/feed?q=${encodeURIComponent(query.trim())}` });
    }
    return matched;
  }, [threads, collaborators, opportunities, events, query, filter]);

  const go = (item?: SearchResultItem) => {
    if (!item) return;
    onClose();
    router.push(item.url);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[selectedIndex]);
    } else if (e.key === 'Tab') {
      // Keep focus inside: the input and the filter buttons are the only stops.
      const panel = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('input, button');
      const first = panel[0];
      const last = panel[panel.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!mounted) return null;

  const activeId = results[selectedIndex] ? `${listId}-${selectedIndex}` : undefined;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search CuriousBees"
            onKeyDown={onKeyDown}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="relative flex max-h-[76vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-[18px] shrink-0 text-ink-muted" aria-hidden />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                aria-label="Search posts, researchers, opportunities and events"
                placeholder="Search posts, researchers, opportunities…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
              />
              <kbd className="hidden shrink-0 rounded-md border border-line px-1.5 py-0.5 font-sans text-xs text-ink-muted sm:inline">Esc</kbd>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => {
                    setFilter(f.id);
                    setSelectedIndex(0);
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    'h-8 shrink-0 rounded-lg px-2.5 text-sm transition-colors duration-fast',
                    filter === f.id ? 'bg-neutral-100 font-medium text-ink' : 'text-ink-muted hover:bg-neutral-100 hover:text-ink',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <ul id={listId} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto p-2">
              {results.length === 0 ? (
                <li className="px-3 py-10 text-center" role="presentation">
                  <p className="text-sm font-medium text-ink">No matches</p>
                  <p className="mt-1 text-sm text-ink-muted">Try another word, or a different filter.</p>
                </li>
              ) : (
                results.map((item, idx) => {
                  const Icon = ICONS[item.category];
                  const selected = idx === selectedIndex;
                  return (
                    <li
                      key={item.id}
                      id={`${listId}-${idx}`}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => setSelectedIndex(idx)}
                      onClick={() => go(item)}
                      className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5', selected && 'bg-neutral-100')}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                        {(item.meta || item.category !== 'Action') && (
                          <span className="block truncate text-xs text-ink-muted">
                            {item.category !== 'Action' && item.category}
                            {item.meta && ` · ${item.meta}`}
                          </span>
                        )}
                      </span>
                      {selected && <CornerDownLeft className="size-4 shrink-0 text-ink-muted" aria-hidden />}
                    </li>
                  );
                })
              )}
            </ul>

            <div className="hidden items-center gap-4 border-t border-line px-4 py-2 text-xs text-ink-muted sm:flex">
              <span>↑ ↓ to move</span>
              <span>Enter to open</span>
              <span className="ml-auto">Searches what’s loaded; use “Search all posts” for the full feed</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
