import React from 'react';
import type { UserRole } from '@curiousbees/types';
import { Badge, type Tone } from '@/components/ui/badge';

const ROLES: Record<string, { label: string; tone: Tone }> = {
  ADMIN: { label: 'Admin', tone: 'neutral' },
  INSTITUTE_ADMIN: { label: 'Institute Admin', tone: 'neutral' },
  RESEARCH_SUPERVISOR: { label: 'Research Supervisor', tone: 'warning' },
  RESEARCH_SCHOLAR: { label: 'Research Scholar', tone: 'brand' },
};

/** Role chip used in profile cards, user tables and the account menu. */
export function RoleBadge({ role, className }: { role: UserRole; className?: string; size?: 'sm' | 'md' }) {
  const entry = ROLES[role] ?? { label: role, tone: 'neutral' as Tone };
  return (
    <Badge tone={entry.tone} className={className}>
      {entry.label}
    </Badge>
  );
}
