'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SwitchRow } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const RANGES = [
  { id: '7D', label: '7 days' },
  { id: '30D', label: '30 days' },
  { id: '6M', label: '6 months' },
  { id: '1Y', label: '1 year' },
] as const;

function bucketLabel(date: string, bucket: string) {
  const d = new Date(`${date}T00:00:00Z`);
  if (isNaN(d.getTime())) return date;
  if (bucket === 'month') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** Platform size and activity, from counts the API computes. */
export default function AdminAnalyticsPage() {
  const fetchAdminAnalytics = useStore((s) => s.fetchAdminAnalytics);
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('30D');
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [hideEmpty, setHideEmpty] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState('loading');
    fetchAdminAnalytics(range)
      .then((res: any) => {
        if (!active) return;
        if (res) {
          setData(res);
          setState('ready');
        } else setState('error');
      })
      .catch(() => active && setState('error'));
    return () => {
      active = false;
    };
  }, [range, reloadKey, fetchAdminAnalytics]);

  const timeline: { date: string; users: number; posts: number }[] = data?.timeline || [];
  const bucket: string = data?.timelineBucket || 'day';
  const maxValue = Math.max(1, ...timeline.map((t) => t.users + t.posts));
  const labelEvery = Math.max(1, Math.ceil(timeline.length / 6));
  const periodTotals = timeline.reduce((acc, t) => ({ users: acc.users + t.users, posts: acc.posts + t.posts }), { users: 0, posts: 0 });

  const departments = useMemo(() => {
    const list = [...(data?.departmentActivity || [])].sort((a: any, b: any) => b.userCount - a.userCount || a.name.localeCompare(b.name));
    return hideEmpty ? list.filter((d: any) => d.userCount > 0) : list;
  }, [data, hideEmpty]);

  const s = data?.summary;
  const figures = s
    ? [
        { label: 'People', value: s.totalUsers, detail: `${s.totalScholars} scholars · ${s.totalSupervisors} supervisors · ${s.totalAdmins} admins` },
        { label: 'Feed posts', value: s.totalPosts },
        { label: 'Publications', value: s.totalPublications },
        { label: 'Workspaces', value: s.totalWorkspaces },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        meta="Insight & audit"
        title="Institutional analytics"
        description="How many people use CuriousBees, what they share, and where they sit in the institution."
        actions={
          <div role="radiogroup" aria-label="Time range" className="inline-flex rounded-lg border border-line bg-surface-muted p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={range === r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  'h-8 rounded-md px-3 text-sm transition-colors duration-fast',
                  range === r.id ? 'bg-surface font-medium text-ink shadow-xs' : 'text-ink-muted hover:text-ink',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {state === 'loading' && !data ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : state === 'error' || !data ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="Analytics could not be loaded"
            action={
              <Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : (
        <div className={cn('space-y-6 transition-opacity duration-base', state === 'loading' && 'opacity-60')}>
          <Card>
            <dl className="grid grid-cols-2 lg:grid-cols-4">
              {figures.map((f, i) => (
                <div key={f.label} className={cn('px-5 py-4', i > 0 && 'lg:border-l lg:border-line', i % 2 === 1 && 'border-l border-line', i >= 2 && 'border-t border-line lg:border-t-0')}>
                  <dt className="text-sm text-ink-muted">{f.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{f.value}</dd>
                  {f.detail && <dd className="mt-0.5 text-xs text-ink-muted">{f.detail}</dd>}
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="New people and posts"
              description={`${periodTotals.users} people joined and ${periodTotals.posts} posts were shared in the last ${RANGES.find((r) => r.id === range)?.label}, per ${bucket}.`}
              actions={
                <div className="hidden items-center gap-4 text-xs text-ink-muted sm:flex" aria-hidden>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-brand" /> People
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-sea" /> Posts
                  </span>
                </div>
              }
            />
            <div className="px-5 pb-4 pt-6">
              <div className="flex h-44 items-end gap-1" aria-hidden>
                {timeline.map((t) => (
                  <div key={t.date} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${bucketLabel(t.date, bucket)}: ${t.users} people, ${t.posts} posts`}>
                    {t.posts > 0 && <div className="w-full rounded-t-sm bg-sea" style={{ height: `${(t.posts / maxValue) * 100}%` }} />}
                    {t.users > 0 && <div className={cn('w-full bg-brand', t.posts === 0 && 'rounded-t-sm')} style={{ height: `${(t.users / maxValue) * 100}%` }} />}
                    {t.users + t.posts === 0 && <div className="h-px w-full bg-line" />}
                  </div>
                ))}
              </div>
              {/* One label per group of bars, so each has room. */}
              <div className="mt-2 flex text-2xs text-ink-muted" aria-hidden>
                {Array.from({ length: Math.ceil(timeline.length / labelEvery) }, (_, g) => {
                  const group = timeline.slice(g * labelEvery, (g + 1) * labelEvery);
                  return (
                    <span key={group[0].date} className="min-w-0 truncate whitespace-nowrap" style={{ flex: group.length }}>
                      {bucketLabel(group[0].date, bucket)}
                    </span>
                  );
                })}
              </div>
              <table className="sr-only">
                <caption>New people and posts per {bucket}</caption>
                <thead>
                  <tr>
                    <th scope="col">Period starting</th>
                    <th scope="col">People</th>
                    <th scope="col">Posts</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((t) => (
                    <tr key={t.date}>
                      <td>{bucketLabel(t.date, bucket)}</td>
                      <td>{t.users}</td>
                      <td>{t.posts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="People by department" description="Accounts, supervisors and scholars assigned to each department." />
            <div className="border-b border-line px-5">
              <SwitchRow checked={hideEmpty} onChange={setHideEmpty} label="Hide departments with no accounts" />
            </div>
            {departments.length === 0 ? (
              <EmptyState icon={BarChart3} title="No departments have accounts yet" />
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">People by department</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface-muted text-xs text-ink-secondary">
                      <th scope="col" className="px-4 py-2.5 font-medium">Department</th>
                      <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Supervisors</th>
                      <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Scholars</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Accounts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {departments.map((d: any) => (
                      <tr key={d.id || d.code}>
                        <td className="max-w-[20rem] px-4 py-3">
                          <p className="truncate font-medium text-ink">{d.name}</p>
                          <p className="truncate text-xs text-ink-muted">
                            {d.code}
                            {d.facultyName ? ` · ${d.facultyName}` : ''}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-muted sm:hidden">
                            {d.supervisorCount} {d.supervisorCount === 1 ? 'supervisor' : 'supervisors'} · {d.scholarCount}{' '}
                            {d.scholarCount === 1 ? 'scholar' : 'scholars'}
                          </p>
                        </td>
                        <td className="hidden px-4 py-3 text-right tabular-nums text-ink-secondary sm:table-cell">{d.supervisorCount}</td>
                        <td className="hidden px-4 py-3 text-right tabular-nums text-ink-secondary sm:table-cell">{d.scholarCount}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums text-ink">{d.userCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
