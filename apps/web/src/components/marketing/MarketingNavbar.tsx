'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import Logo from '../Logo';
import { buttonVariants } from '@/components/ui/button';

const LINKS = [
  { href: '/research', label: 'Scholars' },
  { href: '/education', label: 'Supervisors' },
  { href: '/institution', label: 'Institutions' },
  { href: '/about', label: 'About' },
];

export default function MarketingNavbar() {
  const { currentUser, dashboardRoute } = useStore();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      className={cn(
        'cb-seq-fade sticky top-0 z-header border-b transition-[background-color,border-color] duration-slow',
        scrolled || open
          ? 'border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/80'
          : 'border-transparent bg-canvas',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="CuriousBees home" className="rounded-lg">
          <Logo showText size={30} />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const current = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-fast',
                  current ? 'text-ink' : 'text-ink-secondary hover:text-ink',
                )}
              >
                {l.label}
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-3 -bottom-px h-px origin-left bg-ink transition-transform duration-base',
                    current ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <Link href={dashboardRoute || '/dashboard'} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
              Open CuriousBees
            </Link>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
              Sign in
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="marketing-mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex size-10 items-center justify-center rounded-lg text-ink-secondary hover:bg-neutral-100 md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="marketing-mobile-nav" aria-label="Main" className="animate-fade-in border-t border-line px-4 pb-4 pt-2 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={pathname === l.href ? 'page' : undefined}
              className="flex h-12 items-center border-b border-line text-lg font-medium text-ink last:border-b-0"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
