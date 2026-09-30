import * as React from 'react';
import MarketingNavbar from './MarketingNavbar';
import MarketingFooter from './MarketingFooter';
import CTASection from './CTASection';

/** Shell for the public inner pages: navbar, editorial header, content, optional closing CTA, footer. */
export function MarketingPage({
  label,
  title,
  intro,
  children,
  cta = true,
}: {
  label: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  children: React.ReactNode;
  cta?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-toast focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Skip to content
      </a>
      <MarketingNavbar />
      <main id="main-content" className="flex-1">
        <header className="border-b border-line">
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-32 sm:px-6 md:pb-20 md:pt-40">
            <p className="flex items-center gap-3 font-mono text-xs text-ink-muted">
              <span aria-hidden className="h-px w-8 bg-line-strong" />
              {label}
            </p>
            <h1 className="mt-6 max-w-3xl font-serif text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-6xl">{title}</h1>
            {intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-secondary">{intro}</p>}
          </div>
        </header>
        {children}
        {cta && <CTASection />}
      </main>
      <MarketingFooter />
    </div>
  );
}

/** A titled list of short points, laid out on hairlines like the landing page. */
export function PointGrid({
  title,
  points,
  muted = false,
}: {
  title?: string;
  points: { title: string; body: React.ReactNode }[];
  muted?: boolean;
}) {
  return (
    <section className={muted ? 'border-b border-line bg-surface-muted' : 'border-b border-line'}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        {title && <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h2>}
        <ul className={title ? 'mt-12 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3' : 'grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3'}>
          {points.map((p) => (
            <li key={p.title} className="border-t border-line-strong pt-6">
              <h3 className="text-lg font-semibold tracking-tight text-ink">{p.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-ink-secondary">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Long-form text (policies). Plain headings and lists with comfortable measure. */
export function Prose({ children, updated }: { children: React.ReactNode; updated?: string }) {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
        {updated && <p className="mb-10 text-sm text-ink-muted">Last updated {updated}</p>}
        <div className="space-y-5 text-base leading-relaxed text-ink-secondary [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:font-medium [&_a]:text-brand [&_a:hover]:underline">
          {children}
        </div>
      </div>
    </section>
  );
}
