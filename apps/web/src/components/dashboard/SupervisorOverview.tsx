'use client';

/**
 * Supervisor overview: what needs you now, how your scholars are doing, what is
 * coming up, then people and profile. Every figure comes from existing APIs.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Calendar, CheckCircle2, ChevronRight, FileText, FolderGit2, Inbox, User, Users } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { handleAvatarError } from '@/lib/avatar';
import { eventCategory } from '@/lib/event-categories';
import { PageHeader } from '@/components/ui/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge, type Tone } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

const REPORT_TONE: Record<string, { label: string; tone: Tone }> = {
  APPROVED: { label: 'On track', tone: 'success' },
  PENDING: { label: 'Needs review', tone: 'warning' },
  NEEDS_INFO: { label: 'Info requested', tone: 'brand' },
  REJECTED: { label: 'Delayed', tone: 'danger' },
};

function Avatar({ src }: { src?: string | null }) {
  return src ? (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={(e) => handleAvatarError(e)}
      className="size-9 shrink-0 rounded-full border border-line bg-surface-muted object-cover"
    />
  ) : (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-muted">
      <User className="size-4" aria-hidden />
    </span>
  );
}

function eventDate(value?: string) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

export function SupervisorOverview() {
  const {
    currentUser,
    myScholars,
    reports,
    pendingApprovals,
    collaborationRequests,
    workspaces,
    publications,
    events,
    fetchMyScholars,
    fetchReports,
    fetchPendingApprovals,
    fetchCollaborationRequests,
    fetchWorkspaces,
    fetchPublications,
    fetchEvents,
    fetchSuggestedPeers,
    connectWithPeer,
  } = useStore();

  const [peers, setPeers] = useState<any[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!currentUser || loaded.current) return;
    loaded.current = true;
    Promise.allSettled([
      fetchMyScholars(),
      fetchReports(),
      fetchPendingApprovals(),
      fetchCollaborationRequests(),
      fetchWorkspaces(),
      fetchPublications(currentUser.id),
      fetchEvents(),
    ]);
    fetchSuggestedPeers().then((data) => setPeers(data || []));
  }, [currentUser, fetchMyScholars, fetchReports, fetchPendingApprovals, fetchCollaborationRequests, fetchWorkspaces, fetchPublications, fetchEvents, fetchSuggestedPeers]);

  const pendingReports = reports.filter((r) => r.status === 'PENDING');
  const pendingCollabs = (collaborationRequests || []).filter((r: any) => r.status === 'PENDING');
  const attention = [
    { count: pendingApprovals?.length || 0, label: 'supervision request', href: '/my-scholars?tab=requests', icon: Inbox },
    { count: pendingReports.length, label: 'progress report to review', href: '/my-scholars?tab=reports', icon: FileText },
    { count: pendingCollabs.length, label: 'collaboration request', href: '/my-scholars?tab=requests', icon: Users },
  ].filter((a) => a.count > 0);

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (events || [])
      .map((e) => ({ ...e, _date: eventDate(e.date) }))
      .filter((e) => e._date && e._date >= today)
      .sort((a, b) => a._date!.getTime() - b._date!.getTime())
      .slice(0, 4);
  }, [events]);

  const profileChecks = [
    { label: 'Department', done: !!currentUser?.department },
    { label: 'Research interests', done: (currentUser?.interests?.length || 0) > 0 },
    { label: 'Short bio', done: !!currentUser?.bio },
    { label: 'First publication', done: publications.length > 0 },
  ];
  const completed = profileChecks.filter((c) => c.done).length;

  const handleConnect = async (peerId: string) => {
    setConnecting(peerId);
    const status = await connectWithPeer(peerId);
    if (status) setPeers((list) => list.map((p) => (p.id === peerId ? { ...p, connected: status } : p)));
    setConnecting(null);
  };

  const firstName = currentUser?.name?.replace(/^(dr\.?|prof\.?)\s+/i, '').split(' ')[0];

  return (
    <div>
      <PageHeader
        meta={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        title={firstName ? `Welcome back, ${firstName}` : 'Overview'}
        description="What needs your attention, how your scholars are progressing, and what is coming up."
        actions={
          <Link href="/my-scholars" className={buttonVariants({ variant: 'primary' })}>
            Supervision Panel
            <ArrowRight aria-hidden />
          </Link>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Level 1: what needs you now */}
          {attention.length > 0 ? (
            <Card className="border-warning-200">
              <CardHeader title="Needs your attention" actions={<Badge tone="warning">{attention.reduce((n, a) => n + a.count, 0)} open</Badge>} />
              <ul className="divide-y divide-line">
                {attention.map((a) => (
                  <li key={a.label}>
                    <Link href={a.href} className="group flex items-center gap-3 px-5 py-3.5 transition-colors duration-fast hover:bg-surface-muted">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-warning-50 text-warning-700">
                        <a.icon className="size-4" aria-hidden />
                      </span>
                      <span className="flex-1 text-sm text-ink">
                        <span className="font-semibold tabular-nums">{a.count}</span> {a.label}
                        {a.count === 1 ? '' : 's'}
                      </span>
                      <ChevronRight className="size-4 text-ink-muted transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-success-200 bg-success-50 px-5 py-4 text-sm">
              <CheckCircle2 className="size-5 shrink-0 text-success-600" aria-hidden />
              <p className="text-success-800">
                <span className="font-medium">You&apos;re up to date.</span> No requests or reports are waiting for you.
              </p>
            </div>
          )}

          {/* Level 2: what is changing */}
          <Card>
            <CardHeader
              title="Your scholars"
              description="Latest progress report from each scholar you supervise."
              actions={
                <Link href="/my-scholars" className="text-sm font-medium text-brand hover:underline">
                  View all
                </Link>
              }
            />
            {myScholars.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No scholars yet"
                description="Scholars appear here once you approve their supervision request."
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-line">
                {myScholars.slice(0, 6).map((scholar) => {
                  const latest = reports
                    .filter((r) => r.scholarId === scholar.id)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                  const status = latest ? REPORT_TONE[latest.status] : null;
                  return (
                    <li key={scholar.id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar src={scholar.image} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{scholar.name}</p>
                        <p className="truncate text-sm text-ink-muted">{latest ? latest.title : 'No progress report yet'}</p>
                      </div>
                      {status && <Badge tone={status.tone}>{status.label}</Badge>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Level 3: what is happening soon */}
          <Card>
            <CardHeader
              title="Coming up"
              actions={
                <Link href="/events" className="text-sm font-medium text-brand hover:underline">
                  Calendar
                </Link>
              }
            />
            {upcoming.length === 0 ? (
              <EmptyState icon={Calendar} title="Nothing scheduled" description="Upcoming conferences, workshops and thesis reviews will appear here." className="py-8" />
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((event) => {
                  const cat = eventCategory(event.eventType || event.category);
                  return (
                    <li key={event.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-line py-1">
                        <span className="text-[10px] font-medium uppercase text-danger-600">
                          {event._date!.toLocaleDateString(undefined, { month: 'short' })}
                        </span>
                        <span className="text-base font-semibold tabular-nums leading-tight text-ink">{event._date!.getDate()}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{event.title}</p>
                        <p className="truncate text-sm text-ink-muted">{[event.time, event.venue].filter(Boolean).join(' · ')}</p>
                      </div>
                      {cat && <Badge tone={cat.tone === 'success' ? 'success' : cat.tone}>{cat.label}</Badge>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Level 4–5: explore and manage */}
        <div className="space-y-6">
          <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line">
            <Link href="/workspace" className="group bg-surface px-5 py-4 transition-colors duration-fast hover:bg-surface-muted">
              <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                <FolderGit2 className="size-4" aria-hidden />
                Workspaces
              </span>
              <span className="mt-1 block text-2xl font-semibold tabular-nums text-ink">{workspaces.length}</span>
            </Link>
            <Link href="/publications" className="group bg-surface px-5 py-4 transition-colors duration-fast hover:bg-surface-muted">
              <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                <BookOpen className="size-4" aria-hidden />
                Publications
              </span>
              <span className="mt-1 block text-2xl font-semibold tabular-nums text-ink">{publications.length}</span>
            </Link>
          </Card>

          <Card>
            <CardHeader
              title="Your profile"
              description={`${completed} of ${profileChecks.length} details added`}
              actions={
                <Link href="/profile" className="text-sm font-medium text-brand hover:underline">
                  Edit
                </Link>
              }
            />
            <div className="px-5 pt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuemin={0} aria-valuemax={profileChecks.length} aria-valuenow={completed} aria-label="Profile completeness">
                <div className="h-full rounded-full bg-brand transition-[width] duration-slow" style={{ width: `${(completed / profileChecks.length) * 100}%` }} />
              </div>
            </div>
            <ul className="space-y-2.5 px-5 py-4 text-sm">
              {profileChecks.map((c) => (
                <li key={c.label} className="flex items-center gap-2.5">
                  <CheckCircle2 className={cn('size-4', c.done ? 'text-success-600' : 'text-neutral-300')} aria-hidden />
                  <span className={c.done ? 'text-ink' : 'text-ink-muted'}>{c.label}</span>
                  <span className="sr-only">{c.done ? '(done)' : '(not yet)'}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Researchers to know"
              actions={
                <Link href="/researchers" className="text-sm font-medium text-brand hover:underline">
                  Directory
                </Link>
              }
            />
            {peers.length === 0 ? (
              <p className="px-5 py-5 text-sm text-ink-muted">Suggestions appear as more researchers in your area join.</p>
            ) : (
              <ul className="divide-y divide-line">
                {peers.slice(0, 4).map((peer) => (
                  <li key={peer.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar src={peer.image} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/researchers/${peer.id}`} className="block truncate font-medium text-ink hover:text-brand">
                        {peer.name}
                      </Link>
                      {peer.department && <p className="truncate text-sm text-ink-muted">{peer.department}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={connecting === peer.id}
                      disabled={peer.connected !== 'connect'}
                      onClick={() => handleConnect(peer.id)}
                    >
                      {peer.connected === 'connected' ? 'Connected' : peer.connected === 'pending' ? 'Requested' : 'Connect'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {(currentUser?.interests?.length || 0) > 0 && (
            <Card>
              <CardHeader title="Your research interests" />
              <div className="flex flex-wrap gap-1.5 px-5 py-4">
                {currentUser!.interests!.map((tag: any) => {
                  const label = typeof tag === 'string' ? tag : tag?.interest?.name || tag?.name;
                  return label ? (
                    <Badge key={label} tone="neutral">
                      {label}
                    </Badge>
                  ) : null;
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
