'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader } from '@/components/ui/card';

type Audience = 'everyone' | 'scholar' | 'supervisor' | 'admin';

interface Question {
  q: string;
  a: React.ReactNode;
}

interface Section {
  id: string;
  title: string;
  audience: Audience[];
  questions: Question[];
}

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="font-medium text-brand underline-offset-2 hover:underline">
    {children}
  </Link>
);

// Every answer here describes how the product works today. Keep it that way when features change.
const SECTIONS: Section[] = [
  {
    id: 'account',
    title: 'Your account',
    audience: ['everyone'],
    questions: [
      {
        q: 'Who creates accounts?',
        a: 'Institute administrators add every account. There is no self sign-up. Sign in with the Google account for the email address your institution registered.',
      },
      {
        q: 'I can’t sign in, or my account is suspended',
        a: 'Contact your institute administrator. They can check that your email address is registered, change your role or department, and restore a suspended account.',
      },
      {
        q: 'Who can see my profile?',
        a: 'Only signed-in members of your institution. Profiles are not public on the web.',
      },
    ],
  },
  {
    id: 'supervision-scholar',
    title: 'Supervision',
    audience: ['scholar'],
    questions: [
      {
        q: 'How do I get a supervisor?',
        a: (
          <>
            Open a supervisor’s profile from <A href="/researchers">Researchers</A> and choose <strong>Request supervision</strong>. Add a working title, domain and a
            message. The supervisor accepts or declines; if they decline you can ask someone else. Supervisors have a limit on how many scholars they take.
          </>
        ),
      },
      {
        q: 'How do progress reports work?',
        a: (
          <>
            Once you have a supervisor, submit reports from <A href="/my-research">My research</A>. Your supervisor marks each one on track, asks for more information,
            or flags it as delayed, and their feedback appears under the report.
          </>
        ),
      },
    ],
  },
  {
    id: 'supervision-supervisor',
    title: 'Supervision',
    audience: ['supervisor'],
    questions: [
      {
        q: 'Where do I review requests and reports?',
        a: (
          <>
            In the <A href="/my-scholars">Supervision Panel</A>: <strong>Requests</strong> holds supervision requests and requests to join your opportunities, and{' '}
            <strong>Progress reports</strong> holds reports from your scholars.
          </>
        ),
      },
      {
        q: 'What happens when I accept a request to join an opportunity?',
        a: 'A shared research workspace is created for you and the scholar, with files, milestones, updates and meetings.',
      },
    ],
  },
  {
    id: 'research',
    title: 'Sharing research',
    audience: ['scholar', 'supervisor'],
    questions: [
      {
        q: 'What can I post on the feed?',
        a: 'Research updates, publications, questions, collaboration requests, achievements and announcements, with tags and an attachment. You can edit or delete your own posts, and report posts that break the rules.',
      },
      {
        q: 'How do I find people to work with?',
        a: (
          <>
            Browse <A href="/researchers">Researchers</A>, or use search (Ctrl K or ⌘K). Follow people and topics to see more of their work, or send a collaboration
            request from a post or profile. Accepted requests open a conversation in <A href="/nexus">Curious Nexus</A>.
          </>
        ),
      },
      {
        q: 'How do opportunities work?',
        a: (
          <>
            <A href="/opportunities">Opportunities</A> lists positions, projects and fellowships. Depending on the post, you apply on an external site, by email, or
            with a request to join through CuriousBees. Join requests are open to scholars in the same department as the post.
          </>
        ),
      },
    ],
  },
  {
    id: 'workspaces',
    title: 'Workspaces',
    audience: ['scholar', 'supervisor'],
    questions: [
      {
        q: 'Who can see a workspace?',
        a: 'Only its members. Uploaded files are stored privately and open through short-lived links for members only.',
      },
      {
        q: 'What can I do in a workspace?',
        a: 'Share files (uploads up to 50 MB, or links), post updates, schedule meetings on Google Meet or any external video link (Zoom, Teams), and track milestones. The workspace owner adds milestones; any member can mark one complete.',
      },
      {
        q: 'Why can’t I schedule a Google Meet meeting?',
        a: (
          <>
            Meetings are created with your own account, so connect Google Workspace first in{' '}
            <A href="/settings?tab=integrations">Settings → Connected apps</A>. You can always use an external meeting link instead without connecting an account.
          </>
        ),
      },
    ],
  },
  {
    id: 'admin',
    title: 'Administration',
    audience: ['admin'],
    questions: [
      {
        q: 'Why can’t I see the feed or workspaces?',
        a: 'Institute administrators govern the platform and don’t take part in research, so research areas are closed to admin accounts. You manage accounts, the institution structure, moderation and audit instead.',
      },
      {
        q: 'Where do reported posts show up?',
        a: (
          <>
            Posts that members report are flagged with a report count in <A href="/admin/posts">Posts</A>, where you can hide or restore them.
          </>
        ),
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    audience: ['everyone'],
    questions: [
      {
        q: 'How do I control notifications?',
        a: (
          <>
            Choose what you’re notified about in <A href="/settings?tab=notifications">Settings → Notifications</A>. Browser notifications are optional; turn them on
            when the portal asks, or in your browser’s site settings.
          </>
        ),
      },
    ],
  },
];

function audienceFor(role?: string): Audience {
  if (role === 'INSTITUTE_ADMIN') return 'admin';
  if (role === 'RESEARCH_SUPERVISOR') return 'supervisor';
  return 'scholar';
}

export default function HelpPage() {
  const role = useStore((s) => s.currentUser?.role);
  const audience = audienceFor(role);
  const sections = SECTIONS.filter((s) => s.audience.includes('everyone') || s.audience.includes(audience));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        meta="Help"
        title="How CuriousBees works"
        description="Answers about accounts, supervision, sharing research and workspaces. For anything else, contact your institute administrator."
      />

      <nav aria-label="Topics" className="mb-6 flex flex-wrap gap-2">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-line px-3 py-1 text-sm text-ink-secondary transition-colors duration-fast hover:border-line-strong hover:text-ink"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.id} id={section.id} className="scroll-mt-24">
            <CardHeader title={section.title} />
            <div className="divide-y divide-line">
              {section.questions.map((item) => (
                <details key={item.q} className="group px-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="size-4 shrink-0 text-ink-muted transition-transform duration-fast group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="pb-4 text-sm leading-relaxed text-ink-secondary">{item.a}</div>
                </details>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
