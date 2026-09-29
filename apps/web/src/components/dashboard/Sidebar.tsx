'use client';

/**
 * Sidebar — role-aware primary navigation.
 * Desktop (lg+): persistent column. Below lg: slide-in drawer opened from the top bar.
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { getProfileImageUrl } from '@/lib/avatar';
import { getNavSections, isNavItemActive, ROLE_LABEL } from '@/lib/navigation';
import Logo from '@/components/Logo';
import { IconButton } from '@/components/ui/button';

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const tab = useSearchParams().get('tab');
  const { currentUser, logout } = useStore();
  const role = currentUser?.role || 'RESEARCH_SCHOLAR';

  return (
    <div className="flex h-full flex-col border-r border-line bg-surface">
      <div className="flex h-header shrink-0 items-center justify-between px-5">
        <Link href="/" aria-label="CuriousBees home" className="rounded-lg">
          <Logo showText size={28} />
        </Link>
        {onClose && (
          <IconButton label="Close navigation" onClick={onClose} className="lg:hidden">
            <X />
          </IconButton>
        )}
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
        {getNavSections(role).map((section, idx) => (
          <div key={section.title ?? idx} className={cn(idx > 0 && 'mt-5')}>
            {section.title && (
              <p className="mb-1 px-2.5 text-xs font-medium text-ink-muted">{section.title}</p>
            )}
            <ul className="space-y-px">
              {section.items.map((item) => {
                const active = isNavItemActive(item.href, pathname, tab);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors duration-fast',
                        active
                          ? 'bg-brand-50 font-semibold text-brand-800'
                          : 'font-medium text-ink-secondary hover:bg-neutral-100 hover:text-ink',
                      )}
                    >
                      {active && (
                        <span aria-hidden className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-gold" />
                      )}
                      <Icon
                        aria-hidden
                        className={cn(
                          'size-[18px] shrink-0',
                          active ? 'text-brand-700' : 'text-ink-muted group-hover:text-ink-secondary',
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {currentUser && (
        <div className="shrink-0 border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <img
              src={getProfileImageUrl(currentUser)}
              alt=""
              className="size-8 shrink-0 rounded-full bg-neutral-100 object-cover ring-1 ring-line"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{currentUser.name || currentUser.email}</p>
              <p className="truncate text-xs text-ink-muted">{ROLE_LABEL[role]}</p>
            </div>
            <IconButton
              label="Sign out"
              size="sm"
              onClick={() => {
                onClose?.();
                logout();
              }}
              className="hover:bg-danger-50 hover:text-danger-700"
            >
              <LogOut />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { showMobileSidebar, setMobileSidebar } = useStore();
  const pathname = usePathname();

  // Close the drawer after navigation and on Escape.
  useEffect(() => {
    setMobileSidebar(false);
  }, [pathname, setMobileSidebar]);

  useEffect(() => {
    if (!showMobileSidebar) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileSidebar(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showMobileSidebar, setMobileSidebar]);

  return (
    <>
      <aside className="sticky top-0 z-sidebar hidden h-dvh w-sidebar shrink-0 lg:block">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {showMobileSidebar && (
          <div className="fixed inset-0 z-modal flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebar(false)}
              className="fixed inset-0 bg-black/40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-full w-72 max-w-[85vw] shadow-2xl"
            >
              <SidebarContent onClose={() => setMobileSidebar(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
