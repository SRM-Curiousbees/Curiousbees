import React from 'react';
import Link from 'next/link';
import Logo from '../Logo';

const COLUMNS = [
  { title: 'Platform', links: [['/research', 'Research'], ['/education', 'Education'], ['/institution', 'Institution'], ['/about', 'About']] },
  { title: 'Resources', links: [['/ethics-framework', 'Ethics framework'], ['/contact', 'Contact']] },
  { title: 'Legal', links: [['/privacy-policy', 'Privacy policy'], ['/terms-of-service', 'Terms of service']] },
];

export default function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo showText size={28} />
            <p className="mt-4 max-w-xs text-sm text-ink-secondary">
              The research collaboration platform for SRM Institute of Science and Technology.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-sm font-semibold text-ink">{col.title}</h3>
              <ul className="mt-3 space-y-2.5">
                {col.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-ink-secondary transition-colors hover:text-ink">{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-10 border-t border-line pt-6 text-xs text-ink-muted">
          © {new Date().getFullYear()} CuriousBees, SRM Institute of Science and Technology.
        </p>
      </div>
    </footer>
  );
}
