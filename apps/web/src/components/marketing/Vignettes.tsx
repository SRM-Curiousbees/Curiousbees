import * as React from 'react';
import { Check, FileText, Search, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Abstracted product views for the public story. They use the product's real labels
 * (stages, categories, statuses, audit actions) and neutral bars in place of names,
 * titles and numbers, so nothing reads as fabricated data. Decorative: aria-hidden.
 */

function Frame({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden className={cn('overflow-hidden rounded-2xl border border-line bg-surface shadow-xl', className)}>
      <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-2.5">
        <span className="font-mono text-2xs text-ink-muted">{title}</span>
        <span className="flex gap-1">
          <span className="size-1.5 rounded-full bg-line-strong" />
          <span className="size-1.5 rounded-full bg-line-strong" />
          <span className="size-1.5 rounded-full bg-line-strong" />
        </span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function Bar({ w, className }: { w: string; className?: string }) {
  return <span className={cn('block h-2 rounded-full bg-neutral-200', className)} style={{ width: w }} />;
}

function Avatar({ tone = 'brand' }: { tone?: 'brand' | 'sea' | 'plum' | 'warning' }) {
  const tones = {
    brand: 'bg-brand-100 ring-brand-200',
    sea: 'bg-sea-100 ring-sea-200',
    plum: 'bg-plum-100 ring-plum-200',
    warning: 'bg-warning-100 ring-warning-200',
  };
  return <span className={cn('size-8 shrink-0 rounded-full ring-1 ring-inset', tones[tone])} />;
}

function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'sea' | 'plum' | 'danger' }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
    brand: 'bg-brand-50 text-brand-800 ring-brand-200',
    success: 'bg-success-50 text-success-700 ring-success-200',
    warning: 'bg-warning-50 text-warning-700 ring-warning-200',
    sea: 'bg-sea-50 text-sea-700 ring-sea-200',
    plum: 'bg-plum-50 text-plum-700 ring-plum-200',
    danger: 'bg-danger-50 text-danger-700 ring-danger-200',
  };
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone])}>{children}</span>;
}

function Btn({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium',
        primary ? 'bg-brand text-white' : 'border border-line-strong bg-surface text-ink',
      )}
    >
      {children}
    </span>
  );
}

export function PeopleVignette() {
  return (
    <Frame title="Researchers">
      <div className="flex h-9 items-center gap-2 rounded-lg border border-line-strong px-3 text-sm text-ink-muted">
        <Search className="size-4" />
        Search by name or research area
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip tone="brand">All faculties</Chip>
        <Chip>Supervisors</Chip>
        <Chip>Scholars</Chip>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {(['brand', 'sea', 'plum'] as const).map((tone, i) => (
          <li key={tone} className="flex items-center gap-3 py-3">
            <Avatar tone={tone} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Bar w={['46%', '38%', '52%'][i]} className="bg-neutral-300" />
              <Bar w={['64%', '58%', '44%'][i]} />
            </div>
            <Btn>{i === 1 ? 'Following' : 'Follow'}</Btn>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function SupervisionVignette() {
  return (
    <Frame title="Supervision Panel · Requests">
      <div className="flex items-center gap-3">
        <Avatar tone="sea" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Bar w="42%" className="bg-neutral-300" />
          <Bar w="30%" />
        </div>
        <Chip tone="warning">Awaiting supervisor</Chip>
      </div>
      <div className="mt-4 rounded-xl border border-line bg-surface-muted p-3.5">
        <p className="text-xs text-ink-muted">Research proposal</p>
        <div className="mt-2 space-y-1.5">
          <Bar w="92%" className="bg-neutral-300" />
          <Bar w="84%" />
          <Bar w="60%" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip tone="brand">Research domain</Chip>
          <Chip>Research topic</Chip>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Btn primary>
          <Check className="size-4" />
          Approve
        </Btn>
        <Btn>Decline</Btn>
      </div>
    </Frame>
  );
}

const STAGES = ['Proposal', 'Literature review', 'Methodology', 'Implementation', 'Evaluation', 'Thesis'];

export function ProgressVignette() {
  return (
    <Frame title="My research">
      <ol className="grid grid-cols-6 gap-1.5">
        {STAGES.map((stage, i) => (
          <li key={stage} className="space-y-1.5">
            <span className={cn('block h-1.5 rounded-full', i < 2 ? 'bg-success-500' : i === 2 ? 'bg-brand' : 'bg-neutral-200')} />
            <span className={cn('block truncate text-[10px] leading-tight', i === 2 ? 'font-medium text-ink' : 'text-ink-muted')}>{stage}</span>
          </li>
        ))}
      </ol>
      <ul className="mt-5 divide-y divide-line">
        {[
          { label: 'Literature review', status: 'Completed', tone: 'success' as const },
          { label: 'Methodology chapter', status: 'In progress', tone: 'brand' as const },
          { label: 'Progress report', status: 'Upcoming', tone: 'neutral' as const },
        ].map((m) => (
          <li key={m.label} className="flex items-center justify-between gap-3 py-3">
            <span className={cn('text-sm', m.status === 'Completed' ? 'text-ink-muted line-through' : 'font-medium text-ink')}>{m.label}</span>
            <Chip tone={m.tone}>{m.status}</Chip>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function WorkspaceVignette() {
  return (
    <Frame title="Shared workspace">
      <div className="flex gap-4 border-b border-line text-sm">
        <span className="-mb-px border-b-2 border-brand pb-2 font-medium text-ink">Files</span>
        <span className="pb-2 text-ink-muted">Milestones</span>
        <span className="pb-2 text-ink-muted">Announcements</span>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {['58%', '44%', '66%'].map((w, i) => (
          <li key={w} className="flex items-center gap-3 py-3">
            <FileText className="size-4 shrink-0 text-ink-muted" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Bar w={w} className="bg-neutral-300" />
              <Bar w={['24%', '30%', '20%'][i]} />
            </div>
            <span className="text-xs text-ink-muted">PDF</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-surface-muted px-3.5 py-3">
        <Video className="size-4 text-brand" />
        <span className="flex-1 text-sm text-ink">Supervision meeting</span>
        <Chip tone="brand">Meeting link</Chip>
      </div>
    </Frame>
  );
}

export function CommunityVignette() {
  return (
    <Frame title="Research feed · Events">
      <div className="space-y-3">
        {[
          { chip: 'Research update', tone: 'brand' as const },
          { chip: 'Publication', tone: 'plum' as const },
        ].map((post) => (
          <div key={post.chip} className="rounded-xl border border-line p-3.5">
            <div className="flex items-center gap-2.5">
              <Avatar />
              <div className="flex-1 space-y-1.5">
                <Bar w="36%" className="bg-neutral-300" />
                <Bar w="24%" />
              </div>
            </div>
            <div className="mt-3">
              <Chip tone={post.tone}>{post.chip}</Chip>
            </div>
            <div className="mt-2.5 space-y-1.5">
              <Bar w="88%" className="bg-neutral-300" />
              <Bar w="70%" />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Chip tone="brand">Conferences</Chip>
          <Chip tone="sea">Workshops</Chip>
          <Chip tone="plum">Seminars &amp; talks</Chip>
          <Chip tone="warning">Thesis &amp; PhD</Chip>
        </div>
      </div>
    </Frame>
  );
}

export function LeadershipVignette() {
  return (
    <Frame title="Institute admin · Overview">
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {['Active scholars', 'Supervisors', 'Open reports'].map((label, i) => (
          <div key={label} className="bg-surface p-3">
            <p className="truncate text-[11px] text-ink-muted">{label}</p>
            <span className={cn('mt-2 block h-4 rounded bg-neutral-300', ['w-10', 'w-8', 'w-5'][i])} />
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-muted">Audit log</p>
      <ul className="mt-1 divide-y divide-line">
        {['Account created', 'Role changed', 'Department updated', 'Post hidden'].map((action, i) => (
          <li key={action} className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-sm text-ink">{action}</span>
            <Bar w={['22%', '18%', '26%', '20%'][i]} />
          </li>
        ))}
      </ul>
    </Frame>
  );
}
