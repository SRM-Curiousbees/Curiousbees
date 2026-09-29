'use client';

/**
 * Top bar: location context, global search (⌘K), notifications and account menu.
 */

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { findNavContext } from '@/lib/navigation';
import SpotlightSearch from '../SpotlightSearch';
import Logo from '@/components/Logo';
import { IconButton } from '@/components/ui/button';
import { NotificationDropdown } from '../shared/notification-dropdown';
import { ProfileDropdown } from '../shared/profile-dropdown';

export default function Navbar() {
  const pathname = usePathname();
  const tab = useSearchParams().get('tab');
  const { currentUser, setMobileSidebar } = useStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { section, item } = findNavContext(currentUser?.role, pathname, tab);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-header flex h-header w-full shrink-0 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/85 sm:px-6">
        <IconButton label="Open navigation" onClick={() => setMobileSidebar(true)} className="-ml-1.5 lg:hidden">
          <Menu />
        </IconButton>
        <span className="lg:hidden">
          <Logo size={26} />
        </span>

        <p className="hidden min-w-0 truncate text-sm lg:block" aria-live="polite">
          {section && <span className="text-ink-muted">{section} / </span>}
          <span className="font-medium text-ink">{item?.name ?? ''}</span>
        </p>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search CuriousBees"
            className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-muted px-2.5 text-sm text-ink-muted transition-colors duration-fast hover:border-line-strong hover:bg-surface sm:w-64"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="hidden flex-1 truncate text-left sm:inline">Search researchers, research…</span>
            <kbd className="hidden h-5 items-center rounded border border-line bg-surface px-1.5 font-mono text-2xs text-ink-muted sm:inline-flex">
              ⌘K
            </kbd>
          </button>
          <NotificationDropdown />
          <ProfileDropdown />
        </div>
      </header>

      <SpotlightSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
