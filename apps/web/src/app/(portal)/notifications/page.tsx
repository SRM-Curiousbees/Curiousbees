'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Award, Bell, Briefcase, Calendar, CheckCheck, FileText, Search, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Notification } from '@curiousbees/types';
import { 
  getStoredNotificationPreferences, 
  isNotificationAllowedByPreferences, 
  resolveNotificationCategory,
  NotificationPreferences 
} from '@/lib/notifications';

function formatRelativeTime(dateInput: Date | string | undefined): string {
  if (!dateInput) return 'Recently';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Recently';
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
}

type FilterCategory = 'ALL' | 'UNREAD' | 'RESEARCH' | 'OPPORTUNITIES' | 'COLLABORATION' | 'SYSTEM';

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, currentUser } = useStore();
  
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [preferences, setPreferences] = useState<NotificationPreferences>(getStoredNotificationPreferences());

  useEffect(() => {
    fetchNotifications();

    const handlePrefUpdate = () => {
      setPreferences(getStoredNotificationPreferences());
    };

    window.addEventListener('storage', handlePrefUpdate);
    window.addEventListener('cb-preferences-updated', handlePrefUpdate);
    return () => {
      window.removeEventListener('storage', handlePrefUpdate);
      window.removeEventListener('cb-preferences-updated', handlePrefUpdate);
    };
  }, [fetchNotifications]);

  // Notifications allowed by user's Settings
  const allowedNotifications = useMemo(() => {
    return (notifications || []).filter(n => isNotificationAllowedByPreferences(n, preferences));
  }, [notifications, preferences]);


  // Filtered Notifications for current tab and search
  const filteredNotifications = useMemo(() => {
    return allowedNotifications.filter(n => {
      const category = resolveNotificationCategory(n);
      
      // 1. Filter category
      if (activeFilter === 'UNREAD' && n.isRead) return false;
      if (activeFilter === 'RESEARCH' && category !== 'RESEARCH') return false;
      if (activeFilter === 'OPPORTUNITIES' && category !== 'OPPORTUNITIES') return false;
      if (activeFilter === 'COLLABORATION' && category !== 'COLLABORATION') return false;
      if (activeFilter === 'SYSTEM' && !(category === 'SYSTEM' || category === 'ADVISORY' || category === 'EVENTS')) return false;

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (n.title || '').toLowerCase().includes(q);
        const matchesBody = (n.body || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesBody) return false;
      }

      return true;
    });
  }, [allowedNotifications, activeFilter, searchQuery]);

  // Date Grouping Helper (TODAY, YESTERDAY, EARLIER)
  const groupedNotifications = useMemo(() => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const earlier: Notification[] = [];

    const now = Date.now();

    filteredNotifications.forEach(n => {
      const notifTime = n.createdAt ? new Date(n.createdAt).getTime() : now;
      if (isNaN(notifTime)) {
        today.push(n);
        return;
      }
      const diffHours = Math.max(0, (now - notifTime) / (1000 * 60 * 60));

      if (diffHours < 24) {
        today.push(n);
      } else if (diffHours < 48) {
        yesterday.push(n);
      } else {
        earlier.push(n);
      }
    });

    return [
      { group: 'TODAY', items: today },
      { group: 'YESTERDAY', items: yesterday },
      { group: 'EARLIER', items: earlier },
    ].filter(g => g.items.length > 0);
  }, [filteredNotifications]);

  const handleItemClick = (notif: Notification) => {
    markNotificationAsRead(notif.id);
    let target = notif.href || notif.actionUrl;
    if (!target) {
      const category = resolveNotificationCategory(notif);
      if (category === 'ADVISORY') {
        target = currentUser?.role === 'RESEARCH_SUPERVISOR' ? '/my-scholars' : '/my-research';
      } else if (category === 'RESEARCH') {
        target = '/feed';
      } else if (category === 'OPPORTUNITIES') {
        target = '/opportunities';
      } else if (category === 'COLLABORATION') {
        target = '/nexus';
      } else if (category === 'EVENTS') {
        target = '/events';
      } else {
        target = '/notifications';
      }
    }
    if (target) {
      router.push(target);
    }
  };

  const CATEGORY_STYLE: Record<string, { icon: React.ElementType; label: string; className: string }> = {
    RESEARCH: { icon: FileText, label: 'Research', className: 'bg-brand-50 text-brand-700' },
    OPPORTUNITIES: { icon: Briefcase, label: 'Opportunity', className: 'bg-sea-50 text-sea-700' },
    COLLABORATION: { icon: Users, label: 'Collaboration', className: 'bg-plum-50 text-plum-700' },
    ADVISORY: { icon: Award, label: 'Supervision', className: 'bg-warning-50 text-warning-700' },
    EVENTS: { icon: Calendar, label: 'Event', className: 'bg-success-50 text-success-700' },
  };
  const styleFor = (notif: Notification) =>
    CATEGORY_STYLE[resolveNotificationCategory(notif)] ?? { icon: Sparkles, label: 'Update', className: 'bg-neutral-100 text-ink-secondary' };

  const FILTERS: { id: FilterCategory; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'UNREAD', label: unreadCount > 0 ? `Unread · ${unreadCount}` : 'Unread' },
    { id: 'RESEARCH', label: 'Research' },
    { id: 'OPPORTUNITIES', label: 'Opportunities' },
    { id: 'COLLABORATION', label: 'Collaboration' },
    { id: 'SYSTEM', label: 'System' },
  ];
  const GROUP_LABEL: Record<string, string> = { TODAY: 'Today', YESTERDAY: 'Yesterday', EARLIER: 'Earlier' };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Replies, requests, reviews and announcements that involve you."
        actions={
          unreadCount > 0 && (
            <Button variant="secondary" onClick={() => markAllNotificationsAsRead()}>
              <CheckCheck aria-hidden />
              Mark all as read
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter notifications">
          <div className="flex min-w-max gap-1.5">
            {FILTERS.map((f) => {
              const selected = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveFilter(f.id)}
                  className={cn(
                    'h-8 rounded-full border px-3 text-sm transition-colors duration-fast',
                    selected ? 'border-ink bg-ink font-medium text-ink-inverse' : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink',
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="relative sm:w-60">
          <label htmlFor="notif-search" className="sr-only">
            Search notifications
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            id="notif-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications"
            className="cb-input h-9 pl-9"
          />
        </div>
      </div>

      {groupedNotifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title={activeFilter !== 'ALL' || searchQuery ? 'Nothing matches this filter' : "You're all caught up"}
            description={
              activeFilter !== 'ALL' || searchQuery
                ? 'Try another filter or clear your search.'
                : 'New replies, supervision updates and announcements will appear here.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map((group) => (
            <section key={group.group} aria-labelledby={`notif-${group.group}`}>
              <h2 id={`notif-${group.group}`} className="mb-2 text-sm font-medium text-ink-muted">
                {GROUP_LABEL[group.group] ?? group.group}
              </h2>
              <Card>
                <ul className="divide-y divide-line">
                  {group.items.map((notif) => {
                    const style = styleFor(notif);
                    return (
                      <li key={notif.id}>
                        <button
                          type="button"
                          onClick={() => handleItemClick(notif)}
                          className={cn(
                            'group flex w-full items-start gap-3.5 px-4 py-4 text-left transition-colors duration-fast hover:bg-surface-muted sm:px-5',
                            !notif.isRead && 'bg-brand-50/50',
                          )}
                        >
                          <span className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg', style.className)}>
                            <style.icon className="size-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className={cn('text-sm text-ink group-hover:text-brand', !notif.isRead ? 'font-semibold' : 'font-medium')}>
                                {notif.title}
                              </span>
                              <span className="shrink-0 text-xs text-ink-muted">{notif.time || formatRelativeTime(notif.createdAt)}</span>
                            </span>
                            {notif.body && <span className="mt-0.5 block text-sm text-ink-secondary">{notif.body}</span>}
                            <span className="mt-1.5 block text-xs text-ink-muted">{style.label}</span>
                          </span>
                          {!notif.isRead && (
                            <span className="mt-2 size-2 shrink-0 rounded-full bg-brand">
                              <span className="sr-only">Unread</span>
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
