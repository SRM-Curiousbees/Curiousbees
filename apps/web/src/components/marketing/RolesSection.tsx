import React from 'react';
import { Building2, Check, GraduationCap, UserCheck } from 'lucide-react';

/** What each role can do today. Keep in sync with the product; no aspirational features. */
const ROLES = [
  {
    icon: UserCheck,
    title: 'Research supervisors',
    summary: 'Guide scholars and run doctoral work in one place.',
    items: [
      'Review and approve scholar supervision requests',
      'Shared workspaces with files, milestones and announcements',
      'Schedule and join supervision meetings',
      'Post calls for scholars and collaborators',
    ],
  },
  {
    icon: GraduationCap,
    title: 'Research scholars',
    summary: 'Keep your doctoral research organised and visible.',
    items: [
      'Request a supervisor from your faculty',
      'Track milestones and progress reports',
      'Share papers, updates and research questions',
      'Find researchers across departments by research area',
    ],
  },
  {
    icon: Building2,
    title: 'Research leadership',
    summary: 'Oversee research activity across the institution.',
    items: [
      'Create accounts and assign roles',
      'Maintain faculties, departments and campuses',
      'Moderate posts and resolve reports',
      'Review a complete audit log of administrative actions',
    ],
  },
];

export default function RolesSection() {
  return (
    <section aria-labelledby="roles-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
      <h2 id="roles-title" className="max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-tight text-ink md:text-4xl">
        Built for everyone involved in doctoral research
      </h2>
      <div className="mt-12 divide-y divide-line border-y border-line">
        {ROLES.map(({ icon: Icon, title, summary, items }) => (
          <div key={title} className="grid gap-6 py-8 md:grid-cols-[280px_1fr] md:gap-10">
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-brand-700">
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-sm text-ink-secondary">{summary}</p>
            </div>
            <ul className="grid content-start gap-x-8 gap-y-3 sm:grid-cols-2">
              {items.map((item) => (
                <li key={item} className="flex gap-2.5 text-[15px] text-ink-secondary">
                  <Check className="mt-1 size-4 shrink-0 text-success-600" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
