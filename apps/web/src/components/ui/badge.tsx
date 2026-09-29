import * as React from 'react';
import { cn } from '@/lib/utils';

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'plum' | 'sea';

const TONES: Record<Tone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  success: 'bg-success-50 text-success-700 ring-success-200',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200',
  danger: 'bg-danger-50 text-danger-700 ring-danger-200',
  plum: 'bg-plum-50 text-plum-700 ring-plum-200',
  sea: 'bg-sea-50 text-sea-700 ring-sea-200',
};

/** Compact label for categories and states. */
export function Badge({ tone = 'neutral', className, children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[tone], className)}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * Workflow states map to one consistent treatment across the product.
 * Unknown values fall back to a neutral badge with the raw label humanised.
 */
const STATUS: Record<string, { tone: Tone; label: string }> = {
  ACTIVE: { tone: 'success', label: 'Active' },
  APPROVED: { tone: 'success', label: 'Approved' },
  PUBLISHED: { tone: 'success', label: 'Published' },
  ACCEPTED: { tone: 'success', label: 'Accepted' },
  COMPLETED: { tone: 'success', label: 'Completed' },
  PENDING: { tone: 'warning', label: 'Pending' },
  PENDING_SUPERVISOR_APPROVAL: { tone: 'warning', label: 'Awaiting supervisor' },
  REVIEW_REQUIRED: { tone: 'warning', label: 'Needs review' },
  NEEDS_INFO: { tone: 'warning', label: 'Needs info' },
  DRAFT: { tone: 'neutral', label: 'Draft' },
  ARCHIVED: { tone: 'neutral', label: 'Archived' },
  UPCOMING: { tone: 'brand', label: 'Upcoming' },
  IN_PROGRESS: { tone: 'brand', label: 'In progress' },
  OVERDUE: { tone: 'danger', label: 'Overdue' },
  ON_HOLD: { tone: 'warning', label: 'On hold' },
  NOT_STARTED: { tone: 'neutral', label: 'Not started' },
  REJECTED: { tone: 'danger', label: 'Rejected' },
  DECLINED: { tone: 'danger', label: 'Declined' },
  SUSPENDED: { tone: 'danger', label: 'Suspended' },
  DEACTIVATED: { tone: 'neutral', label: 'Deactivated' },
  RESTRICTED: { tone: 'warning', label: 'Restricted' },
  FAILED: { tone: 'danger', label: 'Failed' },
};

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const key = (status || '').toUpperCase();
  const entry = STATUS[key] || {
    tone: 'neutral' as Tone,
    label: key ? key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ') : 'Unknown',
  };
  return (
    <Badge tone={entry.tone} className={className}>
      {entry.label}
    </Badge>
  );
}
