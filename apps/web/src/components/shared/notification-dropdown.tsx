'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCircle, 
  FileText, 
  Briefcase, 
  Users, 
  Award, 
  Sparkles, 
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useStore } from '@/store/useStore';
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

export function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(getStoredNotificationPreferences());

  const { notifications, unreadCount, fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } = useStore();

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

  // Close on outside click safely
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    const handleKey = (event: KeyboardEvent) => event.key === 'Escape' && setIsOpen(false);
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  // Only notifications allowed by Settings
  const allowedNotifications = React.useMemo(() => {
    return (notifications || []).filter(n => isNotificationAllowedByPreferences(n, preferences));
  }, [notifications, preferences]);



  const handleNotificationClick = (item: Notification) => {
    markNotificationAsRead(item.id);
    setIsOpen(false);
    const targetUrl = item.href || item.actionUrl || '/notifications';
    router.push(targetUrl);
  };

  const CATEGORY_ICON: Record<string, React.ElementType> = {
    RESEARCH: FileText,
    OPPORTUNITIES: Briefcase,
    COLLABORATION: Users,
    ADVISORY: Award,
    EVENTS: Calendar,
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        title="Notifications"
        className="relative flex size-9 items-center justify-center rounded-lg text-ink-secondary transition-colors duration-fast hover:bg-neutral-100 hover:text-ink"
      >
        <Bell className="size-[18px]" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-2xs font-semibold leading-none text-white ring-2 ring-surface">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full z-dropdown mt-2 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-line bg-surface text-left shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold text-ink">
                Notifications
                {unreadCount > 0 && <span className="ml-2 font-normal text-ink-muted">{unreadCount} unread</span>}
              </h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsAsRead()}
                  className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-50"
                >
                  <CheckCircle className="size-3.5" aria-hidden />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[360px] flex-1 divide-y divide-line overflow-y-auto">
              {allowedNotifications.length > 0 ? (
                allowedNotifications.map((n) => {
                  const Icon = CATEGORY_ICON[resolveNotificationCategory(n)] || Sparkles;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-fast hover:bg-surface-muted ${
                        !n.isRead ? 'bg-brand-50/40' : ''
                      }`}
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-sm text-ink ${!n.isRead ? 'font-semibold' : 'font-medium'}`}>
                            {n.title}
                          </span>
                          <span className="shrink-0 text-xs text-ink-muted">{n.time || formatRelativeTime(n.createdAt)}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-sm text-ink-secondary">{n.body}</span>
                      </span>
                      {!n.isRead && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
                  <Bell className="mb-2 size-6 text-ink-muted" aria-hidden />
                  <p className="text-sm font-medium text-ink">You're all caught up</p>
                  <p className="text-sm text-ink-muted">New approvals, replies and events will appear here.</p>
                </div>
              )}
            </div>

            <div className="border-t border-line p-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/notifications');
                }}
                className="flex h-9 w-full items-center justify-center gap-1 rounded-lg text-sm font-medium text-brand transition-colors hover:bg-brand-50"
              >
                View all notifications
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
