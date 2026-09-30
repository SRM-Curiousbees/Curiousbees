'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitMerge, RefreshCw, Search } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiFetch, readApiError } from '@/lib/api-client';
import { getProfileImageUrl, handleAvatarError } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { DetailItem } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

function formatDate(value?: string | null) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function Person({ person }: { person?: any }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <img
        src={getProfileImageUrl(person)}
        alt=""
        referrerPolicy="no-referrer"
        onError={(e) => handleAvatarError(e, person?.name)}
        className="size-8 shrink-0 rounded-full border border-line bg-surface-muted object-cover"
      />
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{person?.name || person?.email || 'Unknown'}</p>
        {person?.email && person?.name && <p className="truncate text-xs text-ink-muted">{person.email}</p>}
      </div>
    </div>
  );
}

/**
 * Every scholar–supervisor supervision request in the institution. Read-only:
 * supervisors decide on their own requests.
 */
export default function AdminScholarRequestsPage() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'INSTITUTE_ADMIN';

  const [requests, setRequests] = useState<any[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    if (currentUser && !isAdmin) router.replace('/dashboard');
  }, [currentUser, isAdmin, router]);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await apiFetch('/api/supervisor-requests');
      if (!res.ok) throw new Error((await readApiError(res)) || 'Requests could not be loaded.');
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
      setState('ready');
    } catch (e: any) {
      setError(e?.message || 'Requests could not be loaded.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const counts = useMemo(
    () => ({
      ALL: requests.length,
      PENDING: requests.filter((r) => r.status === 'PENDING').length,
      APPROVED: requests.filter((r) => r.status === 'APPROVED').length,
      REJECTED: requests.filter((r) => r.status === 'REJECTED').length,
    }),
    [requests],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (filter !== 'ALL' && r.status !== filter) return false;
      if (!q) return true;
      return [r.scholar?.name, r.scholar?.email, r.supervisor?.name, r.supervisor?.email, r.proposalTitle].join(' ').toLowerCase().includes(q);
    });
  }, [requests, query, filter]);

  if (!isAdmin) return null;

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'REJECTED', label: 'Declined' },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        meta="Research governance"
        title="Supervision requests"
        description="Every request a scholar has sent to a supervisor, across the institution. Supervisors accept or decline their own requests."
        actions={
          <Button variant="secondary" onClick={load} disabled={state === 'loading'}>
            <RefreshCw className={cn(state === 'loading' && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Status" className="inline-flex w-fit rounded-lg border border-line bg-surface-muted p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'h-8 rounded-md px-3 text-sm transition-colors duration-fast',
                filter === f.id ? 'bg-surface font-medium text-ink shadow-xs' : 'text-ink-muted hover:text-ink',
              )}
            >
              {f.label} <span className="tabular-nums text-ink-muted">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scholar or supervisor"
            aria-label="Search requests"
            className="cb-input pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {state === 'loading' && requests.length === 0 ? (
          <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading requests">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : state === 'error' ? (
          <EmptyState
            icon={GitMerge}
            title="Requests could not be loaded"
            description={error}
            action={
              <Button variant="secondary" onClick={load}>
                Try again
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={GitMerge}
            title={requests.length === 0 ? 'No supervision requests yet' : 'No requests match'}
            description={
              requests.length === 0
                ? 'Requests appear here when scholars ask a supervisor to supervise them.'
                : 'Try another search or status.'
            }
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Supervision requests</caption>
              <thead>
                <tr className="border-b border-line bg-surface-muted text-xs text-ink-secondary">
                  <th scope="col" className="px-4 py-2.5 font-medium">Scholar</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Supervisor</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Status</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">Sent</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">Decided</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((r) => (
                  <tr key={r.id} className="transition-colors duration-fast hover:bg-surface-muted">
                    <td className="max-w-[18rem] px-4 py-3">
                      <Person person={r.scholar} />
                      <div className="mt-1.5 space-y-1 text-xs text-ink-muted md:hidden">
                        <p className="truncate">To {r.supervisor?.name || r.supervisor?.email}</p>
                        <div className="sm:hidden">
                          <StatusBadge status={r.status} />
                        </div>
                      </div>
                    </td>
                    <td className="hidden max-w-[16rem] px-4 py-3 md:table-cell">
                      <Person person={r.supervisor} />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-ink-muted lg:table-cell">{formatDate(r.createdAt)}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-ink-muted lg:table-cell">{formatDate(r.respondedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Supervision request"
        description={selected ? `Sent ${formatDate(selected.createdAt)}` : undefined}
        footer={<Button onClick={() => setSelected(null)}>Close</Button>}
      >
        {selected && (
          <div className="space-y-5">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem label="Scholar">{selected.scholar?.name || selected.scholar?.email}</DetailItem>
              <DetailItem label="Supervisor">{selected.supervisor?.name || selected.supervisor?.email}</DetailItem>
              <DetailItem label="Status">
                <StatusBadge status={selected.status} />
              </DetailItem>
              <DetailItem label="Decided">{formatDate(selected.respondedAt)}</DetailItem>
              {selected.proposalTitle && (
                <DetailItem label="Working title" className="sm:col-span-2">
                  {selected.proposalTitle}
                </DetailItem>
              )}
              {selected.researchDomain && <DetailItem label="Domain">{selected.researchDomain}</DetailItem>}
              {selected.researchTopic && <DetailItem label="Topic">{selected.researchTopic}</DetailItem>}
            </dl>
            {selected.message && (
              <div>
                <p className="text-xs text-ink-muted">Message</p>
                <blockquote className="mt-1 whitespace-pre-line border-l-2 border-line-strong pl-3 text-sm text-ink-secondary">{selected.message}</blockquote>
              </div>
            )}
            {selected.rejectionReason && (
              <div>
                <p className="text-xs text-ink-muted">Reason given</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-secondary">{selected.rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
