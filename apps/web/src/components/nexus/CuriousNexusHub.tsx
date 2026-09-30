'use client';

/**
 * Curious Nexus: your research collaborations. The list shows collaborations and
 * requests waiting for you; opening one shows its messages and, when it has a
 * shared workspace, that workspace's files and milestones. Everything shown comes
 * from the collaboration and workspace APIs.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  FolderGit2,
  Inbox,
  Link2,
  Mail,
  MessageSquare,
  Network,
  Plus,
  RefreshCw,
  Search,
  Send,
  Target,
  Users,
  Video,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getProfileImageUrl, handleAvatarError } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button, IconButton, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';

export function GoogleIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

type ChatMessage = { id: string; senderId: string; senderName: string; senderImage: string | null; content: string; timestamp: string };

const roleLabel = (role?: string) => (role === 'RESEARCH_SUPERVISOR' ? 'Research supervisor' : role === 'RESEARCH_SCHOLAR' ? 'Research scholar' : '');

function Avatar({ person, size = 'md' }: { person: any; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'size-7' : size === 'lg' ? 'size-12' : 'size-10';
  return (
    <img
      src={getProfileImageUrl(person)}
      alt=""
      referrerPolicy="no-referrer"
      onError={(e) => handleAvatarError(e, person?.name)}
      className={cn(dim, 'shrink-0 rounded-full border border-line bg-surface-muted object-cover')}
    />
  );
}

export function CuriousNexusHub({
  initialView = 'messages',
  initialUserId,
  initialCollabId,
}: {
  initialView?: string;
  /** Opens the collaboration with this researcher, if there is one. */
  initialUserId?: string | null;
  /** Opens this collaboration. */
  initialCollabId?: string | null;
}) {
  const {
    currentUser,
    workspaces,
    activeWorkspace,
    pendingApprovals,
    fetchWorkspaces,
    fetchWorkspaceDetails,
    addWorkspaceFile,
    fetchMyScholars,
    fetchPendingApprovals,
    approveScholar,
    declineScholar,
    addToast,
    myCollaborations,
    myCollabRequests,
    fetchMyCollaborations,
    fetchMyCollabRequests,
    fetchCollabMessages,
    sendCollabMessage,
    acceptCollabRequest,
    declineCollabRequest,
    connectWorkspaceChatSpace,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [openedCollabId, setOpenedCollabId] = useState<string | null>(initialCollabId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showArchivedMessages, setShowArchivedMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [creatingSpace, setCreatingSpace] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const [pendingAcceptReq, setPendingAcceptReq] = useState<{ id: string; name: string; title: string } | null>(null);
  const [acceptingLoading, setAcceptingLoading] = useState(false);

  const isSupervisor = currentUser?.role === 'RESEARCH_SUPERVISOR';
  const isScholar = currentUser?.role === 'RESEARCH_SCHOLAR';
  const hasAccess = isSupervisor || isScholar;

  const [initialLoading, setInitialLoading] = useState(myCollaborations.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadNexusData = React.useCallback(
    async (showLoading = true) => {
      if (!currentUser) return;
      if (showLoading && myCollaborations.length === 0) setInitialLoading(true);
      setLoadError(null);
      try {
        await Promise.allSettled([
          fetchWorkspaces(),
          isSupervisor ? fetchMyScholars() : Promise.resolve(),
          isSupervisor ? fetchPendingApprovals() : Promise.resolve(),
          fetchMyCollaborations(),
          fetchMyCollabRequests(),
        ]);
      } catch (e: any) {
        console.error('Failed to load Nexus data:', e);
        setLoadError('Your collaborations could not be loaded.');
      } finally {
        setInitialLoading(false);
      }
    },
    [currentUser, isSupervisor, fetchWorkspaces, fetchMyScholars, fetchPendingApprovals, fetchMyCollaborations, fetchMyCollabRequests, myCollaborations.length],
  );

  useEffect(() => {
    loadNexusData(myCollaborations.length === 0);
  }, [loadNexusData]);

  const collaborations = useMemo(
    () =>
      myCollaborations.map((c) => {
        const partner = c.requesterId === currentUser?.id ? c.recipient : c.requester;
        return {
          id: c.id,
          title: c.thread?.title || 'Research collaboration',
          partner,
          status: c.status,
          workspaceId: c.workspaceId,
          startedAt: new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        };
      }),
    [currentUser, myCollaborations],
  );

  // Deep link by researcher (?userId=): open the collaboration with that person once loaded.
  const resolvedUserLink = useRef(false);
  useEffect(() => {
    if (resolvedUserLink.current || !initialUserId || collaborations.length === 0) return;
    const match = collaborations.find((c) => c.partner?.id === initialUserId);
    if (match) setOpenedCollabId(match.id);
    resolvedUserLink.current = true;
  }, [initialUserId, collaborations]);

  const selectedCollab = useMemo(() => (openedCollabId ? collaborations.find((c) => c.id === openedCollabId) || null : null), [collaborations, openedCollabId]);

  useEffect(() => {
    if (selectedCollab?.workspaceId) fetchWorkspaceDetails(selectedCollab.workspaceId);
  }, [selectedCollab?.workspaceId, fetchWorkspaceDetails]);

  const loadMessages = React.useCallback(async () => {
    if (!openedCollabId) return;
    setLoadingMessages(true);
    try {
      const msgs = await fetchCollabMessages(openedCollabId);
      setMessages(
        (msgs || []).map((m: any) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.sender?.name || 'Unknown',
          senderImage: m.sender?.image || null,
          content: m.content,
          timestamp: new Date(m.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        })),
      );
    } finally {
      setLoadingMessages(false);
    }
  }, [openedCollabId, fetchCollabMessages]);

  useEffect(() => {
    if (openedCollabId && selectedCollab) loadMessages();
    else setMessages([]);
  }, [openedCollabId, selectedCollab?.id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const filteredCollaborations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return collaborations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.partner?.name?.toLowerCase().includes(q) || c.partner?.department?.toLowerCase().includes(q),
    );
  }, [collaborations, searchQuery]);

  const receivedRequests = (myCollabRequests?.received || []).filter((r: any) => r.status === 'PENDING');
  const supervisionRequests = isSupervisor ? pendingApprovals || [] : [];
  const pendingCount = receivedRequests.length + supervisionRequests.length;

  const handleApproveScholar = async (id: string) => {
    try {
      await approveScholar(id);
      addToast('Supervision request approved.', 'success');
      fetchPendingApprovals();
      fetchMyScholars();
    } catch (e: any) {
      addToast(`Approval failed: ${e.message}`, 'error');
    }
  };

  const handleDeclineScholar = async (id: string) => {
    try {
      await declineScholar(id);
      addToast('Supervision request declined.', 'info');
      fetchPendingApprovals();
    } catch (e: any) {
      addToast(`Decline failed: ${e.message}`, 'error');
    }
  };

  const confirmAcceptCollab = async () => {
    if (!pendingAcceptReq) return;
    try {
      setAcceptingLoading(true);
      await acceptCollabRequest(pendingAcceptReq.id, 'GOOGLE_WORKSPACE');
      addToast('Collaboration started with Google Workspace.', 'success');
      setPendingAcceptReq(null);
      fetchMyCollabRequests();
      fetchMyCollaborations();
    } catch (e: any) {
      addToast(`The request could not be accepted: ${e.message}`, 'error');
    } finally {
      setAcceptingLoading(false);
    }
  };

  const handleCreateSpace = async (targetWorkspaceId: string) => {
    if (!targetWorkspaceId) return;
    setCreatingSpace(true);
    try {
      await connectWorkspaceChatSpace(targetWorkspaceId);
      addToast('Google Chat Space connected successfully.', 'success');
      fetchWorkspaceDetails(targetWorkspaceId);
    } catch (e: any) {
      addToast(e.message || 'Could not connect Google Chat Space. Ensure Google Workspace is connected in Settings.', 'error');
    } finally {
      setCreatingSpace(false);
    }
  };

  const handleDeclineCollab = async (reqId: string) => {
    try {
      await declineCollabRequest(reqId);
      addToast('Collaboration request declined.', 'info');
      fetchMyCollabRequests();
    } catch (e: any) {
      addToast(`The request could not be declined: ${e.message}`, 'error');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = messageInput.trim();
    if (!content || !openedCollabId || !currentUser) return;
    setSending(true);
    try {
      const msg = await sendCollabMessage(openedCollabId, content);
      setMessages((list) => [
        ...list,
        {
          id: msg.id,
          senderId: currentUser.id,
          senderName: currentUser.name || 'You',
          senderImage: currentUser.image || null,
          content,
          timestamp: new Date().toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setMessageInput('');
    } catch (err: any) {
      addToast(err.message || 'Your message could not be sent.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !newFileUrl.trim() || !selectedCollab?.workspaceId) return;
    setUploading(true);
    try {
      await addWorkspaceFile(selectedCollab.workspaceId, newFileName.trim(), newFileUrl.trim());
      fetchWorkspaceDetails(selectedCollab.workspaceId);
      addToast(`“${newFileName.trim()}” added to the workspace.`, 'success');
      setNewFileName('');
      setNewFileUrl('');
      setShowLinkDialog(false);
    } catch (err: any) {
      addToast(err.message || 'The link could not be added.', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (!hasAccess) {
    return (
      <Card className="mx-auto max-w-md">
        <EmptyState
          icon={Network}
          title="Curious Nexus is for supervisors and scholars"
          description="Collaborations connect researchers. Institute administrators oversee workspaces from the admin console."
        />
      </Card>
    );
  }

  // ── Workspaces view (/workspace) ────────────────────────────────────────────
  if (initialView === 'workspaces') {
    return <WorkspacesView workspaces={workspaces || []} loading={initialLoading && (workspaces || []).length === 0} currentUserId={currentUser?.id} />;
  }

  // ── Conversation view ───────────────────────────────────────────────────────
  if (selectedCollab) {
    const workspaceId = selectedCollab.workspaceId;
    const ws = workspaceId && activeWorkspace?.id === workspaceId ? activeWorkspace : null;
    const files: any[] = ws?.files || [];
    const milestones: any[] = ws?.milestones || [];
    const doneMilestones = milestones.filter((m: any) => m.completed).length;
    const provider = ws?.collaborationProvider;
    const partner = selectedCollab.partner;

    return (
      <div>
        <button
          type="button"
          onClick={() => setOpenedCollabId(null)}
          className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-ml-2 mb-4' })}
        >
          <ArrowLeft aria-hidden />
          Collaborations
        </button>

        <Card className="mb-6">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar person={partner} size="lg" />
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{selectedCollab.title}</h1>
                <p className="mt-0.5 truncate text-sm text-ink-secondary">
                  With {partner?.name}
                  {roleLabel(partner?.role) ? ` · ${roleLabel(partner?.role)}` : ''}
                  {partner?.department ? ` · ${partner.department}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusBadge status={selectedCollab.status} />
                  <Badge tone="neutral">Since {selectedCollab.startedAt}</Badge>
                  <Badge tone="brand">
                    <GoogleIcon className="size-3" />
                    Google Workspace
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {partner?.id && (
                <Link href={`/researchers/${partner.id}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                  Profile
                </Link>
              )}
              {workspaceId && (
                <Link href={`/workspace/${workspaceId}`} className={buttonVariants({ size: 'sm' })}>
                  Open workspace
                  <ArrowUpRight aria-hidden />
                </Link>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* Google Workspace & Chat Hub */}
          <div className="space-y-6">
            <Card className="overflow-hidden border border-line shadow-xs">
              <div className="border-b border-line bg-surface-muted/50 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-11 items-center justify-center rounded-2xl border border-line bg-surface shadow-xs">
                      <GoogleIcon className="size-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold tracking-tight text-ink">Google Workspace Hub</h2>
                        <Badge tone="brand">Chat & Meet</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-secondary">
                        Direct messaging, group spaces, and video syncs for this collaboration.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://chat.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                  >
                    <MessageSquare className="size-4" aria-hidden />
                    Open Google Chat
                    <ExternalLink className="size-3.5 opacity-70" aria-hidden />
                  </a>
                </div>
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                {/* 1-on-1 Google Chat */}
                <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 transition-colors hover:border-line-strong">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3.5">
                      <Avatar person={partner} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-ink">{partner?.name || 'Collaborator'}</p>
                          <Badge tone="brand">Direct Chat</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-ink-muted">
                          {partner?.email ? partner.email : 'Google Workspace account'}
                          {partner?.department ? ` · ${partner.department}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={partner?.email ? `https://mail.google.com/chat/u/0/#chat/dm/${encodeURIComponent(partner.email)}` : 'https://chat.google.com/'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: 'primary', size: 'sm' })}
                      >
                        <MessageSquare className="size-4" aria-hidden />
                        Chat with {partner?.name ? partner.name.split(' ')[0] : 'Collaborator'}
                        <ExternalLink className="size-3.5 opacity-70" aria-hidden />
                      </a>
                      {partner?.email && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(partner.email);
                            addToast(`Copied ${partner.email} to clipboard.`, 'success');
                          }}
                        >
                          <Copy className="size-3.5" aria-hidden />
                          Copy email
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-ink-muted">
                    Opens Google Chat directly in your browser or Gmail to message in real-time.
                  </p>
                </div>

                {/* Workspace Google Chat Space */}
                {workspaceId && (
                  <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 transition-colors hover:border-line-strong">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3.5">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-muted text-brand">
                          <Users className="size-5" aria-hidden />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-ink">Shared Workspace Space</h3>
                            {ws?.googleChatSpaceUrl ? (
                              <Badge tone="success">Space Active</Badge>
                            ) : (
                              <Badge tone="neutral">Google Chat Space</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-ink-muted">
                            {ws?.googleChatSpaceUrl
                              ? 'Dedicated Google Chat Space for group updates, research threads, and links.'
                              : 'Create a dedicated Google Chat Space for all members of this collaboration workspace.'}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {ws?.googleChatSpaceUrl ? (
                          <a
                            href={ws.googleChatSpaceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                          >
                            <ExternalLink className="size-3.5" aria-hidden />
                            Open Space
                          </a>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={creatingSpace}
                            onClick={() => handleCreateSpace(workspaceId)}
                          >
                            <Plus className="size-3.5" aria-hidden />
                            Connect Chat Space
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Google Meet & Meetings */}
                <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 transition-colors hover:border-line-strong">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3.5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-muted text-emerald-600">
                        <Video className="size-5" aria-hidden />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-ink">Google Meet Video Calls</h3>
                          <Badge tone="success">Google Meet</Badge>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">
                          Launch a quick video call for doctoral supervision, paper reviews, or milestone syncs.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href="https://meet.google.com/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                      >
                        <Video className="size-3.5" aria-hidden />
                        Instant Meet
                        <ExternalLink className="size-3.5 opacity-70" aria-hidden />
                      </a>
                      {workspaceId && (
                        <Link
                          href={`/workspace/${workspaceId}?tab=meetings`}
                          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                        >
                          <Calendar className="size-3.5" aria-hidden />
                          Schedule meeting
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Workflow helper note */}
                <div className="rounded-xl border border-brand/20 bg-brand-50/50 p-4 text-xs leading-relaxed text-ink-secondary">
                  <p className="font-semibold text-ink">Integrated Research Workflow</p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-4 text-ink-muted">
                    <li>Use <strong>Google Chat</strong> for messaging, questions, and fast feedback.</li>
                    <li>Files, draft revisions, datasets, and doctoral milestones stay organized in the <strong>Shared Workspace</strong> on the right.</li>
                    <li>Supervision reviews and syncs can be held on <strong>Google Meet</strong> with calendar reminders.</li>
                  </ul>
                </div>

                {/* Previous in-app message history (if any exists) */}
                {messages.length > 0 && (
                  <div className="rounded-xl border border-line bg-surface">
                    <button
                      type="button"
                      onClick={() => setShowArchivedMessages((prev) => !prev)}
                      className="flex w-full items-center justify-between p-4 text-left text-xs font-medium text-ink-secondary hover:text-ink"
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquare className="size-3.5 text-ink-muted" aria-hidden />
                        Past internal messages ({messages.length})
                      </span>
                      <ChevronDown
                        className={cn('size-4 transition-transform duration-fast', showArchivedMessages && 'rotate-180')}
                        aria-hidden
                      />
                    </button>
                    {showArchivedMessages && (
                      <div className="max-h-60 overflow-y-auto border-t border-line bg-surface-muted/30 p-4 space-y-2.5">
                        {messages.map((msg) => (
                          <div key={msg.id} className="rounded-lg border border-line bg-surface p-3 text-xs">
                            <div className="flex items-center justify-between gap-2 text-ink-muted">
                              <span className="font-medium text-ink">{msg.senderName}</span>
                              <span>{msg.timestamp}</span>
                            </div>
                            <p className="mt-1 text-ink whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Context */}
          <div className="space-y-6">
            {workspaceId ? (
              <Card>
                <CardHeader title="Shared workspace" />
                <ul className="divide-y divide-line text-sm">
                  <li>
                    <Link href={`/workspace/${workspaceId}?tab=files`} className="flex items-center gap-3 px-5 py-3 transition-colors duration-fast hover:bg-surface-muted">
                      <FileText className="size-4 text-ink-muted" aria-hidden />
                      <span className="flex-1 text-ink">Files</span>
                      <span className="tabular-nums text-ink-muted">{files.length}</span>
                    </Link>
                  </li>
                  <li>
                    <Link href={`/workspace/${workspaceId}?tab=tasks`} className="flex items-center gap-3 px-5 py-3 transition-colors duration-fast hover:bg-surface-muted">
                      <Target className="size-4 text-ink-muted" aria-hidden />
                      <span className="flex-1 text-ink">Milestones</span>
                      <span className="tabular-nums text-ink-muted">
                        {doneMilestones}/{milestones.length}
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link href={`/workspace/${workspaceId}?tab=meetings`} className="flex items-center gap-3 px-5 py-3 transition-colors duration-fast hover:bg-surface-muted">
                      <Video className="size-4 text-ink-muted" aria-hidden />
                      <span className="flex-1 text-ink">Meetings</span>
                      <ArrowUpRight className="size-4 text-ink-muted" aria-hidden />
                    </Link>
                  </li>
                </ul>
                <div className="border-t border-line p-4">
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => setShowLinkDialog(true)}>
                    <Link2 aria-hidden />
                    Add a link to the workspace
                  </Button>
                </div>
              </Card>
            ) : (
              <Card>
                <CardHeader title="Shared workspace" />
                <p className="px-5 py-4 text-sm text-ink-muted">
                  This collaboration has no shared workspace. Files, milestones and meetings live in workspaces.
                </p>
              </Card>
            )}

            <Card>
              <CardHeader title="Members" />
              <ul className="divide-y divide-line">
                {[currentUser, partner].filter(Boolean).map((p: any) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar person={p} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {p.name}
                        {p.id === currentUser?.id && <span className="font-normal text-ink-muted"> (you)</span>}
                      </p>
                      <p className="truncate text-xs text-ink-muted">{roleLabel(p.role)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <Dialog
          open={showLinkDialog}
          onClose={() => setShowLinkDialog(false)}
          dismissible={!uploading}
          title="Add a link to the workspace"
          description="Share a document, dataset or folder by link. Everyone in the workspace can open it."
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowLinkDialog(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button type="submit" form="nexus-link-form" loading={uploading}>
                Add link
              </Button>
            </>
          }
        >
          <form id="nexus-link-form" onSubmit={handleShareLink} className="space-y-4">
            <Field label="Name" htmlFor="nx-name" required>
              <input id="nx-name" type="text" required value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="e.g. Chapter 2 draft" className="cb-input" />
            </Field>
            <Field label="Link" htmlFor="nx-url" required hint="Must start with https:// or http://">
              <input id="nx-url" type="url" required value={newFileUrl} onChange={(e) => setNewFileUrl(e.target.value)} placeholder="https://" className="cb-input" />
            </Field>
            <p className="text-xs text-ink-muted">
              To upload a file instead, use the Files tab in the{' '}
              <Link href={`/workspace/${workspaceId}?tab=files`} className="font-medium text-brand hover:underline">
                workspace
              </Link>
              .
            </p>
          </form>
        </Dialog>
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        meta="Collaboration"
        title="Curious Nexus"
        description="Your research collaborations: messages, shared workspaces and meetings."
        actions={
          <Link href="/researchers" className={buttonVariants({ variant: 'secondary' })}>
            <Users aria-hidden />
            Find collaborators
          </Link>
        }
      />

      {initialLoading && collaborations.length === 0 ? (
        <div role="status" aria-label="Loading collaborations" className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : loadError && collaborations.length === 0 ? (
        <Card>
          <EmptyState
            icon={Network}
            title="Your collaborations didn't load"
            description="Check your connection and try again."
            action={
              <Button variant="secondary" onClick={() => loadNexusData(true)}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="grid grid-cols-3 gap-px overflow-hidden bg-line">
            {[
              { label: 'Collaborations', value: collaborations.length },
              { label: 'Shared workspaces', value: workspaces?.length || 0 },
              { label: 'Requests waiting', value: pendingCount, warn: pendingCount > 0 },
            ].map((fig) => (
              <div key={fig.label} className="bg-surface px-4 py-4 sm:px-5">
                <p className="text-sm text-ink-muted">{fig.label}</p>
                <p className={cn('mt-1 text-2xl font-semibold tabular-nums text-ink sm:text-3xl', fig.warn && 'text-warning-700')}>{fig.value}</p>
              </div>
            ))}
          </Card>

          {pendingCount > 0 && (
            <Card className="border-warning-200">
              <CardHeader title="Requests waiting for you" actions={<Badge tone="warning">{pendingCount}</Badge>} />
              <ul className="divide-y divide-line">
                {supervisionRequests.map((req: any) => (
                  <li key={req.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar person={req} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{req.name}</p>
                        <p className="truncate text-sm text-ink-muted">Supervision request{req.department ? ` · ${req.department}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApproveScholar(req._requestId || req.id)}>
                        <Check aria-hidden />
                        Approve
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleDeclineScholar(req._requestId || req.id)}>
                        Decline
                      </Button>
                    </div>
                  </li>
                ))}
                {receivedRequests.map((req: any) => (
                  <li key={req.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <Avatar person={req.requester} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{req.requester?.name}</p>
                        <p className="truncate text-sm text-ink-muted">Wants to collaborate{req.thread?.title ? ` on “${req.thread.title}”` : ''}</p>
                        {req.message && <blockquote className="mt-2 border-l-2 border-line-strong pl-3 text-sm text-ink-secondary">{req.message}</blockquote>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setPendingAcceptReq({ id: req.id, name: req.requester?.name || 'your collaborator', title: req.thread?.title || 'Research collaboration' })}
                      >
                        <Check aria-hidden />
                        Accept
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleDeclineCollab(req.id)}>
                        Decline
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Your collaborations"
              actions={
                collaborations.length > 3 && (
                  <div className="relative hidden w-56 sm:block">
                    <label htmlFor="nexus-search" className="sr-only">
                      Search collaborations
                    </label>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
                    <input
                      id="nexus-search"
                      type="search"
                      placeholder="Search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="cb-input h-9 pl-9"
                    />
                  </div>
                )
              }
            />
            {collaborations.length === 0 ? (
              <EmptyState
                icon={Network}
                title="No collaborations yet"
                description="Send a collaboration request from a researcher's profile or a post in the feed. Accepted requests appear here."
                action={
                  <>
                    <Link href="/researchers" className={buttonVariants({ variant: 'primary' })}>
                      Find researchers
                    </Link>
                    {workspaces && workspaces.length > 0 && (
                      <Link href={`/workspace/${workspaces[0].id}`} className={buttonVariants({ variant: 'secondary' })}>
                        <FolderGit2 aria-hidden />
                        Open your workspace
                      </Link>
                    )}
                  </>
                }
              />
            ) : filteredCollaborations.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-muted">No collaborations match “{searchQuery}”.</p>
            ) : (
              <ul className="divide-y divide-line">
                {filteredCollaborations.map((collab) => (
                  <li key={collab.id}>
                    <button
                      type="button"
                      onClick={() => setOpenedCollabId(collab.id)}
                      className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-fast hover:bg-surface-muted"
                    >
                      <Avatar person={collab.partner} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink group-hover:text-brand">{collab.title}</span>
                        <span className="block truncate text-sm text-ink-muted">
                          {collab.partner?.name}
                          {roleLabel(collab.partner?.role) ? ` · ${roleLabel(collab.partner?.role)}` : ''} · since {collab.startedAt}
                        </span>
                      </span>
                      {collab.workspaceId && (
                        <Badge tone="neutral" className="hidden sm:inline-flex">
                          <FolderGit2 className="size-3" aria-hidden />
                          Workspace
                        </Badge>
                      )}
                      <StatusBadge status={collab.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <Dialog
        open={!!pendingAcceptReq}
        onClose={() => setPendingAcceptReq(null)}
        dismissible={!acceptingLoading}
        title="Accept collaboration"
        description={pendingAcceptReq ? `Start “${pendingAcceptReq.title}” with ${pendingAcceptReq.name}.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingAcceptReq(null)} disabled={acceptingLoading}>
              Cancel
            </Button>
            <Button onClick={confirmAcceptCollab} loading={acceptingLoading}>
              Accept Collaboration
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-1">
          <p className="text-sm text-ink-secondary">
            Accepting creates a shared collaboration workspace for <strong>{pendingAcceptReq?.title}</strong> with Google Workspace enabled for direct Google Chat messaging, team spaces, and Google Meet video syncs.
          </p>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-muted/60 p-3.5">
            <GoogleIcon className="size-5 shrink-0" />
            <div className="text-xs text-ink-secondary">
              <span className="font-semibold text-ink">Google Workspace Powered</span>
              <p className="mt-0.5 text-ink-muted">Chat with {pendingAcceptReq?.name} on Google Chat and schedule Google Meet calls directly.</p>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/** Every workspace you are a member of. */
function WorkspacesView({ workspaces, loading, currentUserId }: { workspaces: any[]; loading: boolean; currentUserId?: string }) {
  return (
    <div>
      <PageHeader
        meta="Research"
        title="Research workspaces"
        description="Shared spaces for files, milestones, announcements and meetings. Only members can see a workspace."
        actions={
          <Link href="/nexus" className={buttonVariants({ variant: 'secondary' })}>
            <MessageSquare aria-hidden />
            Curious Nexus
          </Link>
        }
      />
      {loading ? (
        <div role="status" aria-label="Loading workspaces" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : workspaces.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderGit2}
            title="No workspaces yet"
            description="A workspace is created when a supervision or collaboration begins. You'll see it here once you're a member."
            action={
              <Link href="/nexus" className={buttonVariants({ variant: 'secondary' })}>
                Go to Curious Nexus
              </Link>
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {workspaces.map((ws) => {
            const members: any[] = ws.members || [];
            const domain = ws.researchDomainRef?.name || ws.researchDomain;
            const topic = ws.researchTopicRef?.name || ws.researchTopic;
            const mine = members.find((m) => m.userId === currentUserId);
            return (
              <li key={ws.id}>
                <Link
                  href={`/workspace/${ws.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-xs transition-[border-color,box-shadow] duration-base hover:border-line-strong hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <FolderGit2 className="size-5" aria-hidden />
                    </span>
                    {mine?.role === 'OWNER' && <Badge tone="brand">Owner</Badge>}
                  </div>
                  <h2 className="mt-4 font-serif text-lg font-semibold leading-snug text-ink group-hover:text-brand">{ws.title}</h2>
                  {ws.description && <p className="mt-1 line-clamp-2 text-sm text-ink-secondary">{ws.description}</p>}
                  {(domain || topic) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {domain && <Badge tone="neutral">{domain}</Badge>}
                      {topic && <Badge tone="plum">{topic}</Badge>}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <div className="flex -space-x-2">
                      {members.slice(0, 5).map((m) => (
                        <img
                          key={m.userId}
                          src={getProfileImageUrl(m.user)}
                          alt={m.user?.name || ''}
                          title={m.user?.name || ''}
                          referrerPolicy="no-referrer"
                          onError={(e) => handleAvatarError(e, m.user?.name)}
                          className="size-7 rounded-full border-2 border-surface bg-surface-muted object-cover"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-ink-muted">
                      {members.length} {members.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
