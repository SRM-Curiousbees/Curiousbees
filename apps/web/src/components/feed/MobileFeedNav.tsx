'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Compass, Home, PenSquare, User } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

/** Bottom tab bar for the feed on phones (the global top bar handles the header). */
export default function MobileFeedNav({ onOpenCreate }: { onOpenCreate?: () => void }) {
  const pathname = usePathname();
  const { currentUser, unreadCount } = useStore();
  const profileHref = currentUser?.role === 'RESEARCH_SCHOLAR' ? '/scholar/profile' : '/profile';

  const tabs = [
    { href: '/feed', label: 'Feed', icon: Home, active: pathname === '/feed' },
    { href: '/researchers', label: 'Explore', icon: Compass, active: pathname === '/researchers' },
    { href: '/notifications', label: 'Alerts', icon: Bell, active: pathname === '/notifications', badge: unreadCount },
    { href: profileHref, label: 'Profile', icon: User, active: pathname === '/profile' || pathname === '/scholar/profile' },
  ];

  const item = 'relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-2xs font-medium';

  return (
    <nav
      aria-label="Feed navigation"
      className="fixed inset-x-0 bottom-0 z-sticky flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {tabs.slice(0, 2).map(({ href, label, icon: Icon, active }) => (
        <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn(item, active ? 'text-brand' : 'text-ink-muted')}>
          <Icon className="size-5" aria-hidden />
          {label}
        </Link>
      ))}
      <button type="button" onClick={onOpenCreate} className={cn(item, 'text-ink-muted')}>
        <span className="flex size-9 items-center justify-center rounded-full bg-brand text-white shadow-md">
          <PenSquare className="size-[18px]" aria-hidden />
        </span>
        <span className="sr-only">Write a post</span>
      </button>
      {tabs.slice(2).map(({ href, label, icon: Icon, active, badge }) => (
        <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn(item, active ? 'text-brand' : 'text-ink-muted')}>
          <span className="relative">
            <Icon className="size-5" aria-hidden />
            {!!badge && badge > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-2xs font-semibold leading-none text-white ring-2 ring-surface">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
