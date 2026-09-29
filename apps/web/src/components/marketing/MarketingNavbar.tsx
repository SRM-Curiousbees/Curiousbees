'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import Logo from '../Logo';
import { buttonVariants } from '@/components/ui/button';

const LINKS = [
  { href: '/research', label: 'Research' },
  { href: '/education', label: 'Education' },
  { href: '/institution', label: 'Institution' },
  { href: '/about', label: 'About' },
];

export default function MarketingNavbar() {
  const { currentUser, dashboardRoute } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-header border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="CuriousBees home" className="rounded-lg">
          <Logo showText size={30} />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-ink-secondary transition-colors hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <Link href={dashboardRoute || '/feed'} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
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
            className="flex size-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-neutral-100 md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="marketing-mobile-nav" aria-label="Main" className="border-t border-line px-4 py-2 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2.5 text-base font-medium text-ink-secondary hover:bg-neutral-100 hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
