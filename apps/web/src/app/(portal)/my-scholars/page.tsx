'use client';

/**
 * Supervision Panel (research supervisors): the scholars you supervise, incoming
 * supervision and collaboration requests, and progress reports awaiting review.
 * Data and decisions go through the supervision APIs; the page only presents them.
 */

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Clock,
  FileText,
  Inbox,
  MessageSquare,
  Search,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiFetch } from '@/lib/api-client';
import { handleAvatarError } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge, type Tone } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { Field, DetailItem } from '@/components/ui/field';

type PanelTab = 'scholars' | 'requests' | 'reports';
type RequestView = 'pending' | 'approved' | 'history';

/** How a progress report's review status reads to a supervisor. */
const REPORT_STATUS: Record<string, { label: string; tone: Tone }> = {
  APPROVED: { label: 'On track', tone: 'success' },
  PENDING: { label: 'Needs review', tone: 'warning' },
  NEEDS_INFO: { label: 'More information requested', tone: 'brand' },
  REJECTED: { label: 'Delayed', tone: 'danger' },
};

function formatDate(value?: string | Date) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function Avatar({ src, size = 'md' }: { src?: string | null; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'size-6' : 'size-10';
  return src ? (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={(e) => handleAvatarError(e)}
      className={cn(dim, 'shrink-0 rounded-full border border-line bg-surface-muted object-cover')}
    />
  ) : (
    <span className={cn(dim, 'flex shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-muted')}>
      <User className={size === 'sm' ? 'size-3' : 'size-4'} aria-hidden />
    </span>
  );
}

function SupervisionPanelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');

  const {
    currentUser,
    myScholars,
    workspaces,
    reports,
    pendingApprovals,
    collaborationRequests,
    fetchMyScholars,
    fetchWorkspaces,
    fetchReports,
    fetchPendingApprovals,
    fetchCollaborationRequests,
    approveScholar,
    declineScholar,
    reassignScholar,
    reviewReport,
    updateCollaborationRequest,
    addToast,
  } = useStore();

  // Reassign dialog
  const [reassigningScholar, setReassigningScholar] = useState<any | null>(null);
  const [availableSupervisors, setAvailableSupervisors] = useState<any[]>([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [selectedNewSupervisorId, setSelectedNewSupervisorId] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');
  const [submittingReassign, setSubmittingReassign] = useState(false);

  const handleOpenReassignModal = async (scholar: any) => {
    setReassigningScholar(scholar);
    setSelectedNewSupervisorId('');
    setReassignNotes('');
    setLoadingSupervisors(true);
    try {
      const res = await apiFetch('/api/users/supervisors');
      if (res.ok) {
        const data = await res.json();
        setAvailableSupervisors(data.filter((sup: any) => sup.id !== currentUser?.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSupervisors(false);
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassigningScholar || !selectedNewSupervisorId) {
      addToast('Please select a target supervisor.', 'error');
      return;
    }
    setSubmittingReassign(true);
    try {
      await reassignScholar(reassigningScholar.id, selectedNewSupervisorId, reassignNotes);
      setReassigningScholar(null);
    } catch (e: any) {
      console.error(e);
    } finally {
      setSubmittingReassign(false);
    }
  };

  const [loading, setLoading] = useState(myScholars.length === 0);
  const [activeTab, setActiveTab] = useState<PanelTab>('scholars');
  const [requestSubTab, setRequestSubTab] = useState<RequestView>('pending');

  // Report review
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [feedback, setFeedback] = useState('');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reportsSearchQuery, setReportsSearchQuery] = useState('');

  // Only research supervisors use this panel.
  useEffect(() => {
    if (currentUser && currentUser.role !== 'RESEARCH_SUPERVISOR') {
      router.replace('/feed');
    }
  }, [currentUser, router]);

  // The URL (?tab=) decides the tab, so links from elsewhere open the right view.
  useEffect(() => {
    if (tabParam === 'requests') setActiveTab('requests');
    else if (tabParam === 'reports') setActiveTab('reports');
    else setActiveTab('scholars');
  }, [tabParam]);

  const loadSupervisionData = React.useCallback(
    async (showLoading = true) => {
      if (currentUser?.role !== 'RESEARCH_SUPERVISOR') return;
      if (showLoading && myScholars.length === 0) setLoading(true);
      try {
        await Promise.allSettled([fetchMyScholars(), fetchWorkspaces(), fetchReports(), fetchPendingApprovals(), fetchCollaborationRequests()]);
      } catch (e: any) {
        console.error('Failed to load supervision data:', e);
      } finally {
        setLoading(false);
      }
    },
    [currentUser?.role, fetchMyScholars, fetchWorkspaces, fetchReports, fetchPendingApprovals, fetchCollaborationRequests, myScholars.length],
  );

  useEffect(() => {
    loadSupervisionData(myScholars.length === 0);
  }, [loadSupervisionData]);

  if (currentUser?.role !== 'RESEARCH_SUPERVISOR') {
    return null;
  }

  const getWorkspaceForScholar = (scholarId: string) =>
    workspaces?.find((ws) => ws.members?.some((m: any) => m.userId === scholarId)) ?? null;

  const scholarsNeedingAttention = myScholars.filter((scholar) => reports.some((r) => r.scholarId === scholar.id && r.status === 'PENDING'));

  const handleApproveScholar = async (scholarId: string) => {
    try {
      await approveScholar(scholarId);
      addToast('Scholar approved and added to your supervision.', 'success');
      fetchPendingApprovals();
      fetchMyScholars();
    } catch (e: any) {
      addToast(`Approval failed: ${e.message}`, 'error');
    }
  };

  const handleDeclineScholar = async (scholarId: string) => {
    try {
      await declineScholar(scholarId);
      addToast('Supervision request declined.', 'info');
      fetchPendingApprovals();
    } catch (e: any) {
      addToast(`Decline failed: ${e.message}`, 'error');
    }
  };

  const handleAcceptCollab = async (reqId: string) => {
    try {
      await updateCollaborationRequest(reqId, 'PUBLISHED');
      addToast('Collaboration request accepted.', 'success');
      fetchCollaborationRequests();
      fetchWorkspaces();
    } catch (e: any) {
      addToast(`Accept failed: ${e.message}`, 'error');
    }
  };

  const handleDeclineCollab = async (reqId: string) => {
    try {
      await updateCollaborationRequest(reqId, 'REJECTED');
      addToast('Collaboration request declined.', 'info');
      fetchCollaborationRequests();
    } catch (e: any) {
      addToast(`Decline failed: ${e.message}`, 'error');
    }
  };

  const pendingCollabs = collaborationRequests?.filter((r: any) => r.status === 'PENDING') || [];
  const historyRequests = collaborationRequests?.filter((r: any) => r.status === 'REJECTED') || [];
  const pendingRequestsCount = (pendingApprovals?.length || 0) + pendingCollabs.length;

  const handleOpenReview = (report: any) => {
    setActiveReport(report);
    setFeedback(report.feedback || '');
    setIsDrawerOpen(true);
  };

  const handleReviewReport = async (status: 'APPROVED' | 'REJECTED' | 'NEEDS_INFO') => {
    if (!activeReport) return;
    setReviewing(status);
    try {
      await reviewReport(activeReport.id, status, feedback || undefined);
      addToast(`Report marked as ${REPORT_STATUS[status].label.toLowerCase()}.`, 'success');
      setIsDrawerOpen(false);
      fetchReports();
    } catch (err: any) {
      addToast(`Error reviewing report: ${err.message}`, 'error');
    } finally {
      setReviewing(null);
    }
  };

  const filteredReports =
    reports?.filter((r) => {
      const q = reportsSearchQuery.toLowerCase();
      return (
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.scholar?.name && r.scholar.name.toLowerCase().includes(q)) ||
        (r.scholar?.department && r.scholar.department.toLowerCase().includes(q))
      );
    }) || [];

  const selectTab = (tab: PanelTab) => {
    setActiveTab(tab);
    router.push(`/my-scholars?tab=${tab}`);
  };

  const TABS: { id: PanelTab; label: string; count?: number; attention?: boolean }[] = [
    { id: 'scholars', label: 'My scholars', count: myScholars.length },
    { id: 'requests', label: 'Requests', count: pendingRequestsCount, attention: pendingRequestsCount > 0 },
    { id: 'reports', label: 'Progress reports', count: scholarsNeedingAttention.length, attention: scholarsNeedingAttention.length > 0 },
  ];

  return (
    <div>
      <PageHeader
        meta="Supervision"
        title="Supervision Panel"
        description="The scholars you supervise, requests waiting for your decision, and progress reports to review."
      />

      <div role="tablist" aria-label="Supervision" className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectTab(tab.id)}
              className={cn(
                '-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition-colors duration-fast',
                selected ? 'border-brand font-medium text-ink' : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (tab.count > 0 || tab.id === 'scholars') && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-px text-xs tabular-nums',
                    tab.attention ? 'bg-warning-100 text-warning-800' : 'bg-neutral-100 text-ink-secondary',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div role="status" aria-label="Loading supervision data" className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* ── My scholars ─────────────────────────────────────────────── */}
          {activeTab === 'scholars' && (
            <div className="space-y-6">
              <Card className="grid grid-cols-3 gap-px overflow-hidden bg-line">
                {[
                  { label: 'Supervised scholars', value: myScholars.length },
                  { label: 'Active', value: myScholars.filter((s) => s.status === 'ACTIVE').length },
                  { label: 'Reports to review', value: scholarsNeedingAttention.length, warn: scholarsNeedingAttention.length > 0 },
                ].map((fig) => (
                  <div key={fig.label} className="bg-surface px-4 py-4 sm:px-5">
                    <p className="text-sm text-ink-muted">{fig.label}</p>
                    <p className={cn('mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink sm:text-3xl', fig.warn && 'text-warning-700')}>{fig.value}</p>
                  </div>
                ))}
              </Card>

              {myScholars.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={UserCheck}
                    title="No scholars under your supervision yet"
                    description="Scholars appear here once you approve their supervision request."
                    action={
                      <Button variant="secondary" onClick={() => selectTab('requests')}>
                        Review requests
                      </Button>
                    }
                  />
                </Card>
              ) : (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {myScholars.map((scholar) => {
                    const ws = getWorkspaceForScholar(scholar.id);
                    const needsAttention = reports.some((r) => r.scholarId === scholar.id && r.status === 'PENDING');
                    const latestReport = reports
                      .filter((r) => r.scholarId === scholar.id)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

                    return (
                      <li key={scholar.id}>
                        <Card className={cn('flex h-full flex-col', needsAttention && 'border-warning-300')}>
                          <div className="flex items-start gap-3 px-5 pt-5">
                            <Avatar src={scholar.image} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-ink">{scholar.name}</p>
                              {scholar.department && <p className="truncate text-sm text-ink-muted">{scholar.department}</p>}
                            </div>
                            {needsAttention && <Badge tone="warning">Report to review</Badge>}
                          </div>

                          {scholar.bio && <p className="mt-3 line-clamp-2 px-5 text-sm text-ink-secondary">{scholar.bio}</p>}

                          <dl className="mt-4 grid grid-cols-2 gap-4 border-y border-line bg-surface-muted px-5 py-3">
                            <DetailItem label="Publications">
                              <span className="inline-flex items-center gap-1.5 tabular-nums">
                                <BookOpen className="size-3.5 text-ink-muted" aria-hidden />
                                {scholar.publications?.length || 0}
                              </span>
                            </DetailItem>
                            <DetailItem label="Progress reports">
                              <span className="inline-flex items-center gap-1.5 tabular-nums">
                                <FileText className="size-3.5 text-ink-muted" aria-hidden />
                                {scholar.submittedReports?.length || 0}
                              </span>
                            </DetailItem>
                          </dl>

                          <div className="flex-1 px-5 py-3 text-sm">
                            <p className="text-xs text-ink-muted">Latest report</p>
                            {latestReport ? (
                              <p className="mt-0.5 text-ink-secondary">
                                <span className="font-medium text-ink">{latestReport.title}</span> · {formatDate(latestReport.createdAt)}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-ink-muted">No progress reports yet.</p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
                            <Link href={`/researchers/${scholar.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                              Profile
                              <ArrowUpRight aria-hidden />
                            </Link>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenReassignModal(scholar)}>
                              <UserPlus aria-hidden />
                              Reassign
                            </Button>
                            <span className="ml-auto">
                              {ws ? (
                                <Link href={`/nexus?userId=${scholar.id}`} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                                  <MessageSquare aria-hidden />
                                  Open collaboration
                                </Link>
                              ) : (
                                <span className="text-sm text-ink-muted">No shared workspace yet</span>
                              )}
                            </span>
                          </div>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* ── Requests ────────────────────────────────────────────────── */}
          {activeTab === 'requests' && (
            <div className="space-y-5">
              <div role="tablist" aria-label="Request status" className="inline-flex rounded-lg border border-line bg-surface-muted p-0.5">
                {(
                  [
                    { id: 'pending', label: 'Pending', count: pendingRequestsCount },
                    { id: 'approved', label: 'Approved', count: myScholars?.length || 0 },
                    { id: 'history', label: 'Declined', count: historyRequests.length },
                  ] as { id: RequestView; label: string; count: number }[]
                ).map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    role="tab"
                    aria-selected={requestSubTab === view.id}
                    onClick={() => setRequestSubTab(view.id)}
                    className={cn(
                      'h-8 rounded-md px-3 text-sm transition-colors duration-fast',
                      requestSubTab === view.id ? 'bg-surface font-medium text-ink shadow-xs' : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    {view.label} <span className="tabular-nums text-ink-muted">{view.count}</span>
                  </button>
                ))}
              </div>

              {requestSubTab === 'pending' &&
                (pendingRequestsCount === 0 ? (
                  <Card>
                    <EmptyState
                      icon={Inbox}
                      title="No requests waiting"
                      description="Supervision requests from scholars and requests to join your collaboration opportunities appear here."
                    />
                  </Card>
                ) : (
                  <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {pendingApprovals?.map((req: any) => (
                      <li key={req.id}>
                        <Card className="flex h-full flex-col">
                          <div className="flex items-start gap-3 px-5 pt-5">
                            <Avatar src={req.image} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-ink">{req.name}</p>
                              {req.department && <p className="truncate text-sm text-ink-muted">{req.department}</p>}
                            </div>
                            <Badge tone="brand">Supervision</Badge>
                          </div>
                          <div className="flex-1 space-y-3 px-5 py-4 text-sm">
                            {req._proposalTitle && (
                              <div>
                                <p className="text-xs text-ink-muted">Research proposal</p>
                                <p className="mt-0.5 font-serif text-base font-semibold text-ink">{req._proposalTitle}</p>
                              </div>
                            )}
                            {(req._researchDomain || req._researchTopic) && (
                              <div className="flex flex-wrap gap-1.5">
                                {req._researchDomain && <Badge tone="neutral">{req._researchDomain}</Badge>}
                                {req._researchTopic && <Badge tone="plum">{req._researchTopic}</Badge>}
                              </div>
                            )}
                            {(req._requestMessage || req.bio) && (
                              <blockquote className="border-l-2 border-line-strong pl-3 text-ink-secondary">{req._requestMessage || req.bio}</blockquote>
                            )}
                          </div>
                          <div className="flex gap-2 border-t border-line px-5 py-3">
                            <Button size="sm" onClick={() => handleApproveScholar(req._requestId || req.id)}>
                              <Check aria-hidden />
                              Approve
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => handleDeclineScholar(req._requestId || req.id)}>
                              Decline
                            </Button>
                          </div>
                        </Card>
                      </li>
                    ))}

                    {pendingCollabs.map((req: any) => (
                      <li key={req.id}>
                        <Card className="flex h-full flex-col">
                          <div className="flex items-start gap-3 px-5 pt-5">
                            <Avatar src={req.scholar?.image} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-ink">{req.scholar?.name}</p>
                              <p className="truncate text-sm text-ink-muted">Wants to join your opportunity</p>
                            </div>
                            <Badge tone="sea">Collaboration</Badge>
                          </div>
                          <div className="flex-1 space-y-3 px-5 py-4 text-sm">
                            {(req.opportunity?.title || req.thread?.title) && (
                              <div>
                                <p className="text-xs text-ink-muted">Opportunity</p>
                                <p className="mt-0.5 font-medium text-ink">{req.opportunity?.title || req.thread?.title}</p>
                              </div>
                            )}
                            {req.message && <blockquote className="border-l-2 border-line-strong pl-3 text-ink-secondary">{req.message}</blockquote>}
                          </div>
                          <div className="flex gap-2 border-t border-line px-5 py-3">
                            <Button size="sm" onClick={() => handleAcceptCollab(req.id)}>
                              <Check aria-hidden />
                              Accept
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => handleDeclineCollab(req.id)}>
                              Decline
                            </Button>
                          </div>
                        </Card>
                      </li>
                    ))}
                  </ul>
                ))}

              {requestSubTab === 'approved' &&
                (myScholars?.length === 0 ? (
                  <Card>
                    <EmptyState icon={UserCheck} title="No approved scholars yet" description="Scholars you approve for supervision are listed here." />
                  </Card>
                ) : (
                  <Card>
                    <ul className="divide-y divide-line">
                      {myScholars.map((scholar: any) => (
                        <li key={scholar.id} className="flex items-center gap-3 px-5 py-3">
                          <Avatar src={scholar.image} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-ink">{scholar.name}</p>
                            {scholar.department && <p className="truncate text-sm text-ink-muted">{scholar.department}</p>}
                          </div>
                          <Badge tone="success">Supervising</Badge>
                          <Button size="sm" variant="ghost" onClick={() => selectTab('scholars')}>
                            Manage
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}

              {requestSubTab === 'history' &&
                (historyRequests.length === 0 ? (
                  <Card>
                    <EmptyState icon={Clock} title="No declined requests" description="Collaboration requests you decline are kept here for reference." />
                  </Card>
                ) : (
                  <Card>
                    <ul className="divide-y divide-line">
                      {historyRequests.map((req: any) => (
                        <li key={req.id} className="flex items-center gap-3 px-5 py-3">
                          <Avatar src={req.scholar?.image} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-ink">{req.scholar?.name}</p>
                            {(req.opportunity?.title || req.thread?.title) && (
                              <p className="truncate text-sm text-ink-muted">{req.opportunity?.title || req.thread?.title}</p>
                            )}
                          </div>
                          <Badge tone="danger">
                            <X className="size-3" aria-hidden />
                            Declined
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
            </div>
          )}

          {/* ── Progress reports ────────────────────────────────────────── */}
          {activeTab === 'reports' && (
            <Card>
              <CardHeader
                title="Progress reports"
                description="Reports your scholars submit for review."
                actions={
                  reports.length > 0 && (
                    <div className="relative hidden w-64 sm:block">
                      <label htmlFor="report-search" className="sr-only">
                        Search reports
                      </label>
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
                      <input
                        id="report-search"
                        type="search"
                        placeholder="Search title or scholar"
                        value={reportsSearchQuery}
                        onChange={(e) => setReportsSearchQuery(e.target.value)}
                        className="cb-input h-9 pl-9"
                      />
                    </div>
                  )
                }
              />
              {reports.length > 0 && (
                <div className="border-b border-line p-4 sm:hidden">
                  <label htmlFor="report-search-m" className="sr-only">
                    Search reports
                  </label>
                  <input
                    id="report-search-m"
                    type="search"
                    placeholder="Search title or scholar"
                    value={reportsSearchQuery}
                    onChange={(e) => setReportsSearchQuery(e.target.value)}
                    className="cb-input"
                  />
                </div>
              )}

              {filteredReports.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={reportsSearchQuery ? 'No reports match your search' : 'No progress reports yet'}
                  description={reportsSearchQuery ? 'Try a different title or scholar name.' : 'When your scholars submit progress reports, they appear here for review.'}
                />
              ) : (
                <ul className="divide-y divide-line">
                  {filteredReports.map((report) => {
                    const status = REPORT_STATUS[report.status] ?? { label: report.status, tone: 'neutral' as Tone };
                    return (
                      <li key={report.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={status.tone}>{status.label}</Badge>
                            <span className="text-xs text-ink-muted">Submitted {formatDate(report.createdAt)}</span>
                          </div>
                          <p className="font-medium text-ink">{report.title}</p>
                          {report.description && <p className="line-clamp-2 text-sm text-ink-secondary">{report.description}</p>}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-sm text-ink-muted">
                            <span className="inline-flex items-center gap-1.5">
                              <Avatar src={report.scholar?.image} size="sm" />
                              <span className="text-ink-secondary">{report.scholar?.name}</span>
                            </span>
                            {report.scholar?.department && <span>{report.scholar.department}</span>}
                            {report.evidenceUrl && (
                              <a href={report.evidenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
                                <FileText className="size-3.5" aria-hidden />
                                Evidence
                                <span className="sr-only">(opens in a new tab)</span>
                              </a>
                            )}
                          </div>
                          {report.feedback && (
                            <div className="mt-2 flex gap-2 rounded-xl bg-surface-muted p-3 text-sm">
                              <MessageSquare className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
                              <p className="text-ink-secondary">
                                <span className="font-medium text-ink">Your feedback: </span>
                                {report.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                        {report.status === 'PENDING' && (
                          <Button size="sm" onClick={() => handleOpenReview(report)} className="self-start">
                            Review
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}
        </>
      )}

      {/* Report review */}
      <Dialog
        open={isDrawerOpen && !!activeReport}
        onClose={() => setIsDrawerOpen(false)}
        dismissible={!reviewing}
        side="right"
        title="Review progress report"
        description={activeReport?.scholar?.name ? `Submitted by ${activeReport.scholar.name}` : undefined}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="secondary" onClick={() => handleReviewReport('NEEDS_INFO')} loading={reviewing === 'NEEDS_INFO'} disabled={!!reviewing}>
              Request more information
            </Button>
            <Button
              variant="secondary"
              className="text-danger-700 hover:border-danger-300 hover:bg-danger-50"
              onClick={() => handleReviewReport('REJECTED')}
              loading={reviewing === 'REJECTED'}
              disabled={!!reviewing}
            >
              Mark as delayed
            </Button>
            <Button onClick={() => handleReviewReport('APPROVED')} loading={reviewing === 'APPROVED'} disabled={!!reviewing}>
              <Check aria-hidden />
              Approve progress
            </Button>
          </div>
        }
      >
        {activeReport && (
          <div className="space-y-5">
            <dl className="space-y-3">
              {activeReport.scholar?.department && <DetailItem label="Department">{activeReport.scholar.department}</DetailItem>}
              <DetailItem label="Report">{activeReport.title}</DetailItem>
              {activeReport.description && (
                <DetailItem label="Progress summary">
                  <span className="whitespace-pre-line font-normal text-ink-secondary">{activeReport.description}</span>
                </DetailItem>
              )}
            </dl>
            {activeReport.evidenceUrl && (
              <a href={activeReport.evidenceUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                <FileText aria-hidden />
                Open evidence
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            <Field label="Feedback for the scholar" htmlFor="report-feedback" hint="Optional. Shown to the scholar with your decision.">
              <textarea
                id="report-feedback"
                rows={6}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Corrections, guidance or next steps"
                className="cb-input resize-y"
              />
            </Field>
          </div>
        )}
      </Dialog>

      {/* Reassign scholar */}
      <Dialog
        open={!!reassigningScholar}
        onClose={() => setReassigningScholar(null)}
        dismissible={!submittingReassign}
        title="Reassign scholar"
        description={reassigningScholar ? `Transfer supervision of ${reassigningScholar.name} to another supervisor.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReassigningScholar(null)} disabled={submittingReassign}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReassign} loading={submittingReassign} disabled={!selectedNewSupervisorId}>
              Reassign
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="New supervisor" htmlFor="reassign-supervisor" required>
            {loadingSupervisors ? (
              <Skeleton className="h-10 w-full" />
            ) : availableSupervisors.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface-muted px-3 py-2.5 text-sm text-ink-secondary">No other supervisors are available.</p>
            ) : (
              <select
                id="reassign-supervisor"
                value={selectedNewSupervisorId}
                onChange={(e) => setSelectedNewSupervisorId(e.target.value)}
                className="cb-input"
              >
                <option value="">Choose a supervisor</option>
                {availableSupervisors.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                    {sup.department ? ` (${sup.department})` : ''}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Reason" htmlFor="reassign-notes" hint="Optional. For example: change of research direction.">
            <textarea
              id="reassign-notes"
              rows={3}
              value={reassignNotes}
              onChange={(e) => setReassignNotes(e.target.value)}
              className="cb-input resize-y"
            />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}

export default function MyScholarsPage() {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Loading supervision panel" className="space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <SupervisionPanelContent />
    </Suspense>
  );
}
