'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, LogOut, Settings, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { getProfileImageUrl } from '@/lib/avatar';
import { RoleBadge } from './role-badge';

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  if (!currentUser) return null;

  const go = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const items = [
    ...(currentUser.role === 'RESEARCH_SUPERVISOR'
      ? [{ label: 'Supervision Panel', href: '/my-scholars', icon: GraduationCap }]
      : []),
    { label: 'My profile', href: '/profile', icon: User },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Account menu"
        className="flex size-9 items-center justify-center rounded-full transition-shadow duration-fast hover:ring-2 hover:ring-line-strong"
      >
        <img
          src={getProfileImageUrl(currentUser)}
          alt=""
          className="size-8 rounded-full bg-neutral-100 object-cover ring-1 ring-line"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full z-dropdown mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-xl"
          >
            <div className="px-2.5 pb-2.5 pt-2">
              <p className="truncate text-sm font-semibold text-ink">{currentUser.name || 'Researcher'}</p>
              <p className="truncate text-xs text-ink-muted">{currentUser.email}</p>
              <RoleBadge role={currentUser.role} className="mt-2" />
            </div>
            <div className="border-t border-line pt-1.5">
              {items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <button
                    key={href}
                    type="button"
                    role="menuitem"
                    onClick={() => go(href)}
                    className={cn(
                      'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors duration-fast',
                      active ? 'bg-brand-50 font-medium text-brand-800' : 'text-ink-secondary hover:bg-neutral-100 hover:text-ink',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="mt-1.5 border-t border-line pt-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-ink-secondary transition-colors duration-fast hover:bg-danger-50 hover:text-danger-700"
              >
                <LogOut className="size-4 shrink-0" aria-hidden />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
