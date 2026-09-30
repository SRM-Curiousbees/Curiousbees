import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import ResearchNetwork from './ResearchNetwork';

const seq = (ms: number) => ({ '--seq': `${ms}ms` }) as React.CSSProperties;

/**
 * Scene 0 — identity. The opening sequence is CSS-only (globals.css: .cb-seq,
 * .cb-line, .cb-net-*), so the headline is in the server HTML and paints without
 * waiting for JavaScript.
 */
export default function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden border-b border-line">
      {/* Architectural grid, strongest behind the figure */}
      <div
        aria-hidden
        className="cb-seq-fade pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(var(--line)/0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--line)/0.6)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_72%_45%,black_10%,transparent_65%)]"
      />

      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl grid-cols-1 items-center gap-8 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-4 lg:pb-24 lg:pt-6">
        <div className="max-w-2xl">
          <p className="cb-seq flex items-center gap-2 font-mono text-xs text-ink-muted" style={seq(120)}>
            <span aria-hidden className="size-1.5 rounded-full bg-gold" />
            SRM Institute of Science and Technology
          </p>

          <h1
            id="hero-title"
            className="mt-6 font-serif text-[44px] font-semibold leading-[1.05] tracking-[-0.025em] text-ink sm:text-6xl lg:text-[72px] lg:leading-[1.02]"
          >
            <span className="cb-line">
              <span style={seq(220)}>Where research</span>
            </span>
            <span className="cb-line">
              <span style={seq(340)}>
                finds its <em className="font-normal italic text-brand">network.</em>
              </span>
            </span>
          </h1>

          <p className="cb-seq mt-7 max-w-xl text-lg leading-relaxed text-ink-secondary" style={seq(520)}>
            CuriousBees brings research supervisors, doctoral scholars and research leadership onto one platform:
            supervision, shared workspaces, milestones and research conversations in one institutional record.
          </p>

          <div className="cb-seq mt-9 flex flex-wrap items-center gap-3" style={seq(640)}>
            <Link href="/login" className={cn(buttonVariants({ size: 'lg' }), 'group')}>
              Sign in
              <ArrowRight aria-hidden className="transition-transform duration-fast group-hover:translate-x-0.5" />
            </Link>
            <a href="#platform" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
              See how it works
            </a>
          </div>

          <p className="cb-seq mt-10 text-sm text-ink-muted" style={seq(760)}>
            Accounts are created by SRMIST. Sign in with the Google account for your registered email.
          </p>
        </div>

        <figure className="relative mx-auto w-full max-w-[520px] lg:max-w-none">
          <ResearchNetwork className="h-auto w-full" />
          <figcaption className="cb-seq-fade -mt-2 text-center font-mono text-2xs text-ink-muted lg:text-right" style={seq(1700)}>
            Fig. 01 · How work connects on CuriousBees (illustrative)
          </figcaption>
        </figure>
      </div>

      <a
        href="#why"
        aria-label="Scroll to learn more"
        className="cb-seq-fade absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 rounded-lg px-2 py-1 text-xs text-ink-muted transition-colors hover:text-ink lg:flex"
        style={seq(1200)}
      >
        <span aria-hidden>Scroll</span>
        <span aria-hidden className="relative h-10 w-px overflow-hidden bg-line">
          <span className="cb-scroll-cue absolute inset-0 bg-ink-muted" />
        </span>
      </a>
    </section>
  );
}
