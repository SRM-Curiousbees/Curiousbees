'use client';

import * as React from 'react';
import { Building2, Check, GraduationCap, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SceneLabel } from './SceneLabel';

/** What each role can do today. Keep in sync with the product; no aspirational features. */
const ROLES = [
  {
    id: 'supervisors',
    icon: UserCheck,
    title: 'Research supervisors',
    summary: 'Guide scholars and run doctoral work in one place.',
    items: [
      'Review and approve supervision requests from scholars',
      'Follow each scholar’s stage, milestones and progress reports',
      'Shared workspaces with files, milestones and announcements',
      'Schedule supervision meetings and message in Curious Nexus',
      'Post collaboration opportunities for scholars and colleagues',
    ],
  },
  {
    id: 'scholars',
    icon: GraduationCap,
    title: 'Research scholars',
    summary: 'Keep your doctoral research organised and visible.',
    items: [
      'Request a supervisor with your research proposal',
      'Track your research stage, milestones and progress reports',
      'Share updates, papers and research questions in the feed',
      'Find researchers across departments by research area',
      'Keep your publications on your researcher profile',
    ],
  },
  {
    id: 'leadership',
    icon: Building2,
    title: 'Research leadership',
    summary: 'Govern research activity across the institution.',
    items: [
      'Create accounts and assign roles, faculties and departments',
      'Maintain faculties, departments and campuses',
      'Moderate posts and publications, resolve reports',
      'Publish institutional announcements',
      'Review a complete audit log of administrative actions',
    ],
  },
];

/** Scene 3 — who it is for. Accessible tabs (arrow keys, Home/End). */
export default function RolesSection() {
  const [active, setActive] = React.useState(0);
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = ROLES.length - 1;
    let next = active;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = active === last ? 0 : active + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = active === 0 ? last : active - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const role = ROLES[active];

  return (
    <section aria-labelledby="roles-title" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <SceneLabel index="03">Who it is for</SceneLabel>
        <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div>
            <h2 id="roles-title" className="max-w-md font-serif text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-5xl">
              Three roles, one shared record.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-secondary">
              Everyone sees the same supervision, progress and activity, with access matched to their role and enforced by the platform.
            </p>

            <div role="tablist" aria-label="Roles" aria-orientation="vertical" onKeyDown={onKeyDown} className="mt-10 flex flex-col border-l border-line">
              {ROLES.map((r, i) => {
                const selected = active === i;
                return (
                  <button
                    key={r.id}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`role-tab-${r.id}`}
                    aria-selected={selected}
                    aria-controls={`role-panel-${r.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(i)}
                    className={cn(
                      'group relative -ml-px flex items-center gap-4 border-l-2 py-4 pl-6 text-left transition-colors duration-base',
                      selected ? 'border-brand' : 'border-transparent hover:border-line-strong',
                    )}
                  >
                    <r.icon className={cn('size-5 shrink-0 transition-colors duration-base', selected ? 'text-brand' : 'text-ink-muted group-hover:text-ink-secondary')} aria-hidden />
                    <span>
                      <span className={cn('block text-lg font-semibold transition-colors duration-base', selected ? 'text-ink' : 'text-ink-muted group-hover:text-ink')}>{r.title}</span>
                      <span className="mt-0.5 block text-sm text-ink-muted">{r.summary}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            role="tabpanel"
            id={`role-panel-${role.id}`}
            aria-labelledby={`role-tab-${role.id}`}
            tabIndex={0}
            className="relative self-start rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-10"
          >
            <div key={role.id} className="animate-rise-in">
              <p className="font-mono text-xs text-ink-muted">What you can do</p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-ink md:text-3xl">{role.title}</h3>
              <ul className="mt-8 divide-y divide-line border-y border-line">
                {role.items.map((item) => (
                  <li key={item} className="flex gap-3 py-4 text-base text-ink-secondary">
                    <Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
