'use client';

/**
 * A scholar's own research record: thesis details, stage, milestones,
 * supervisor and shared materials. Data and actions come from the research API.
 */

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { getProfileImageUrl, handleAvatarError } from '@/lib/avatar';
import { thesisAbstract, thesisTitle } from '@/lib/research-profile';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileText,
  ListTodo,
  Network,
  Plus,
  ShieldAlert,
  User,
} from 'lucide-react';
import type { ResearchStage, ResearchStatus, MilestonePriority } from '@curiousbees/types';
import { PageHeader } from '@/components/ui/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge, StatusBadge, type Tone } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { Field, DetailItem } from '@/components/ui/field';

const STAGES: { key: ResearchStage; label: string; description: string }[] = [
  { key: 'PROPOSAL', label: 'Research Proposal', description: 'Thesis topic definition, objectives, and approval.' },
  { key: 'LITERATURE_REVIEW', label: 'Literature Review', description: 'Comprehensive survey of existing work and prior state of the art.' },
  { key: 'METHODOLOGY', label: 'Methodology', description: 'Architectural formulation, algorithms, and experimental design.' },
  { key: 'IMPLEMENTATION', label: 'Implementation', description: 'Development, data collection, and prototype execution.' },
  { key: 'EVALUATION', label: 'Evaluation', description: 'Empirical benchmarking, statistical analysis, and validation.' },
  { key: 'THESIS_PUBLICATION', label: 'Thesis / Publication', description: 'Final dissertation writing, peer-review submissions, and defense.' }
];

type MilestoneTab = 'ALL' | 'UPCOMING' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED';

const MILESTONE_TABS: { id: MilestoneTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'UPCOMING', label: 'Upcoming' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'COMPLETED', label: 'Completed' },
];

const PRIORITY_TONE: Record<string, Tone> = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'neutral' };
const PRIORITY_LABEL: Record<string, string> = { HIGH: 'High priority', MEDIUM: 'Medium priority', LOW: 'Low priority' };

// Same wording the supervisor sees when reviewing.
const REPORT_STATUS: Record<string, { label: string; tone: Tone }> = {
  APPROVED: { label: 'On track', tone: 'success' },
  PENDING: { label: 'Awaiting review', tone: 'warning' },
  NEEDS_INFO: { label: 'More information requested', tone: 'brand' },
  REJECTED: { label: 'Delayed', tone: 'danger' },
};

const stageLabel = (key?: string) => STAGES.find((s) => s.key === key)?.label ?? (key || '').replace(/_/g, ' ');

function formatMonth(value?: string | Date | null) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
}

function formatDay(value?: string | Date | null) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function formatDateTime(value?: string | Date | null) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime())
    ? d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';
}

export default function MyResearchCommandCenterPage() {
  const router = useRouter();
  const {
    currentUser,
    myResearchProfile,
    myResearchMilestones,
    myResearchActivities,
    myResearchMaterials,
    fetchMyResearch,
    updateResearchProfile,
    createResearchMilestone,
    completeMilestone,
    fetchMyResearchMaterials,
    reports,
    fetchReports,
    submitReport,
    addToast
  } = useStore();

  // Progress reports go to the assigned supervisor, who reviews them in the Supervision Panel.
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportSummary, setReportSummary] = useState('');
  const [reportEvidence, setReportEvidence] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const [loading, setLoading] = useState(true);
  const [activeMilestoneTab, setActiveMilestoneTab] = useState<MilestoneTab>('ALL');
  
  // Modals
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);

  // Edit Profile Form
  const [editTitle, setEditTitle] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editAbstract, setEditAbstract] = useState('');
  const [editStage, setEditStage] = useState<ResearchStage>('PROPOSAL');
  const [editStatus, setEditStatus] = useState<ResearchStatus>('ACTIVE');
  const [editStartDate, setEditStartDate] = useState('');
  const [editCompletionDate, setEditCompletionDate] = useState('');

  // Add Milestone Form
  const [mTitle, setMTitle] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mStage, setMStage] = useState<ResearchStage>('PROPOSAL');
  const [mPriority, setMPriority] = useState<MilestonePriority>('MEDIUM');
  const [mDueDate, setMDueDate] = useState('');

  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      Promise.all([fetchMyResearch(), fetchMyResearchMaterials(), fetchReports()]).finally(() => {
        setLoading(false);
      });
    }
  }, [currentUser]);

  // Populate Edit Profile Form when profile loads or drawer opens
  useEffect(() => {
    if (myResearchProfile) {
      setEditTitle(thesisTitle(myResearchProfile) || '');
      setEditArea(myResearchProfile.researchArea || '');
      setEditAbstract(thesisAbstract(myResearchProfile) || '');
      setEditStage(myResearchProfile.currentStage || 'PROPOSAL');
      setEditStatus(myResearchProfile.status || 'ACTIVE');
      setEditStartDate(myResearchProfile.startDate ? new Date(myResearchProfile.startDate).toISOString().slice(0, 10) : '');
      setEditCompletionDate(myResearchProfile.expectedCompletionDate ? new Date(myResearchProfile.expectedCompletionDate).toISOString().slice(0, 10) : '');
      setMStage(myResearchProfile.currentStage || 'PROPOSAL');
    }
  }, [myResearchProfile, isEditProfileOpen]);

  // Access Guard
  const isScholar = currentUser?.role === 'RESEARCH_SCHOLAR';

  // Calculate current stage index
  const currentStageIndex = useMemo(() => {
    if (!myResearchProfile?.currentStage) return 0;
    const idx = STAGES.findIndex((s) => s.key === myResearchProfile.currentStage);
    return idx >= 0 ? idx : 0;
  }, [myResearchProfile?.currentStage]);

  // Data-Driven Attention Required Calculation
  const attentionItems = useMemo(() => {
    const items: { id: string; title: string; reason: string; priority: 'HIGH' | 'MEDIUM'; date?: string; actionText: string; onClick: () => void }[] = [];
    const now = new Date();

    if (!myResearchProfile?.supervisor) {
      items.push({
        id: 'no-supervisor',
        title: 'No supervisor assigned',
        reason: 'You are not yet linked to an approved research supervisor.',
        priority: 'HIGH',
        actionText: 'Find a supervisor',
        onClick: () => router.push('/researchers')
      });
    }

    if (!thesisTitle(myResearchProfile) || !thesisAbstract(myResearchProfile)) {
      items.push({
        id: 'unconfigured-topic',
        title: 'Add your thesis topic',
        reason: 'Your thesis title or abstract has not been filled in yet.',
        priority: 'MEDIUM',
        actionText: 'Edit details',
        onClick: () => setIsEditProfileOpen(true)
      });
    }

    (myResearchMilestones || []).forEach((m) => {
      if (m.status !== 'COMPLETED' && m.dueDate) {
        const dueDate = new Date(m.dueDate);
        if (dueDate < now) {
          items.push({
            id: `overdue-${m.id}`,
            title: `Overdue: ${m.title}`,
            reason: `Was due on ${dueDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}.`,
            priority: 'HIGH',
            date: dueDate.toLocaleDateString(),
            actionText: 'Mark complete',
            onClick: () => completeMilestone(m.id)
          });
        } else {
          const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 7) {
            items.push({
              id: `due-soon-${m.id}`,
              title: `Due soon: ${m.title}`,
              reason: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}, on ${dueDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}.`,
              priority: 'MEDIUM',
              date: dueDate.toLocaleDateString(),
              actionText: 'View milestones',
              onClick: () => setActiveMilestoneTab('UPCOMING')
            });
          }
        }
      }
    });

    return items;
  }, [myResearchProfile, myResearchMilestones, router, completeMilestone]);

  // Filtered Milestones
  const filteredMilestones = useMemo(() => {
    if (!myResearchMilestones) return [];
    if (activeMilestoneTab === 'ALL') return myResearchMilestones;
    const now = new Date();
    return myResearchMilestones.filter((m) => {
      if (activeMilestoneTab === 'COMPLETED') return m.status === 'COMPLETED';
      if (activeMilestoneTab === 'IN_PROGRESS') return m.status === 'IN_PROGRESS';
      if (activeMilestoneTab === 'OVERDUE') return m.status !== 'COMPLETED' && m.dueDate && new Date(m.dueDate) < now;
      if (activeMilestoneTab === 'UPCOMING') return m.status === 'UPCOMING' && (!m.dueDate || new Date(m.dueDate) >= now);
      return true;
    });
  }, [myResearchMilestones, activeMilestoneTab]);

  // Handle Edit Profile Submission
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateResearchProfile({
        title: editTitle,
        researchArea: editArea,
        abstract: editAbstract,
        currentStage: editStage,
        status: editStatus,
        startDate: editStartDate || null,
        expectedCompletionDate: editCompletionDate || null
      });
      setIsEditProfileOpen(false);
    } catch (err) {
      // Error handled in store
    }
  };

  // Handle Add Milestone Submission
  const handleCreateMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle.trim()) {
      addToast('Please enter a milestone title', 'error');
      return;
    }
    try {
      await createResearchMilestone({
        title: mTitle,
        description: mDesc,
        stage: mStage,
        priority: mPriority,
        dueDate: mDueDate || null
      });
      setMTitle('');
      setMDesc('');
      setIsAddMilestoneOpen(false);
    } catch (err) {
      // Error handled in store
    }
  };

  if (!currentUser) return null;

  // Supervisors and admins track scholars elsewhere; this page is the scholar's own record.
  if (!isScholar) {
    return (
      <Card className="mx-auto max-w-md">
        <EmptyState
          icon={ShieldAlert}
          title="My Research is for research scholars"
          description="Supervisors follow scholar progress from the Supervision Panel."
          action={
            <Link href="/feed" className={buttonVariants({ variant: 'secondary' })}>
              Go to the research feed
            </Link>
          }
        />
      </Card>
    );
  }

  const supervisor = myResearchProfile?.supervisor;
  const nexusHref = myResearchProfile?.activeCollabId ? `/nexus?collab=${myResearchProfile.activeCollabId}` : '/nexus';
  const currentStage = STAGES[currentStageIndex];

  return (
    <div className="animate-fade-in">
      <PageHeader
        meta="Research"
        title="My research"
        description="Your thesis, its stage, milestones and supervision in one place."
        actions={
          <>
            <Button variant="secondary" onClick={() => setIsEditProfileOpen(true)}>
              <Edit3 aria-hidden />
              Edit research details
            </Button>
            <Button onClick={() => setIsAddMilestoneOpen(true)}>
              <Plus aria-hidden />
              Add milestone
            </Button>
          </>
        }
      />

      {loading ? (
        <div role="status" aria-label="Loading your research" className="space-y-6">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Thesis overview */}
          <Card>
            <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {myResearchProfile?.researchArea && <Badge tone="brand">{myResearchProfile.researchArea}</Badge>}
                  <StatusBadge status={myResearchProfile?.status || 'ACTIVE'} />
                </div>
                <h2 className={cn('font-serif text-2xl font-semibold leading-tight tracking-tight', thesisTitle(myResearchProfile) ? 'text-ink' : 'text-ink-muted')}>
                  {thesisTitle(myResearchProfile) || 'Thesis title not set'}
                </h2>
                {thesisAbstract(myResearchProfile) ? (
                  <p className="max-w-prose text-base leading-relaxed text-ink-secondary">{thesisAbstract(myResearchProfile)}</p>
                ) : (
                  <p className="text-sm text-ink-muted">
                    No abstract yet.{' '}
                    <button type="button" onClick={() => setIsEditProfileOpen(true)} className="font-medium text-brand hover:underline">
                      Add one
                    </button>
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-3 gap-4 border-t border-line pt-4 lg:grid-cols-1 lg:gap-3 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <DetailItem label="Current stage">{currentStage.label}</DetailItem>
                <DetailItem label="Started">{formatMonth(myResearchProfile?.startDate) || 'Not set'}</DetailItem>
                <DetailItem label="Target completion">{formatMonth(myResearchProfile?.expectedCompletionDate) || 'Not set'}</DetailItem>
              </dl>
            </div>
          </Card>

          {/* Stage tracker */}
          <Card>
            <CardHeader
              title="Research stage"
              description={`${currentStage.label}: ${currentStage.description}`}
              actions={
                <span className="whitespace-nowrap text-sm tabular-nums text-ink-muted">
                  Stage {currentStageIndex + 1} of {STAGES.length}
                </span>
              }
            />
            <ol className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-6">
              {STAGES.map((stg, idx) => {
                const isCompleted = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <li key={stg.key}>
                    <button
                      type="button"
                      aria-current={isCurrent ? 'step' : undefined}
                      title={isCurrent ? 'Current stage' : `Set ${stg.label} as your current stage`}
                      onClick={async () => {
                        if (idx !== currentStageIndex) {
                          await updateResearchProfile({ currentStage: stg.key });
                        }
                      }}
                      className={cn(
                        'flex h-full w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors duration-fast',
                        isCurrent
                          ? 'border-brand bg-brand-50 font-medium text-ink'
                          : isCompleted
                            ? 'border-line bg-surface text-ink-secondary hover:bg-surface-muted'
                            : 'border-dashed border-line-strong bg-surface text-ink-muted hover:border-solid hover:bg-surface-muted',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                          isCurrent
                            ? 'bg-brand text-white'
                            : isCompleted
                              ? 'bg-success-50 text-success-700 ring-1 ring-inset ring-success-200'
                              : 'bg-surface-muted text-ink-muted ring-1 ring-inset ring-line',
                        )}
                      >
                        {isCompleted ? <Check className="size-3.5" /> : idx + 1}
                      </span>
                      <span className="leading-snug">{stg.label}</span>
                      {isCompleted && <span className="sr-only">(completed)</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </Card>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Needs attention */}
              {attentionItems.length > 0 ? (
                <Card>
                  <CardHeader title="Needs attention" actions={<Badge tone="warning">{attentionItems.length} open</Badge>} />
                  <ul className="divide-y divide-line">
                    {attentionItems.map((item) => (
                      <li key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <AlertTriangle
                            className={cn('mt-0.5 size-4 shrink-0', item.priority === 'HIGH' ? 'text-danger-600' : 'text-warning-600')}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink">
                              {item.title}
                              <span className="sr-only"> ({item.priority === 'HIGH' ? 'high' : 'medium'} priority)</span>
                            </p>
                            <p className="mt-0.5 text-sm text-ink-secondary">{item.reason}</p>
                          </div>
                        </div>
                        <Button variant="secondary" size="sm" onClick={item.onClick} className="self-start sm:self-center">
                          {item.actionText}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-success-200 bg-success-50 px-5 py-4 text-sm">
                  <CheckCircle2 className="size-5 shrink-0 text-success-600" aria-hidden />
                  <p className="text-success-800">
                    <span className="font-medium">You&apos;re up to date.</span> Nothing in your research needs attention right now.
                  </p>
                </div>
              )}

              {/* Milestones */}
              <Card>
                <CardHeader
                  title="Milestones"
                  description="Chapters, reviews and submissions you are working towards."
                  actions={
                    <Button size="sm" variant="secondary" onClick={() => setIsAddMilestoneOpen(true)}>
                      <Plus aria-hidden />
                      Add
                    </Button>
                  }
                />
                <div className="border-b border-line px-5 py-3">
                  <div role="tablist" aria-label="Filter milestones" className="-mx-1 flex gap-1 overflow-x-auto px-1">
                    {MILESTONE_TABS.map((tab) => {
                      const isActive = activeMilestoneTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setActiveMilestoneTab(tab.id)}
                          className={cn(
                            'h-8 shrink-0 rounded-lg px-3 text-sm transition-colors duration-fast',
                            isActive ? 'bg-neutral-100 font-medium text-ink' : 'text-ink-muted hover:bg-neutral-100 hover:text-ink',
                          )}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredMilestones.length === 0 ? (
                  <EmptyState
                    icon={ListTodo}
                    title={activeMilestoneTab === 'ALL' ? 'No milestones yet' : `No ${MILESTONE_TABS.find((t) => t.id === activeMilestoneTab)?.label.toLowerCase()} milestones`}
                    description={
                      activeMilestoneTab === 'ALL'
                        ? 'Break your thesis into milestones, such as a chapter draft or a review, and track each one to completion.'
                        : 'Milestones appear here when they match this filter.'
                    }
                    action={
                      activeMilestoneTab === 'ALL' && (
                        <Button onClick={() => setIsAddMilestoneOpen(true)}>
                          <Plus aria-hidden />
                          Add your first milestone
                        </Button>
                      )
                    }
                  />
                ) : (
                  <ul className="divide-y divide-line">
                    {filteredMilestones.map((m) => {
                      const isOverdue = m.status !== 'COMPLETED' && m.dueDate && new Date(m.dueDate) < new Date();
                      const isDone = m.status === 'COMPLETED';
                      return (
                        <li key={m.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <p className={cn('text-sm font-medium', isDone ? 'text-ink-muted line-through' : 'text-ink')}>{m.title}</p>
                            {m.description && <p className="text-sm text-ink-secondary">{m.description}</p>}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                              <Badge tone={PRIORITY_TONE[m.priority] ?? 'neutral'}>{PRIORITY_LABEL[m.priority] ?? m.priority}</Badge>
                              <Badge tone="neutral">{stageLabel(m.stage)}</Badge>
                              {isOverdue ? <StatusBadge status="OVERDUE" /> : <StatusBadge status={m.status} />}
                              {m.dueDate && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="size-3.5" aria-hidden />
                                  Due <time dateTime={m.dueDate}>{formatDay(m.dueDate)}</time>
                                </span>
                              )}
                            </div>
                          </div>
                          {!isDone && (
                            <Button variant="secondary" size="sm" onClick={() => completeMilestone(m.id)} className="shrink-0 self-start">
                              <Check aria-hidden />
                              Mark complete
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              {/* Activity */}
              <Card>
                <CardHeader title="Recent activity" />
                {!myResearchActivities || myResearchActivities.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-ink-muted">Updates to your research record will be listed here.</p>
                ) : (
                  <ol className="space-y-4 px-5 py-4">
                    {myResearchActivities.map((act) => (
                      <li key={act.id} className="relative border-l-2 border-line pl-4">
                        <p className="text-sm text-ink">{act.description}</p>
                        <time dateTime={act.createdAt} className="mt-0.5 block text-xs text-ink-muted">
                          {formatDateTime(act.createdAt)}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              {/* Supervisor */}
              <Card>
                <CardHeader title="Supervisor" />
                {!supervisor ? (
                  <EmptyState
                    icon={User}
                    title="No supervisor yet"
                    description="Find a supervisor in your department and send a supervision request."
                    action={
                      <Link href="/researchers" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                        Find a supervisor
                      </Link>
                    }
                    className="py-8"
                  />
                ) : (
                  <div className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={getProfileImageUrl(supervisor)}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={(e) => handleAvatarError(e, supervisor.name)}
                        className="size-12 shrink-0 rounded-full border border-line bg-surface-muted object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{supervisor.name}</p>
                        <p className="truncate text-sm text-ink-secondary">
                          {supervisor.supervisorProfile?.designation || 'Research Supervisor'}
                        </p>
                        {supervisor.department && <p className="truncate text-xs text-ink-muted">{supervisor.department}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href={`/researchers/${supervisor.id}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                        View profile
                      </Link>
                      <Link href={nexusHref} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                        <Network aria-hidden />
                        Open Nexus
                      </Link>
                    </div>
                  </div>
                )}
              </Card>

              {/* Progress reports */}
              <Card>
                <CardHeader
                  title="Progress reports"
                  description={supervisor ? `Reviewed by ${supervisor.name || 'your supervisor'}` : undefined}
                  actions={
                    supervisor && (
                      <Button size="sm" variant="secondary" onClick={() => setIsReportOpen(true)}>
                        <Plus aria-hidden />
                        Submit
                      </Button>
                    )
                  }
                />
                {!supervisor ? (
                  <p className="px-5 py-6 text-sm text-ink-muted">You can submit progress reports once a supervisor accepts your supervision request.</p>
                ) : !reports || reports.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-ink-muted">
                    No reports yet. Send one when you reach a milestone or your supervisor asks for an update.
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {reports.slice(0, 5).map((r: any) => {
                      const status = REPORT_STATUS[r.status] || { label: r.status, tone: 'neutral' as Tone };
                      return (
                        <li key={r.id} className="px-5 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 text-sm font-medium text-ink">{r.title}</p>
                            <Badge tone={status.tone}>{status.label}</Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-muted">Sent {formatDay(r.createdAt)}</p>
                          {r.feedback && (
                            <p className="mt-2 border-l-2 border-line-strong pl-2.5 text-sm text-ink-secondary">{r.feedback}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              {/* Materials */}
              <Card>
                <CardHeader
                  title="Research materials"
                  actions={
                    <Link href={nexusHref} className="text-sm font-medium text-brand hover:underline">
                      Open Nexus
                    </Link>
                  }
                />
                {!myResearchMaterials || myResearchMaterials.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-ink-muted">Files shared in your Nexus workspace will appear here.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {myResearchMaterials.slice(0, 5).map((mat) => {
                      const body = (
                        <>
                          <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{mat.name}</span>
                            <span className="block truncate text-xs text-ink-muted">{[mat.source, mat.size].filter(Boolean).join(' · ')}</span>
                          </span>
                        </>
                      );
                      return (
                        <li key={mat.id}>
                          {mat.url ? (
                            <a
                              href={mat.url}
                              target="_blank"
                              rel="noreferrer"
                              className="group flex items-center gap-3 px-5 py-3 transition-colors duration-fast hover:bg-surface-muted"
                            >
                              {body}
                              <ExternalLink className="size-3.5 shrink-0 text-ink-muted group-hover:text-brand" aria-hidden />
                              <span className="sr-only">(opens in a new tab)</span>
                            </a>
                          ) : (
                            <div className="flex items-center gap-3 px-5 py-3">{body}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Submit progress report */}
      <Dialog
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        dismissible={!submittingReport}
        title="Submit a progress report"
        description={supervisor ? `${supervisor.name || 'Your supervisor'} reviews it and can mark it on track, ask for more information, or flag it as delayed.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReportOpen(false)} disabled={submittingReport}>
              Cancel
            </Button>
            <Button type="submit" form="progress-report-form" loading={submittingReport} disabled={reportTitle.trim().length < 3}>
              Submit report
            </Button>
          </>
        }
      >
        <form
          id="progress-report-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!supervisor || reportTitle.trim().length < 3) return;
            setSubmittingReport(true);
            try {
              await submitReport({
                title: reportTitle.trim(),
                description: reportSummary.trim() || undefined,
                evidenceUrl: reportEvidence.trim() || undefined,
                supervisorId: supervisor.id,
              });
              addToast('Report sent to your supervisor.', 'success');
              setReportTitle('');
              setReportSummary('');
              setReportEvidence('');
              setIsReportOpen(false);
            } catch (err: any) {
              addToast(err?.message || 'The report could not be submitted.', 'error');
            } finally {
              setSubmittingReport(false);
            }
          }}
          className="space-y-4"
        >
          <Field label="Title" htmlFor="report-title" required hint="For example, the period or milestone it covers.">
            <input id="report-title" type="text" required value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} className="cb-input" />
          </Field>
          <Field label="Summary" htmlFor="report-summary" hint="What you did, what's next, and anything blocking you.">
            <textarea id="report-summary" rows={6} value={reportSummary} onChange={(e) => setReportSummary(e.target.value)} className="cb-input resize-y" />
          </Field>
          <Field label="Evidence link" htmlFor="report-evidence" hint="Optional. A draft, dataset or results shared elsewhere.">
            <input id="report-evidence" type="url" placeholder="https://" value={reportEvidence} onChange={(e) => setReportEvidence(e.target.value)} className="cb-input" />
          </Field>
        </form>
      </Dialog>

      {/* Edit research details */}
      <Dialog
        open={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        size="lg"
        title="Edit research details"
        description="Your supervisor sees these details on your profile and in the Supervision Panel."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditProfileOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="research-profile-form">
              Save changes
            </Button>
          </>
        }
      >
        <form id="research-profile-form" onSubmit={handleSaveProfile} className="space-y-4">
          <Field label="Thesis title" htmlFor="rp-title" required>
            <input id="rp-title" type="text" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="cb-input" />
          </Field>
          <Field label="Research area" htmlFor="rp-area" required hint="For example: Federated learning, Thin-film photovoltaics.">
            <input id="rp-area" type="text" required value={editArea} onChange={(e) => setEditArea(e.target.value)} className="cb-input" />
          </Field>
          <Field label="Abstract" htmlFor="rp-abstract">
            <textarea id="rp-abstract" rows={4} value={editAbstract} onChange={(e) => setEditAbstract(e.target.value)} className="cb-input resize-y" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current stage" htmlFor="rp-stage">
              <select id="rp-stage" value={editStage} onChange={(e) => setEditStage(e.target.value as ResearchStage)} className="cb-input">
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status" htmlFor="rp-status">
              <select id="rp-status" value={editStatus} onChange={(e) => setEditStatus(e.target.value as ResearchStatus)} className="cb-input">
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On hold</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </Field>
            <Field label="Start date" htmlFor="rp-start">
              <input id="rp-start" type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="cb-input" />
            </Field>
            <Field label="Target completion" htmlFor="rp-end">
              <input
                id="rp-end"
                type="date"
                value={editCompletionDate}
                min={editStartDate || undefined}
                onChange={(e) => setEditCompletionDate(e.target.value)}
                className="cb-input"
              />
            </Field>
          </div>
        </form>
      </Dialog>

      {/* Add milestone */}
      <Dialog
        open={isAddMilestoneOpen}
        onClose={() => setIsAddMilestoneOpen(false)}
        size="lg"
        title="Add milestone"
        description="A concrete step towards your thesis, such as a chapter draft or a progress review."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddMilestoneOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="milestone-form">
              Add milestone
            </Button>
          </>
        }
      >
        <form id="milestone-form" onSubmit={handleCreateMilestoneSubmit} className="space-y-4">
          <Field label="Title" htmlFor="ms-title" required>
            <input
              id="ms-title"
              type="text"
              required
              placeholder="e.g. Chapter 2 draft to supervisor"
              value={mTitle}
              onChange={(e) => setMTitle(e.target.value)}
              className="cb-input"
            />
          </Field>
          <Field label="Details" htmlFor="ms-desc" hint="Optional. What does done look like?">
            <textarea id="ms-desc" rows={3} value={mDesc} onChange={(e) => setMDesc(e.target.value)} className="cb-input resize-y" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Stage" htmlFor="ms-stage">
              <select id="ms-stage" value={mStage} onChange={(e) => setMStage(e.target.value as ResearchStage)} className="cb-input">
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority" htmlFor="ms-priority">
              <select id="ms-priority" value={mPriority} onChange={(e) => setMPriority(e.target.value as MilestonePriority)} className="cb-input">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </Field>
            <Field label="Due date" htmlFor="ms-due">
              <input id="ms-due" type="date" value={mDueDate} onChange={(e) => setMDueDate(e.target.value)} className="cb-input" />
            </Field>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
