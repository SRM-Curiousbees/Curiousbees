'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  LogOut,
  Megaphone,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings2,
  UploadCloud,
  User,
  Video,
} from 'lucide-react';
import type { IntegrationProvider, MeetingProvider, ResearchMeeting, Workspace } from '@curiousbees/types';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { handleAvatarError } from '@/lib/avatar';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Field, DetailItem } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkspaceFileDownloadButton, formatWorkspaceFileSize } from '@/components/workspace/WorkspaceFileDownloadButton';

type TabId = 'overview' | 'tasks' | 'files' | 'meetings' | 'discussions' | 'activity' | 'integrations';

// Older links used tab ids that no longer have their own view.
const TAB_ALIASES: Record<string, TabId> = {
  research: 'overview',
  publications: 'overview',
  milestones: 'tasks',
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Milestones' },
  { id: 'files', label: 'Files' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'discussions', label: 'Discussion' },
  { id: 'activity', label: 'Activity' },
  { id: 'integrations', label: 'Tools' },
];

// The detail endpoint returns a little more than the shared Workspace type describes.
type WorkspaceDetail = Workspace & {
  researchDomain?: string | null;
  researchTopic?: string | null;
  researchDomainRef?: { name: string } | null;
  researchTopicRef?: { name: string } | null;
  supervisor?: { id: string; name: string | null; email: string } | null;
};

const MEETING_PROVIDER_LABEL: Record<MeetingProvider, string> = {
  GOOGLE_MEET: 'Google Meet',
  ZOOM: 'Zoom',
  EXTERNAL: 'External link',
};

const COLLAB_PROVIDER_LABEL: Record<IntegrationProvider, string> = {
  GOOGLE_WORKSPACE: 'Google Workspace',
  ZOOM_WORKPLACE: 'Zoom Workplace',
  EXTERNAL: 'External tools',
};

const ACCEPTED_FILES = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.txt,.csv';
// A meeting stays "upcoming" for an hour after its start so people can still join late.
const JOIN_GRACE_MS = 60 * 60 * 1000;

function toDate(value?: Date | string | null) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

function formatDate(value?: Date | string | null) {
  return toDate(value)?.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) ?? '';
}

function formatTime(value?: Date | string | null) {
  return toDate(value)?.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) ?? '';
}

function Avatar({ src, className, name }: { src?: string | null; className?: string; name?: string | null }) {
  return src ? (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={(e) => handleAvatarError(e, name)}
      className={cn('size-8 shrink-0 rounded-full border border-line bg-surface-muted object-cover', className)}
    />
  ) : (
    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-muted', className)}>
      <User className="size-3.5" aria-hidden />
    </span>
  );
}

function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading workspace">
      <Skeleton className="mb-6 h-4 w-28" />
      <Skeleton className="h-8 w-2/3 max-w-md" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      <div className="mt-8 flex gap-4 border-b border-line pb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const {
    currentUser,
    activeWorkspace,
    fetchWorkspaceDetails,
    addWorkspaceFile,
    uploadWorkspaceFile,
    addWorkspaceMilestone,
    toggleWorkspaceMilestone,
    addWorkspaceAnnouncement,
    leaveWorkspace,
    workspaceMeetings,
    fetchWorkspaceMeetings,
    createWorkspaceMeeting,
    cancelWorkspaceMeeting,
    setWorkspaceCollaborationProvider,
    connectWorkspaceChatSpace,
    integrationConnections,
    fetchIntegrationStatus,
    addToast,
  } = useStore();

  // The URL (?tab=) decides the tab, so links from elsewhere open the right view.
  const tabParam = searchParams.get('tab') || 'overview';
  const activeTab: TabId = TAB_ALIASES[tabParam] || (TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'overview');
  const selectTab = (tab: TabId) => router.replace(`/workspace/${workspaceId}?tab=${tab}`, { scroll: false });

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      await fetchWorkspaceDetails(workspaceId);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
    fetchWorkspaceMeetings(workspaceId);
  }, [workspaceId, fetchWorkspaceDetails, fetchWorkspaceMeetings]);

  useEffect(() => {
    if (!workspaceId) return;
    load();
    fetchIntegrationStatus();
  }, [workspaceId, load, fetchIntegrationStatus]);

  // Dialogs
  const [fileOpen, setFileOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);

  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDesc, setMeetingDesc] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(30);
  const [meetingProvider, setMeetingProvider] = useState<MeetingProvider>('GOOGLE_MEET');
  const [customMeetingUrl, setCustomMeetingUrl] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ResearchMeeting | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [connectingChat, setConnectingChat] = useState(false);
  const [savingProvider, setSavingProvider] = useState<IntegrationProvider | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const meetings = useMemo(() => workspaceMeetings[workspaceId] || [], [workspaceMeetings, workspaceId]);
  const { upcomingMeetings, pastMeetings } = useMemo(() => {
    const cutoff = Date.now() - JOIN_GRACE_MS;
    const isUpcoming = (m: ResearchMeeting) => m.status === 'SCHEDULED' && new Date(m.scheduledAt).getTime() >= cutoff;
    const byStart = (a: ResearchMeeting, b: ResearchMeeting) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    return {
      upcomingMeetings: meetings.filter(isUpcoming).sort(byStart),
      pastMeetings: meetings.filter((m) => !isUpcoming(m)).sort((a, b) => byStart(b, a)),
    };
  }, [meetings]);

  const workspace = activeWorkspace && activeWorkspace.id === workspaceId ? (activeWorkspace as WorkspaceDetail) : null;

  if (loadState === 'error' && !workspace) {
    return (
      <div className="mx-auto max-w-md py-16">
        <EmptyState
          icon={FolderOpen}
          title="This workspace isn't available"
          description="It may have been removed, or you aren't one of its members. Workspaces are visible only to the people working in them."
          action={
            <>
              <Button variant="secondary" onClick={load}>
                <RefreshCw aria-hidden />
                Try again
              </Button>
              <Link href="/workspace" className={buttonVariants({ variant: 'primary' })}>
                All workspaces
              </Link>
            </>
          }
        />
      </div>
    );
  }

  if (!workspace) return <WorkspaceSkeleton />;

  const members = workspace.members || [];
  const myMembership = members.find((m) => m.userId === currentUser?.id);
  // The API lets only workspace owners create milestones; any member can complete them.
  const canAddMilestones = myMembership?.role === 'OWNER';
  const milestones = [...(workspace.milestones || [])].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const ad = toDate(a.dueDate)?.getTime() ?? Infinity;
    const bd = toDate(b.dueDate)?.getTime() ?? Infinity;
    return ad - bd;
  });
  const completedCount = milestones.filter((m) => m.completed).length;
  const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
  const openMilestones = milestones.filter((m) => !m.completed);
  const files = workspace.files || [];
  const announcements = workspace.announcements || [];
  const provider: IntegrationProvider = workspace.collaborationProvider || 'GOOGLE_WORKSPACE';
  const googleConnected = integrationConnections?.google?.status === 'CONNECTED';
  const zoomConnected = integrationConnections?.zoom?.status === 'CONNECTED';
  const domain = workspace.researchDomainRef?.name || workspace.researchDomain;
  const topic = workspace.researchTopicRef?.name || workspace.researchTopic;
  const now = Date.now();

  const isOverdue = (dueDate?: Date | string | null) => {
    const d = toDate(dueDate);
    return !!d && d.getTime() < now - 24 * 60 * 60 * 1000;
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const resetFileForm = () => {
    setFileName('');
    setFileUrl('');
    setSelectedFile(null);
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !fileUrl.trim()) {
      addToast('Choose a file to upload or paste a link.', 'error');
      return;
    }
    setUploading(true);
    try {
      if (selectedFile) {
        await uploadWorkspaceFile(workspaceId, selectedFile, fileName.trim() || selectedFile.name);
        addToast(`Uploaded ${fileName.trim() || selectedFile.name}.`, 'success');
      } else {
        await addWorkspaceFile(workspaceId, fileName.trim() || fileUrl.trim(), fileUrl.trim());
        addToast('Link added to the workspace.', 'success');
      }
      resetFileForm();
      setFileOpen(false);
    } catch (err: any) {
      addToast(err?.message || 'The file could not be added.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim()) return;
    setSavingMilestone(true);
    try {
      await addWorkspaceMilestone(workspaceId, milestoneTitle.trim(), milestoneDesc.trim(), milestoneDueDate || undefined);
      addToast(`Milestone added: ${milestoneTitle.trim()}`, 'success');
      setMilestoneTitle('');
      setMilestoneDesc('');
      setMilestoneDueDate('');
      setMilestoneOpen(false);
    } catch (err: any) {
      addToast(err?.message || 'The milestone could not be added.', 'error');
    } finally {
      setSavingMilestone(false);
    }
  };

  const handleToggleMilestone = async (id: string, completed: boolean) => {
    setTogglingId(id);
    try {
      await toggleWorkspaceMilestone(workspaceId, id, completed);
    } catch (err: any) {
      addToast(err?.message || 'The milestone could not be updated.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTitle.trim() || !updateContent.trim()) return;
    setPostingUpdate(true);
    try {
      await addWorkspaceAnnouncement(workspaceId, updateTitle.trim(), updateContent.trim());
      addToast('Update posted to the workspace.', 'success');
      setUpdateTitle('');
      setUpdateContent('');
      setUpdateOpen(false);
    } catch (err: any) {
      addToast(err?.message || 'The update could not be posted.', 'error');
    } finally {
      setPostingUpdate(false);
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !meetingDate || !meetingTime) {
      addToast('Add a title, date and time for the meeting.', 'error');
      return;
    }
    setScheduling(true);
    try {
      await createWorkspaceMeeting(workspaceId, {
        title: meetingTitle.trim(),
        description: meetingDesc.trim(),
        provider: meetingProvider,
        scheduledAt: new Date(`${meetingDate}T${meetingTime}`),
        duration: Number(meetingDuration),
        externalMeetingUrl: meetingProvider === 'EXTERNAL' ? customMeetingUrl.trim() : undefined,
      });
      addToast(`Scheduled "${meetingTitle.trim()}" on ${MEETING_PROVIDER_LABEL[meetingProvider]}.`, 'success');
      setMeetingTitle('');
      setMeetingDesc('');
      setMeetingDate('');
      setMeetingTime('');
      setCustomMeetingUrl('');
      setMeetingOpen(false);
    } catch (err: any) {
      addToast(err?.message || 'The meeting could not be scheduled.', 'error');
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelMeeting = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelWorkspaceMeeting(workspaceId, cancelTarget.id);
      addToast('Meeting cancelled.', 'info');
      setCancelTarget(null);
    } catch (err: any) {
      addToast(err?.message || 'The meeting could not be cancelled.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleConnectChat = async () => {
    setConnectingChat(true);
    try {
      await connectWorkspaceChatSpace(workspaceId);
      addToast('Google Chat space created for this workspace.', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Connect Google Workspace in Settings, then try again.', 'error');
    } finally {
      setConnectingChat(false);
    }
  };

  const handleSetProvider = async (next: IntegrationProvider) => {
    if (next === provider || savingProvider) return;
    setSavingProvider(next);
    try {
      await setWorkspaceCollaborationProvider(workspaceId, next);
      addToast(`This workspace now uses ${COLLAB_PROVIDER_LABEL[next]}.`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'The collaboration tool could not be changed.', 'error');
    } finally {
      setSavingProvider(null);
    }
  };

  const openMeetingDialog = () => {
    setMeetingProvider(provider === 'ZOOM_WORKPLACE' ? 'ZOOM' : 'GOOGLE_MEET');
    setMeetingOpen(true);
  };

  // Activity: built only from records the workspace already has.
  const activity = [
    ...files.map((f) => ({
      id: `f-${f.id}`,
      at: f.uploadedAt,
      icon: f.storageKey ? UploadCloud : Link2,
      text: (
        <>
          <span className="font-medium text-ink">{f.uploadedBy?.name || 'A member'}</span> {f.storageKey ? 'uploaded' : 'linked'}{' '}
          <span className="font-medium text-ink">{f.name}</span>
        </>
      ),
    })),
    ...(workspace.milestones || []).map((m) => ({
      id: `m-${m.id}`,
      at: m.createdAt,
      icon: CheckSquare,
      text: (
        <>
          Milestone added: <span className="font-medium text-ink">{m.title}</span>
        </>
      ),
    })),
    ...announcements.map((a) => ({
      id: `a-${a.id}`,
      at: a.createdAt,
      icon: Megaphone,
      text: (
        <>
          <span className="font-medium text-ink">{a.author?.name || 'A member'}</span> posted an update:{' '}
          <span className="font-medium text-ink">{a.title}</span>
        </>
      ),
    })),
    ...meetings.map((m) => ({
      id: `r-${m.id}`,
      at: m.createdAt,
      icon: Video,
      text: (
        <>
          <span className="font-medium text-ink">{m.createdBy?.name || 'A member'}</span> scheduled{' '}
          <span className="font-medium text-ink">{m.title}</span> for {formatDate(m.scheduledAt)}
          {m.status === 'CANCELLED' && ' (later cancelled)'}
        </>
      ),
    })),
    {
      id: 'created',
      at: workspace.createdAt,
      icon: FolderOpen,
      text: <>Workspace created</>,
    },
  ].sort((a, b) => (toDate(b.at)?.getTime() ?? 0) - (toDate(a.at)?.getTime() ?? 0));

  const nextMeeting = upcomingMeetings[0];

  // ── Pieces ─────────────────────────────────────────────────────────────────

  const meetingRow = (meeting: ResearchMeeting) => {
    const start = toDate(meeting.scheduledAt);
    const mine = meeting.createdById === currentUser?.id;
    return (
      <li key={meeting.id} className="flex items-start gap-4 px-5 py-4">
        <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-line bg-surface-muted py-1.5 text-center sm:w-14" aria-hidden>
          <span className="text-xs font-medium uppercase text-ink-muted">{start?.toLocaleDateString(undefined, { month: 'short' })}</span>
          <span className="text-xl font-semibold tabular-nums text-ink">{start?.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1 sm:flex sm:items-start sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{meeting.title}</h3>
            <Badge tone={meeting.provider === 'GOOGLE_MEET' ? 'success' : meeting.provider === 'ZOOM' ? 'brand' : 'plum'}>
              {MEETING_PROVIDER_LABEL[meeting.provider]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-ink-secondary">
            <span className="sr-only">{formatDate(meeting.scheduledAt)}, </span>
            {start?.toLocaleDateString(undefined, { weekday: 'long' })} · {formatTime(meeting.scheduledAt)} · {meeting.duration} min
            {meeting.createdBy?.name && <> · Hosted by {meeting.createdBy.name}</>}
          </p>
          {meeting.description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{meeting.description}</p>}
        </div>
        <div className="mt-3 flex shrink-0 gap-2 sm:mt-0 sm:flex-col sm:items-stretch">
          {meeting.meetingUrl && (
            <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: 'sm' })}>
              Join
              <ExternalLink aria-hidden />
            </a>
          )}
          {mine && (
            <Button variant="ghost" size="sm" onClick={() => setCancelTarget(meeting)}>
              Cancel
            </Button>
          )}
        </div>
        </div>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/workspace"
        className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-ink-muted transition-colors duration-fast hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Workspaces
      </Link>

      <PageHeader
        meta={
          <span className="inline-flex items-center gap-2">
            <FolderOpen className="size-4" aria-hidden />
            Research workspace
          </span>
        }
        title={workspace.title}
        description={workspace.description || undefined}
        actions={
          <>
            <Button variant="secondary" onClick={() => setFileOpen(true)}>
              <UploadCloud aria-hidden />
              Add file
            </Button>
            <Button onClick={openMeetingDialog}>
              <Video aria-hidden />
              Schedule meeting
            </Button>
          </>
        }
        className="pb-5"
      />

      {/* Who is here and how far along */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m) => (
              <Avatar key={m.userId} src={m.user?.image} className="ring-2 ring-surface" />
            ))}
          </div>
          <p className="min-w-0 truncate text-sm text-ink-secondary">
            {members.length === 1 ? '1 member' : `${members.length} members`}
            {members.length > 0 && <span className="text-ink-muted"> · {members.map((m) => m.user?.name).filter(Boolean).join(', ')}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:w-64">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200"
            role="progressbar"
            aria-label="Milestones complete"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="h-full rounded-full bg-brand transition-[width] duration-slow ease-out" style={{ width: `${progress}%` }} />
          </div>
          <span className="whitespace-nowrap text-sm tabular-nums text-ink-muted">
            {milestones.length > 0 ? `${completedCount}/${milestones.length} milestones` : 'No milestones'}
          </span>
        </div>
      </div>

      <div role="tablist" aria-label="Workspace sections" className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          const count =
            tab.id === 'tasks' ? openMilestones.length : tab.id === 'files' ? files.length : tab.id === 'meetings' ? upcomingMeetings.length : undefined;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`ws-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls="ws-panel"
              onClick={() => selectTab(tab.id)}
              className={cn(
                '-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition-colors duration-fast',
                selected ? 'border-brand font-medium text-ink' : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className="rounded-full bg-neutral-100 px-1.5 py-px text-xs tabular-nums text-ink-secondary">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div id="ws-panel" role="tabpanel" aria-labelledby={`ws-tab-${activeTab}`} key={activeTab} className="cb-page-enter">
        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <Card>
                <CardHeader
                  title="Updates"
                  description="Notes for everyone in this workspace."
                  actions={
                    <Button variant="secondary" size="sm" onClick={() => setUpdateOpen(true)}>
                      <Plus aria-hidden />
                      Post update
                    </Button>
                  }
                />
                {announcements.length > 0 ? (
                  <ul className="divide-y divide-line">
                    {announcements.map((a) => (
                      <li key={a.id} className="flex gap-3 px-5 py-4">
                        <Avatar src={a.author?.image} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-ink-muted">
                            <span className="font-medium text-ink">{a.author?.name || 'A member'}</span> · {formatDate(a.createdAt)}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold text-ink">{a.title}</h3>
                          <p className="mt-1 whitespace-pre-line break-words text-sm text-ink-secondary">{a.content}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={Megaphone}
                    title="No updates yet"
                    description="Post an update to share progress, decisions or next steps with the other members."
                    className="py-10"
                  />
                )}
              </Card>

              <Card>
                <CardHeader
                  title="Open milestones"
                  description={milestones.length > 0 ? `${completedCount} of ${milestones.length} complete` : undefined}
                  actions={
                    milestones.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => selectTab('tasks')}>
                        View all
                      </Button>
                    )
                  }
                />
                {openMilestones.length > 0 ? (
                  <ul className="divide-y divide-line">
                    {openMilestones.slice(0, 4).map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <span className="min-w-0 truncate text-sm text-ink">{m.title}</span>
                        {m.dueDate &&
                          (isOverdue(m.dueDate) ? (
                            <StatusBadge status="OVERDUE" />
                          ) : (
                            <span className="shrink-0 text-sm tabular-nums text-ink-muted">Due {formatDate(m.dueDate)}</span>
                          ))}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-6 text-sm text-ink-muted">
                    {milestones.length > 0
                      ? 'Every milestone is complete.'
                      : canAddMilestones
                        ? 'Add milestones to track what this workspace is working towards.'
                        : 'The workspace owner has not added milestones yet.'}
                  </p>
                )}
              </Card>
            </div>

            <div className="min-w-0 space-y-6">
              <Card>
                <CardHeader title="Next meeting" />
                <CardBody>
                  {nextMeeting ? (
                    <div>
                      <p className="text-sm font-semibold text-ink">{nextMeeting.title}</p>
                      <p className="mt-1 text-sm text-ink-secondary">
                        {formatDate(nextMeeting.scheduledAt)} · {formatTime(nextMeeting.scheduledAt)}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {MEETING_PROVIDER_LABEL[nextMeeting.provider]} · {nextMeeting.duration} min
                      </p>
                      {nextMeeting.meetingUrl && (
                        <a
                          href={nextMeeting.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ size: 'sm' }), 'mt-4 w-full')}
                        >
                          Join meeting
                          <ExternalLink aria-hidden />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-ink-muted">Nothing scheduled.</p>
                      <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={openMeetingDialog}>
                        Schedule meeting
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="About" />
                <CardBody>
                  <dl className="grid grid-cols-1 gap-4">
                    {domain && <DetailItem label="Research domain">{domain}</DetailItem>}
                    {topic && <DetailItem label="Topic">{topic}</DetailItem>}
                    {workspace.supervisor?.name && <DetailItem label="Supervisor">{workspace.supervisor.name}</DetailItem>}
                    <DetailItem label="Collaboration tool">{COLLAB_PROVIDER_LABEL[provider]}</DetailItem>
                    <DetailItem label="Created">{formatDate(workspace.createdAt)}</DetailItem>
                  </dl>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Members" />
                <ul className="divide-y divide-line">
                  {members.map((m) => (
                    <li key={m.userId} className="flex items-center gap-3 px-5 py-3">
                      <Avatar src={m.user?.image} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {m.user?.name || m.user?.email || 'Member'}
                          {m.userId === currentUser?.id && <span className="font-normal text-ink-muted"> (you)</span>}
                        </p>
                        {m.user?.department && <p className="truncate text-xs text-ink-muted">{m.user.department}</p>}
                      </div>
                      <Badge tone={m.role === 'OWNER' ? 'brand' : 'neutral'}>{m.role === 'OWNER' ? 'Owner' : 'Member'}</Badge>
                    </li>
                  ))}
                </ul>
                {myMembership && (
                  <div className="border-t border-line px-5 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setLeaveOpen(true)}
                    >
                      <LogOut className="size-4" aria-hidden />
                      Leave workspace
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ── Milestones ── */}
        {activeTab === 'tasks' && (
          <Card>
            <CardHeader
              title="Milestones"
              description={
                canAddMilestones
                  ? 'Targets for this workspace. Any member can mark one complete.'
                  : 'The workspace owner sets milestones. Any member can mark one complete.'
              }
              actions={
                canAddMilestones && (
                  <Button size="sm" onClick={() => setMilestoneOpen(true)}>
                    <Plus aria-hidden />
                    Add milestone
                  </Button>
                )
              }
            />
            {milestones.length > 0 ? (
              <ul className="divide-y divide-line">
                {milestones.map((m) => {
                  const overdue = !m.completed && isOverdue(m.dueDate);
                  return (
                    <li key={m.id} className="flex items-start gap-3 px-5 py-4">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={m.completed}
                        aria-label={`Mark "${m.title}" ${m.completed ? 'not complete' : 'complete'}`}
                        disabled={togglingId === m.id}
                        onClick={() => handleToggleMilestone(m.id, !m.completed)}
                        className={cn(
                          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-fast disabled:opacity-50',
                          m.completed ? 'border-success-600 bg-success text-white' : 'border-line-strong bg-surface hover:border-brand-500',
                        )}
                      >
                        {m.completed && <Check className="size-3.5" aria-hidden />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm font-medium', m.completed ? 'text-ink-muted line-through' : 'text-ink')}>{m.title}</p>
                        {m.description && <p className="mt-0.5 text-sm text-ink-muted">{m.description}</p>}
                        {m.dueDate && (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-muted">
                            <Calendar className="size-3.5" aria-hidden />
                            Due {formatDate(m.dueDate)}
                          </p>
                        )}
                      </div>
                      {m.completed ? <StatusBadge status="COMPLETED" /> : overdue ? <StatusBadge status="OVERDUE" /> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="No milestones yet"
                description={
                  canAddMilestones
                    ? 'Break the research into deliverables with due dates so everyone can see progress.'
                    : 'Milestones added by the workspace owner will appear here.'
                }
                action={
                  canAddMilestones && (
                    <Button onClick={() => setMilestoneOpen(true)}>
                      <Plus aria-hidden />
                      Add milestone
                    </Button>
                  )
                }
              />
            )}
          </Card>
        )}

        {/* ── Files ── */}
        {activeTab === 'files' && (
          <Card>
            <CardHeader
              title="Files"
              description="Uploads are stored privately and open only for workspace members."
              actions={
                <Button size="sm" onClick={() => setFileOpen(true)}>
                  <Plus aria-hidden />
                  Add file
                </Button>
              }
            />
            {files.length > 0 ? (
              <ul className="divide-y divide-line">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-muted text-ink-muted">
                      {file.storageKey ? <FileText className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink" title={file.name}>
                        {file.name}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {[file.uploadedBy?.name, formatDate(file.uploadedAt), formatWorkspaceFileSize(file)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <WorkspaceFileDownloadButton
                      workspaceId={workspaceId}
                      file={file}
                      label={file.storageKey ? 'Download' : 'Open'}
                      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={UploadCloud}
                title="No files yet"
                description="Upload papers, datasets or drafts (up to 50 MB), or link to something stored elsewhere."
                action={
                  <Button onClick={() => setFileOpen(true)}>
                    <Plus aria-hidden />
                    Add file
                  </Button>
                }
              />
            )}
          </Card>
        )}

        {/* ── Meetings ── */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Upcoming"
                description="Meetings stay joinable for an hour after they start."
                actions={
                  <Button size="sm" onClick={openMeetingDialog}>
                    <Plus aria-hidden />
                    Schedule
                  </Button>
                }
              />
              {upcomingMeetings.length > 0 ? (
                <ul className="divide-y divide-line">{upcomingMeetings.map(meetingRow)}</ul>
              ) : (
                <EmptyState
                  icon={Video}
                  title="No upcoming meetings"
                  description="Schedule a Google Meet or Zoom call, or add a link to any other video tool."
                  action={<Button onClick={openMeetingDialog}>Schedule meeting</Button>}
                />
              )}
            </Card>

            {pastMeetings.length > 0 && (
              <Card>
                <CardHeader title="Past and cancelled" />
                <ul className="divide-y divide-line">
                  {pastMeetings.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{m.title}</p>
                        <p className="text-xs text-ink-muted">
                          {formatDate(m.scheduledAt)} · {m.duration} min · {MEETING_PROVIDER_LABEL[m.provider]}
                        </p>
                      </div>
                      {m.status === 'SCHEDULED' ? <Badge>Ended</Badge> : <StatusBadge status={m.status} />}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {/* ── Discussion ── */}
        {activeTab === 'discussions' && (
          <Card className="max-w-3xl">
            {provider === 'GOOGLE_WORKSPACE' ? (
              <>
                <CardHeader
                  title="Google Chat space"
                  description="Ongoing conversation for this workspace happens in Google Chat. CuriousBees doesn't store the messages."
                  actions={workspace.googleChatSpaceUrl ? <Badge tone="success">Connected</Badge> : <Badge>Not set up</Badge>}
                />
                <CardBody className="space-y-4">
                  {workspace.googleChatSpaceUrl ? (
                    <>
                      <p className="text-sm text-ink-secondary">
                        Every member of this workspace was invited to the space when it was created.
                      </p>
                      <a href={workspace.googleChatSpaceUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
                        <MessageSquare aria-hidden />
                        Open in Google Chat
                        <ExternalLink aria-hidden />
                      </a>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-ink-secondary">
                        Create a dedicated space and invite all {members.length} members. It's created with your Google account.
                      </p>
                      {integrationConnections && !googleConnected && (
                        <p className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800">
                          Connect your Google Workspace account first.{' '}
                          <Link href="/settings?tab=integrations" className="font-medium underline underline-offset-2">
                            Go to connected apps
                          </Link>
                        </p>
                      )}
                      <Button onClick={handleConnectChat} loading={connectingChat} disabled={!!integrationConnections && !googleConnected}>
                        <Plus aria-hidden />
                        Create chat space
                      </Button>
                    </>
                  )}
                </CardBody>
              </>
            ) : (
              <>
                <CardHeader title={COLLAB_PROVIDER_LABEL[provider]} description="This workspace talks things through in scheduled calls." />
                <CardBody className="space-y-4">
                  <p className="text-sm text-ink-secondary">
                    {provider === 'ZOOM_WORKPLACE'
                      ? 'Zoom has no chat space here. Schedule a Zoom meeting when the group needs to talk.'
                      : 'Schedule a meeting with a link to the tool your group uses.'}{' '}
                    To use a Google Chat space instead, switch the collaboration tool to Google Workspace.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={openMeetingDialog}>
                      <Video aria-hidden />
                      Schedule meeting
                    </Button>
                    <Button variant="secondary" onClick={() => selectTab('integrations')}>
                      Change tool
                    </Button>
                  </div>
                </CardBody>
              </>
            )}
          </Card>
        )}

        {/* ── Activity ── */}
        {activeTab === 'activity' && (
          <Card className="max-w-3xl">
            <CardHeader title="Activity" description="Files, milestones, updates and meetings in this workspace, newest first." />
            <ol className="px-5 py-4">
              {activity.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < activity.length - 1 && <span className="absolute left-4 top-9 h-[calc(100%-2.25rem)] w-px bg-line" aria-hidden />}
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-muted">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 pt-1">
                      <p className="break-words text-sm text-ink-secondary">{item.text}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                        <Clock className="size-3" aria-hidden />
                        {formatDate(item.at)} {formatTime(item.at) && `· ${formatTime(item.at)}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        )}

        {/* ── Tools ── */}
        {activeTab === 'integrations' && (
          <Card className="max-w-3xl">
            <CardHeader
              title="Collaboration tool"
              description="Which service this workspace uses for its chat space and meetings. Any member can change it."
            />
            <CardBody>
              <div role="radiogroup" aria-label="Collaboration tool" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    { id: 'GOOGLE_WORKSPACE', detail: 'Google Chat space and Google Meet', connected: googleConnected, account: integrationConnections?.google },
                    { id: 'ZOOM_WORKPLACE', detail: 'Zoom meetings', connected: zoomConnected, account: integrationConnections?.zoom },
                  ] as const
                ).map((option) => {
                  const selected = provider === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!!savingProvider}
                      onClick={() => handleSetProvider(option.id)}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-fast disabled:cursor-wait',
                        selected ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-line bg-surface hover:border-line-strong',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                          selected ? 'border-brand-600' : 'border-line-strong',
                        )}
                        aria-hidden
                      >
                        {selected && <span className="size-2 rounded-full bg-brand" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{COLLAB_PROVIDER_LABEL[option.id]}</span>
                        <span className="block text-sm text-ink-muted">{option.detail}</span>
                        <span className="mt-2 block text-xs text-ink-muted">
                          {savingProvider === option.id
                            ? 'Saving…'
                            : option.connected
                              ? `Your account: ${option.account?.externalAccountEmail || 'connected'}`
                              : 'Your account is not connected'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-muted">Meetings and chat spaces are created with the account of the person who sets them up.</p>
                <Link href="/settings?tab=integrations" className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'shrink-0')}>
                  <Settings2 aria-hidden />
                  Connected apps
                </Link>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* ── Dialogs ── */}
      <Dialog
        open={fileOpen}
        onClose={() => {
          setFileOpen(false);
          resetFileForm();
        }}
        dismissible={!uploading}
        title="Add a file"
        description="Upload a file, or link to one stored elsewhere."
        footer={
          <>
            <Button
              variant="secondary"
              disabled={uploading}
              onClick={() => {
                setFileOpen(false);
                resetFileForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="ws-file-form" loading={uploading} disabled={!selectedFile && !fileUrl.trim()}>
              {selectedFile ? 'Upload' : 'Add link'}
            </Button>
          </>
        }
      >
        <form id="ws-file-form" onSubmit={handleAddFile} className="space-y-4">
          <div>
            <input
              type="file"
              id="ws-file-input"
              className="peer sr-only"
              accept={ACCEPTED_FILES}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);
                if (file) {
                  setFileUrl('');
                  if (!fileName) setFileName(file.name);
                }
              }}
            />
            <label
              htmlFor="ws-file-input"
              className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-line-strong bg-surface-muted px-4 py-6 text-center transition-colors duration-fast hover:border-brand-400 peer-focus-visible:border-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/30"
            >
              <UploadCloud className="size-6 text-brand" aria-hidden />
              {selectedFile ? (
                <>
                  <span className="max-w-full truncate text-sm font-medium text-ink">{selectedFile.name}</span>
                  <span className="text-xs text-ink-muted">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · choose a different file
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-ink">Choose a file</span>
                  <span className="text-xs text-ink-muted">PDF, Office documents, images, CSV, text or ZIP, up to 50 MB</span>
                </>
              )}
            </label>
          </div>

          <div className="flex items-center gap-3 text-xs text-ink-muted" aria-hidden>
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <Field label="Link" htmlFor="ws-file-url" hint="A shared drive, repository or paper URL.">
            <input
              id="ws-file-url"
              type="url"
              value={fileUrl}
              disabled={!!selectedFile}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://"
              className="cb-input"
            />
          </Field>

          <Field label="Name" htmlFor="ws-file-name" hint="Optional. Shown to members instead of the file name.">
            <input id="ws-file-name" type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} className="cb-input" />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={milestoneOpen}
        onClose={() => setMilestoneOpen(false)}
        dismissible={!savingMilestone}
        title="Add a milestone"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMilestoneOpen(false)} disabled={savingMilestone}>
              Cancel
            </Button>
            <Button type="submit" form="ws-milestone-form" loading={savingMilestone} disabled={!milestoneTitle.trim()}>
              Add milestone
            </Button>
          </>
        }
      >
        <form id="ws-milestone-form" onSubmit={handleAddMilestone} className="space-y-4">
          <Field label="Title" htmlFor="ws-ms-title" required>
            <input id="ws-ms-title" type="text" required value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} className="cb-input" />
          </Field>
          <Field label="What counts as done" htmlFor="ws-ms-desc">
            <textarea id="ws-ms-desc" rows={3} value={milestoneDesc} onChange={(e) => setMilestoneDesc(e.target.value)} className="cb-input resize-y" />
          </Field>
          <Field label="Due date" htmlFor="ws-ms-due">
            <input id="ws-ms-due" type="date" value={milestoneDueDate} onChange={(e) => setMilestoneDueDate(e.target.value)} className="cb-input" />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        dismissible={!postingUpdate}
        title="Post an update"
        description="Every member of this workspace will see it on the overview."
        footer={
          <>
            <Button variant="secondary" onClick={() => setUpdateOpen(false)} disabled={postingUpdate}>
              Cancel
            </Button>
            <Button type="submit" form="ws-update-form" loading={postingUpdate} disabled={!updateTitle.trim() || !updateContent.trim()}>
              Post update
            </Button>
          </>
        }
      >
        <form id="ws-update-form" onSubmit={handlePostUpdate} className="space-y-4">
          <Field label="Headline" htmlFor="ws-up-title" required>
            <input id="ws-up-title" type="text" required value={updateTitle} onChange={(e) => setUpdateTitle(e.target.value)} className="cb-input" />
          </Field>
          <Field label="Details" htmlFor="ws-up-content" required>
            <textarea
              id="ws-up-content"
              rows={5}
              required
              value={updateContent}
              onChange={(e) => setUpdateContent(e.target.value)}
              className="cb-input resize-y"
            />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        dismissible={!scheduling}
        size="lg"
        title="Schedule a meeting"
        description="Members are invited through the meeting service you choose."
        footer={
          <>
            <Button variant="secondary" onClick={() => setMeetingOpen(false)} disabled={scheduling}>
              Cancel
            </Button>
            <Button type="submit" form="ws-meeting-form" loading={scheduling}>
              Schedule
            </Button>
          </>
        }
      >
        <form id="ws-meeting-form" onSubmit={handleScheduleMeeting} className="space-y-4">
          <Field label="Title" htmlFor="ws-mt-title" required>
            <input id="ws-mt-title" type="text" required value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} className="cb-input" />
          </Field>
          <Field label="Agenda" htmlFor="ws-mt-desc">
            <textarea id="ws-mt-desc" rows={2} value={meetingDesc} onChange={(e) => setMeetingDesc(e.target.value)} className="cb-input resize-y" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Date" htmlFor="ws-mt-date" required>
              <input id="ws-mt-date" type="date" required value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="cb-input" />
            </Field>
            <Field label="Start time" htmlFor="ws-mt-time" required>
              <input id="ws-mt-time" type="time" required value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="cb-input" />
            </Field>
            <Field label="Length" htmlFor="ws-mt-duration">
              <select id="ws-mt-duration" value={meetingDuration} onChange={(e) => setMeetingDuration(Number(e.target.value))} className="cb-input">
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-ink">Meeting service</legend>
            <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(['GOOGLE_MEET', 'ZOOM', 'EXTERNAL'] as const).map((p) => {
                const selected = meetingProvider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setMeetingProvider(p)}
                    className={cn(
                      'h-10 rounded-lg border px-3 text-sm transition-colors duration-fast',
                      selected ? 'border-brand-500 bg-brand-50 font-medium text-brand-800 ring-1 ring-brand-500' : 'border-line text-ink-secondary hover:border-line-strong',
                    )}
                  >
                    {MEETING_PROVIDER_LABEL[p]}
                  </button>
                );
              })}
            </div>
            {integrationConnections && meetingProvider === 'GOOGLE_MEET' && !googleConnected && (
              <p className="mt-2 text-sm text-warning-800">
                Google Meet needs your Google Workspace account.{' '}
                <Link href="/settings?tab=integrations" className="font-medium underline underline-offset-2">
                  Connect it
                </Link>
              </p>
            )}
            {integrationConnections && meetingProvider === 'ZOOM' && !zoomConnected && (
              <p className="mt-2 text-sm text-warning-800">
                Zoom needs your Zoom account.{' '}
                <Link href="/settings?tab=integrations" className="font-medium underline underline-offset-2">
                  Connect it
                </Link>
              </p>
            )}
          </fieldset>

          {meetingProvider === 'EXTERNAL' && (
            <Field label="Meeting link" htmlFor="ws-mt-url" required hint="Microsoft Teams, Jitsi or any other video call link.">
              <input
                id="ws-mt-url"
                type="url"
                required
                value={customMeetingUrl}
                onChange={(e) => setCustomMeetingUrl(e.target.value)}
                placeholder="https://"
                className="cb-input"
              />
            </Field>
          )}
        </form>
      </Dialog>

      <Dialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        dismissible={!cancelling}
        size="sm"
        title="Cancel this meeting?"
        description={cancelTarget ? `"${cancelTarget.title}" on ${formatDate(cancelTarget.scheduledAt)} will be marked as cancelled for every member.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={cancelling}>
              Keep meeting
            </Button>
            <Button variant="danger" onClick={handleCancelMeeting} loading={cancelling}>
              Cancel meeting
            </Button>
          </>
        }
      />

      <Dialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        dismissible={!leaving}
        size="sm"
        title="Leave this workspace?"
        description={
          myMembership?.role === 'OWNER' && members.length > 1
            ? 'You are the owner of this workspace. You must remove all other members before you can leave.'
            : `You will lose access to "${workspace?.title}". Files, milestones and announcements will remain for other members.`
        }
        footer={
          myMembership?.role === 'OWNER' && members.length > 1 ? (
            <Button variant="secondary" onClick={() => setLeaveOpen(false)}>
              Understood
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setLeaveOpen(false)} disabled={leaving}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={leaving}
                onClick={async () => {
                  setLeaving(true);
                  try {
                    await leaveWorkspace(workspaceId);
                    router.push('/workspace');
                  } catch {
                    // toast is handled by the store
                  } finally {
                    setLeaving(false);
                    setLeaveOpen(false);
                  }
                }}
              >
                Leave workspace
              </Button>
            </>
          )
        }
      />
    </div>
  );
}
