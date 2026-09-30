'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { SceneLabel } from './SceneLabel';
import {
  CommunityVignette,
  LeadershipVignette,
  PeopleVignette,
  ProgressVignette,
  SupervisionVignette,
  WorkspaceVignette,
} from './Vignettes';

const STEPS = [
  {
    title: 'Find the right people',
    body: 'Search researchers across faculties by name or research area, see who supervises what, and follow their work.',
    Vignette: PeopleVignette,
  },
  {
    title: 'Make supervision official',
    body: 'A scholar sends a supervision request with a research proposal. The supervisor reviews and approves it, and the relationship is recorded for the institution.',
    Vignette: SupervisionVignette,
  },
  {
    title: 'Keep the thesis moving',
    body: 'Research stages, milestones and progress reports give scholar and supervisor the same view of where the work stands and what is due next.',
    Vignette: ProgressVignette,
  },
  {
    title: 'Work in one shared place',
    body: 'Shared workspaces hold files, milestones and announcements. Meetings and messages happen in Curious Nexus, alongside the work.',
    Vignette: WorkspaceVignette,
  },
  {
    title: 'Stay in the conversation',
    body: 'A research feed for updates, papers and questions, and one calendar for conferences, workshops, seminars and thesis reviews.',
    Vignette: CommunityVignette,
  },
  {
    title: 'Give leadership a clear view',
    body: 'Research leadership manages accounts, faculties and departments, moderates content and keeps a complete audit trail of every administrative change.',
    Vignette: LeadershipVignette,
  },
];

/**
 * Scene 2 — the platform. On large screens the steps scroll past a sticky panel that
 * swaps to the matching product view; the active step is whichever crosses the middle
 * of the viewport. On small screens each view sits under its step. All text is always
 * rendered; nothing depends on scrolling to be readable.
 */
export default function StorySection() {
  const [active, setActive] = React.useState(0);
  const stepRefs = React.useRef<(HTMLLIElement | null)[]>([]);

  React.useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: '-48% 0px -48% 0px' },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="platform" aria-labelledby="platform-title" className="scroll-mt-16 border-b border-line bg-surface-muted">
      <div className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 md:pt-32">
        <SceneLabel index="02">The platform</SceneLabel>
        <h2 id="platform-title" className="mt-6 max-w-3xl font-serif text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-5xl">
          One platform, from the first request to the final thesis.
        </h2>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 pb-24 pt-8 sm:px-6 md:pb-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
        <ol className="relative">
          {/* Progress rail */}
          <span aria-hidden className="absolute bottom-0 left-[11px] top-0 hidden w-px bg-line lg:block" />
          {STEPS.map(({ title, body, Vignette }, i) => (
            <li
              key={title}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              data-index={i}
              className="relative py-10 lg:flex lg:min-h-[58vh] lg:items-center lg:py-0"
            >
              <div className="lg:pl-12">
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-0 hidden size-[23px] items-center justify-center rounded-full border font-mono text-[10px] transition-colors duration-slow lg:flex',
                    active === i ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface text-ink-muted',
                  )}
                >
                  {i + 1}
                </span>
                <p className="font-mono text-xs text-ink-muted lg:hidden">{String(i + 1).padStart(2, '0')}</p>
                <h3
                  className={cn(
                    'mt-2 text-2xl font-semibold tracking-tight transition-colors duration-slow lg:mt-0',
                    active === i ? 'text-ink' : 'text-ink lg:text-ink-muted',
                  )}
                >
                  {title}
                </h3>
                <p
                  className={cn(
                    'mt-3 max-w-md text-base leading-relaxed transition-colors duration-slow',
                    active === i ? 'text-ink-secondary' : 'text-ink-secondary lg:text-ink-muted',
                  )}
                >
                  {body}
                </p>
                <div className="mt-8 lg:hidden">
                  <Vignette />
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="relative hidden lg:block">
          <div className="sticky top-[calc(50vh-15rem)] h-[30rem]">
            <div className="mb-4 flex items-center justify-between font-mono text-xs text-ink-muted" aria-hidden>
              <span>
                {String(active + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
              </span>
              <span className="flex gap-1">
                {STEPS.map((s, i) => (
                  <span key={s.title} className={cn('h-0.5 w-6 rounded-full transition-colors duration-slow', i <= active ? 'bg-brand' : 'bg-line-strong')} />
                ))}
              </span>
            </div>
            <div className="relative">
              {STEPS.map(({ title, Vignette }, i) => (
                <div
                  key={title}
                  className={cn(
                    'absolute inset-x-0 top-0 transition-[opacity,transform] duration-scene ease-expressive motion-reduce:transition-none',
                    active === i ? 'translate-y-0 opacity-100' : i < active ? '-translate-y-3 opacity-0' : 'translate-y-3 opacity-0',
                  )}
                >
                  <Vignette />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
