import React from 'react';
import Link from 'next/link';
import Logo from '../Logo';
import { NetworkMark } from '@/components/brand/network-mark';

const COLUMNS = [
  { title: 'Platform', links: [['/research', 'For scholars'], ['/education', 'For supervisors'], ['/institution', 'For institutions'], ['/about', 'About']] },
  { title: 'Resources', links: [['/ethics-framework', 'Ethics framework'], ['/contact', 'Contact']] },
  { title: 'Legal', links: [['/privacy-policy', 'Privacy policy'], ['/terms-of-service', 'Terms of service']] },
];

export default function MarketingFooter() {
  return (
    <footer className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 md:col-span-1">
            <Logo showText size={28} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-secondary">
              The research collaboration platform for SRM Institute of Science and Technology.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-semibold text-ink">{col.title}</h2>
              <ul className="mt-3 space-y-2.5">
                {col.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-ink-secondary transition-colors duration-fast hover:text-ink">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-muted">© {new Date().getFullYear()} CuriousBees · SRM Institute of Science and Technology</p>
          <NetworkMark size={28} className="opacity-80" />
        </div>
      </div>
    </footer>
  );
}
