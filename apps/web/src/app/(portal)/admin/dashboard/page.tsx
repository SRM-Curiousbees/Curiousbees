'use client';

/**
 * Institute admin overview: what needs an administrator now, then the state of
 * accounts and research activity. All figures come from the admin dashboard API.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, ChevronRight, Clock, History, RefreshCw, Settings, ShieldAlert, Users } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

type Stats = Partial<
  Record<
    | 'totalUsers'
    | 'activeScholars'
    | 'activeSupervisors'
    | 'activeAdmins'
    | 'suspendedAccounts'
    | 'activeWorkspaces'
    | 'publications'
    | 'openReports',
    number
  >
>;

const SEVERITY_TONE: Record<string, 'danger' | 'warning' | 'brand'> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
};

function humanize(value?: string) {
  const v = (value || 'info').toLowerCase().replace(/_/g, ' ');
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function formatDate(value: string) {
  const d = new Date(value);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Figure({ label, value, href, tone }: { label: string; value?: number; href: string; tone?: 'danger' | 'warning' }) {
  const n = value ?? 0;
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 bg-surface px-5 py-4 transition-colors duration-fast hover:bg-surface-muted"
    >
      <span className="text-sm text-ink-muted group-hover:text-ink-secondary">{label}</span>
      <span
        className={cn(
          'text-3xl font-semibold tabular-nums tracking-tight text-ink',
          n > 0 && tone === 'danger' && 'text-danger-700',
          n > 0 && tone === 'warning' && 'text-warning-700',
        )}
      >
        {n.toLocaleString()}
      </span>
    </Link>
  );
}

function Row({ label, value, href, tone }: { label: string; value?: number; href: string; tone?: 'danger' }) {
  const n = value ?? 0;
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors duration-fast hover:bg-surface-muted"
      >
        <span className="text-ink-secondary">{label}</span>
        <span className="flex items-center gap-2">
          <span className={cn('font-semibold tabular-nums text-ink', n > 0 && tone === 'danger' && 'text-danger-700')}>
            {n.toLocaleString()}
          </span>
          <ChevronRight className="size-4 text-ink-muted" aria-hidden />
        </span>
      </Link>
    </li>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { currentUser, fetchAdminDashboardStats, fetchAdminNeedsAttention } = useStore();

  const [stats, setStats] = useState<Stats | null>(null);
  const [needsAttention, setNeedsAttention] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'INSTITUTE_ADMIN') {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [statsData, attentionData] = await Promise.all([fetchAdminDashboardStats(), fetchAdminNeedsAttention()]);
      setStats(statsData);
      setNeedsAttention(attentionData || []);
    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = currentUser?.name?.split(' ')[0];

  return (
    <div className="animate-fade-in">
      <PageHeader
        meta="Institute Admin"
        title={firstName ? `Welcome back, ${firstName}` : 'Overview'}
        description="Accounts, research activity and the items that need an administrator."
        actions={
          <>
            <Button variant="secondary" onClick={() => loadData(true)} loading={refreshing}>
              {!refreshing && <RefreshCw aria-hidden />}
              Refresh
            </Button>
            <Link href="/admin/users" className={buttonVariants({ variant: 'primary' })}>
              <Users aria-hidden />
              Manage users
            </Link>
          </>
        }
      />

      {loading ? (
        <div role="status" aria-label="Loading overview">
          <Skeleton className="h-[104px] rounded-2xl" />
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Skeleton className="h-80 rounded-2xl xl:col-span-2" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line md:grid-cols-4">
            <Figure label="Total users" value={stats?.totalUsers} href="/admin/users" />
            <Figure label="Active scholars" value={stats?.activeScholars} href="/admin/users?tab=SCHOLARS" />
            <Figure label="Active supervisors" value={stats?.activeSupervisors} href="/admin/users?tab=SUPERVISORS" />
            <Figure label="Open reports" value={stats?.openReports} href="/admin/moderation" tone="warning" />
          </Card>

          <div className="mt-6 grid items-start gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Needs attention"
                description="Reports, security events and account reviews waiting for an administrator."
                actions={needsAttention.length > 0 && <Badge tone="warning">{needsAttention.length} open</Badge>}
              />
              {needsAttention.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Nothing needs your attention"
                  description="Open reports, security events and suspended-account reviews will appear here as they arrive."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {needsAttention.map((item) => (
                    <li key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={SEVERITY_TONE[item.severity] || 'brand'}>{humanize(item.severity)}</Badge>
                          <span className="text-sm font-semibold text-ink">{item.title}</span>
                        </div>
                        <p className="text-sm text-ink-secondary">{item.description}</p>
                        {item.timestamp && (
                          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <Clock className="size-3.5" aria-hidden />
                            <time dateTime={item.timestamp}>{formatDate(item.timestamp)}</time>
                          </p>
                        )}
                      </div>
                      <Link href={item.actionUrl} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'self-start sm:self-center')}>
                        Review
                        <ArrowRight aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader title="Accounts" />
                <ul className="divide-y divide-line">
                  <Row label="Institute admins" value={stats?.activeAdmins} href="/admin/users?tab=ADMINS" />
                  <Row label="Suspended accounts" value={stats?.suspendedAccounts} href="/admin/users?tab=SUSPENDED" tone="danger" />
                </ul>
              </Card>
              <Card>
                <CardHeader title="Research activity" />
                <ul className="divide-y divide-line">
                  <Row label="Active workspaces" value={stats?.activeWorkspaces} href="/admin/research-workspaces" />
                  <Row label="Publications" value={stats?.publications} href="/admin/publications" />
                </ul>
              </Card>
              <Card>
                <CardHeader title="Shortcuts" />
                <ul className="divide-y divide-line text-sm">
                  {[
                    { label: 'Moderation queue', href: '/admin/moderation', icon: ShieldAlert },
                    { label: 'Audit log', href: '/admin/audit', icon: History },
                    { label: 'System settings', href: '/admin/settings', icon: Settings },
                  ].map(({ label, href, icon: Icon }) => (
                    <li key={href}>
                      <Link href={href} className="flex items-center gap-3 px-5 py-3 text-ink-secondary transition-colors duration-fast hover:bg-surface-muted hover:text-ink">
                        <Icon className="size-4 text-ink-muted" aria-hidden />
                        <span className="flex-1">{label}</span>
                        <ChevronRight className="size-4 text-ink-muted" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
