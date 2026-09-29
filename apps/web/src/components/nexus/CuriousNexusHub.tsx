'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { getProfileImageUrl } from '@/lib/avatar';
import { 
  Network, 
  Search, 
  Users, 
  ArrowUpRight, 
  Plus, 
  FileText, 
  UploadCloud, 
  Check, 
  X, 
  Clock, 
  ArrowLeft,
  Calendar,
  BookOpen,
  Send,
  MessageSquare,
  ShieldCheck,
  Download,
  Info,
  Activity,
  Award,
  BookMarked,
  Video,
  Loader2,
  Sparkles,
  FolderGit2,
  Target,
  ChevronRight,
  CalendarDays,
  ExternalLink,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, API_URL, getSupabaseToken } from '@/lib/api-client';

interface CollaborationFile {
  name: string;
  url: string;
  size: string;
  uploadedBy: string;
  date: string;
}

export function CuriousNexusHub({ initialView = 'messages', initialUserId }: { initialView?: string; initialUserId?: string | null }) {
  const router = useRouter();
  const { 
    currentUser, 
    workspaces, 
    activeWorkspace, 
    myScholars,
    pendingApprovals,
    collaborationRequests,
    fetchWorkspaces,
    fetchWorkspaceDetails,
    addWorkspaceFile,
    fetchMyScholars,
    fetchPendingApprovals,
    fetchCollaborationRequests,
    approveScholar,
    declineScholar,
    updateCollaborationRequest,
    addToast,
    myCollaborations,
    myCollabRequests,
    fetchMyCollaborations,
    fetchMyCollabRequests,
    fetchCollabMessages,
    sendCollabMessage,
    acceptCollabRequest,
    declineCollabRequest
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [openedCollabId, setOpenedCollabId] = useState<string | null>(initialUserId ? initialUserId : null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // File Upload Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Collaboration Provider Selection State
  const [pendingAcceptReq, setPendingAcceptReq] = useState<{ id: string; name: string; title: string } | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'GOOGLE_WORKSPACE' | 'ZOOM_WORKPLACE'>('GOOGLE_WORKSPACE');
  const [acceptingLoading, setAcceptingLoading] = useState(false);

  // Resolved scholar's supervisor details
  const [supervisorProfile, setSupervisorProfile] = useState<any>(null);

  // Connection Role Check
  const isSupervisor = currentUser?.role === 'RESEARCH_SUPERVISOR';
  const isScholar = currentUser?.role === 'RESEARCH_SCHOLAR';
  const hasAccess = isSupervisor || isScholar;

  // Data Loading & Error States
  const [initialLoading, setInitialLoading] = useState(myCollaborations.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Mount Fetching Data
  const loadNexusData = React.useCallback(async (showLoading = true) => {
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
        isScholar && currentUser.supervisorId
          ? apiFetch(`/api/users/${currentUser.supervisorId}/profile`)
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => { if (data) setSupervisorProfile(data); })
          : Promise.resolve(),
      ]);
    } catch (e: any) {
      console.error('Failed to load Nexus data:', e);
      setLoadError('Unable to load collaboration workspace.');
    } finally {
      setInitialLoading(false);
    }
  }, [currentUser, isSupervisor, isScholar, fetchWorkspaces, fetchMyScholars, fetchPendingApprovals, fetchMyCollaborations, fetchMyCollabRequests, myCollaborations.length]);

  useEffect(() => {
    loadNexusData(myCollaborations.length === 0);
  }, [loadNexusData]);

  // Compile Active Collaborations list
  const activeCollaborations = useMemo(() => {
    return myCollaborations.map((c) => {
      const partner = c.requesterId === currentUser?.id ? c.recipient : c.requester;
      return {
        id: c.id,
        type: c.workspaceId ? 'project' : 'collaboration',
        title: c.thread?.title ? `Collab: ${c.thread.title}` : `Research Collaboration`,
        partner: partner ? {
          id: partner.id,
          name: partner.name,
          role: partner.role,
          roleLabel: partner.role === 'RESEARCH_SUPERVISOR' ? 'Research Supervisor' : 'Research Scholar',
          department: partner.department || 'SRMIST',
          image: partner.image
        } : null,
        description: `Research collaboration focused on institutional research.`,
        topic: c.thread?.title || 'General Research',
        objective: 'Improve project-based research synergy and co-author publications.',
        status: c.status,
        workspaceId: c.workspaceId,
        startedAt: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        participants: [
          { id: currentUser?.id, name: currentUser?.name, role: currentUser?.role, image: currentUser?.image },
          partner ? { id: partner.id, name: partner.name, role: partner.role, image: partner.image } : null
        ].filter(Boolean)
      };
    });
  }, [currentUser, myCollaborations]);

  // Selected Collaboration Object
  const selectedCollab = useMemo(() => {
    if (!openedCollabId) return null;
    return activeCollaborations.find((c) => c.id === openedCollabId) || null;
  }, [activeCollaborations, openedCollabId]);

  // Sync workspace details when selecting a project collaboration
  useEffect(() => {
    if (selectedCollab && selectedCollab.type === 'project' && selectedCollab.workspaceId) {
      fetchWorkspaceDetails(selectedCollab.workspaceId);
    }
  }, [openedCollabId, selectedCollab]);

  // Load actual DB messages
  useEffect(() => {
    if (openedCollabId && selectedCollab) {
      fetchCollabMessages(openedCollabId).then((msgs) => {
        setMessages(msgs.map((m: any) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.sender?.name || 'Unknown',
          senderImage: m.sender?.image || null,
          content: m.content,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
      });
    } else {
      setMessages([]);
    }
    setReplyingTo(null);
  }, [openedCollabId, fetchCollabMessages, selectedCollab]);

  // Filtered collaborations list (ONLY searches when collaborations exist)
  const filteredCollaborations = useMemo(() => {
    if (activeCollaborations.length === 0) return [];
    return activeCollaborations.filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        c.title?.toLowerCase().includes(q) ||
        c.partner?.name?.toLowerCase().includes(q) ||
        c.topic?.toLowerCase().includes(q) ||
        c.partner?.department?.toLowerCase().includes(q)
      );
    });
  }, [activeCollaborations, searchQuery]);

  // Compiled Timeline events dynamically for Research Activity
  const activityEvents = useMemo(() => {
    const events: any[] = [];
    if (!selectedCollab) return events;

    if (selectedCollab.type === 'project' && activeWorkspace) {
      activeWorkspace.files?.forEach((f: any) => {
        events.push({
          id: `file-${f.id}`,
          text: `${f.uploadedBy?.name || 'Collaborator'} uploaded research document "${f.name}".`,
          date: new Date(f.uploadedAt),
          icon: 'file'
        });
      });
      activeWorkspace.announcements?.forEach((a: any) => {
        events.push({
          id: `ann-${a.id}`,
          text: `${a.author?.name || 'Collaborator'} posted research update: "${a.title}".`,
          date: new Date(a.createdAt),
          icon: 'announcement'
        });
      });
      activeWorkspace.milestones?.forEach((m: any) => {
        events.push({
          id: `ms-${m.id}`,
          text: `Research milestone "${m.title}" ${m.completed ? 'completed' : 'updated'}.`,
          date: new Date(m.updatedAt || m.createdAt),
          icon: 'milestone'
        });
      });
    } else {
      // Advisory timeline from localStorage files
      const files = JSON.parse(localStorage.getItem(`curiousbees_files_${selectedCollab.id}`) || '[]');
      files.forEach((f: any, idx: number) => {
        events.push({
          id: `file-advisory-${idx}`,
          text: `${f.uploadedBy} shared reference document "${f.name}".`,
          date: new Date(f.date || Date.now()),
          icon: 'file'
        });
      });
      events.push({
        id: 'advisory-start',
        text: 'PhD Research Advisory connection established.',
        date: new Date(currentUser?.createdAt || Date.now()),
        icon: 'system'
      });
    }

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [selectedCollab, activeWorkspace, currentUser]);

  // Statistics calculation based on real backend data
  const stats = useMemo(() => {
    const activeCollabsCount = activeCollaborations.length;
    const activeProjectsCount = workspaces?.length || 0;
    const pendingCollabsCount = myCollabRequests?.received?.filter((r: any) => r.status === 'PENDING').length || 0;
    const pendingRequestsCount = (isSupervisor ? (pendingApprovals?.length || 0) : 0) + pendingCollabsCount;

    return {
      activeCollabsCount,
      activeProjectsCount,
      pendingRequestsCount
    };
  }, [activeCollaborations, workspaces, pendingApprovals, myCollabRequests, isSupervisor]);

  // Pending Actions
  const handleApproveScholar = async (scholarId: string) => {
    try {
      await approveScholar(scholarId);
      addToast('Research Scholar connection approved.', 'success');
      fetchPendingApprovals();
      fetchMyScholars();
    } catch (e: any) {
      addToast(`Approval failed: ${e.message}`, 'error');
    }
  };

  const handleDeclineScholar = async (scholarId: string) => {
    try {
      await declineScholar(scholarId);
      addToast('Scholar request declined.', 'info');
      fetchPendingApprovals();
    } catch (e: any) {
      addToast(`Request decline failed: ${e.message}`, 'error');
    }
  };

  const handleAcceptCollab = async (reqId: string, reqName?: string, reqTitle?: string) => {
    setPendingAcceptReq({
      id: reqId,
      name: reqName || 'Collaborator',
      title: reqTitle || 'Research Collaboration',
    });
  };

  const confirmAcceptCollab = async () => {
    if (!pendingAcceptReq) return;
    try {
      setAcceptingLoading(true);
      await acceptCollabRequest(pendingAcceptReq.id, selectedPlatform);
      addToast('Collaboration workspace initialized with ' + (selectedPlatform === 'GOOGLE_WORKSPACE' ? 'Google Workspace' : 'Zoom Workplace'), 'success');
      setPendingAcceptReq(null);
      fetchMyCollabRequests();
      fetchMyCollaborations();
    } catch (e: any) {
      addToast(`Failed to accept request: ${e.message}`, 'error');
    } finally {
      setAcceptingLoading(false);
    }
  };

  const handleDeclineCollab = async (reqId: string) => {
    try {
      await declineCollabRequest(reqId);
      addToast('Collaboration request declined.', 'info');
      fetchMyCollabRequests();
    } catch (e: any) {
      addToast(`Failed to decline request: ${e.message}`, 'error');
    }
  };

  // Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !openedCollabId || !currentUser) return;

    try {
      const msg = await sendCollabMessage(openedCollabId, messageInput);
      setMessages([...messages, {
        id: msg.id,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderImage: currentUser.image,
        content: messageInput,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setMessageInput('');
      setReplyingTo(null);
    } catch (err: any) {
      addToast(err.message || 'Failed to send message', 'error');
    }
  };

  // Upload Research File Handler
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !newFileUrl.trim() || !selectedCollab) return;

    setUploading(true);
    const sizeInBytes = Math.floor(Math.random() * 5 * 1024 * 1024) + 1024 * 1024; // 1MB - 6MB

    try {
      if (selectedCollab.type === 'project' && selectedCollab.workspaceId) {
        // Upload to Workspace directly via NestJS API
        await addWorkspaceFile(selectedCollab.workspaceId, newFileName, newFileUrl, Math.floor(sizeInBytes / 1024));
        fetchWorkspaceDetails(selectedCollab.workspaceId);
      } else {
        // Advisory: Store locally in localStorage
        const advisoryFilesKey = `curiousbees_files_${selectedCollab.id}`;
        const existingFiles = JSON.parse(localStorage.getItem(advisoryFilesKey) || '[]');
        const newFile: CollaborationFile = {
          name: newFileName,
          url: newFileUrl,
          size: `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`,
          uploadedBy: currentUser?.name || 'You',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
        localStorage.setItem(advisoryFilesKey, JSON.stringify([newFile, ...existingFiles]));
      }

      addToast(`Shared file "${newFileName}" successfully.`, 'success');
      setNewFileName('');
      setNewFileUrl('');
      setShowUploadModal(false);
    } catch (err: any) {
      addToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Get Advisory files from LocalStorage fallback
  const advisoryFilesList = useMemo(() => {
    if (!selectedCollab || selectedCollab.type !== 'advisory') return [];
    return JSON.parse(localStorage.getItem(`curiousbees_files_${selectedCollab.id}`) || '[]');
  }, [selectedCollab, showUploadModal]);

  // Deny Access Screen for General/Unapproved Users
  if (!hasAccess) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-slate-50">
        <div className="bg-surface border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-sm space-y-5 text-left">
          <div className="w-14 h-14 bg-rose-50 border border-rose-100 text-red-700 rounded-2xl flex items-center justify-center mx-auto">
            <X className="w-6 h-6 stroke-[3.5]" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Access Restricted</h2>
            <p className="text-xs text-slate-550 font-semibold leading-relaxed">
              Only registered Research Supervisors and Research Scholars have access to the Research Collaboration Workspace.
            </p>
          </div>
          <Link
            href="/feed"
            className="block w-full py-2.5 bg-brand hover:bg-brand-strong text-white rounded-xl text-xs font-bold transition-all text-center"
          >
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  // Render Detail View
  if (selectedCollab) {
    const workspaceId = selectedCollab.workspaceId || 'advisory';
    const hasWorkspace = Boolean(selectedCollab.workspaceId);
    const provider = activeWorkspace?.collaborationProvider || 'GOOGLE_WORKSPACE';
    const isGoogle = provider === 'GOOGLE_WORKSPACE';
    const filesCount = selectedCollab.type === 'project' ? (activeWorkspace?.files?.length || 0) : advisoryFilesList.length;
    const milestonesList = activeWorkspace?.milestones || [];
    const completedMilestones = milestonesList.filter((m: any) => m.completed).length;

    const quickPrompts = [
      `Hi ${selectedCollab.partner?.name || 'there'}! Let's align on our research objectives and methodology.`,
      `Can we schedule an introductory synchronization meeting on ${isGoogle ? 'Google Meet' : 'Zoom'}?`,
      `I have prepared the preliminary research datasets and notes for review.`,
      `Let's outline our milestone timeline and target publication venues.`
    ];

    return (
      <div className="h-[calc(100vh-4rem)] p-3 md:p-5 max-w-7xl mx-auto flex flex-col gap-3 select-none text-left overflow-hidden">
        
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => setOpenedCollabId(null)}
            className="px-3 py-1.5 bg-surface border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Collaborations
          </button>

          <div className="flex items-center gap-2">
            <Link
              href={hasWorkspace ? `/workspace/${workspaceId}` : `/workspace`}
              className="px-3.5 py-1.5 bg-brand hover:bg-brand-strong text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Open 9-Tab Nexus Workspace</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={selectedCollab.partner?.id && selectedCollab.partner?.id !== 'system' ? `/researchers/${selectedCollab.partner.id}` : '#'}
              className="px-3 py-1.5 bg-surface hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-3xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              Profile <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Collaboration Header Card */}
        <div className="bg-surface border border-slate-200 rounded-2xl p-4 md:p-5 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-brand/20 shrink-0 shadow-3xs">
              <img src={getProfileImageUrl(selectedCollab.partner)} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-brand/10 text-brand border border-brand/20 rounded-full font-medium text-xs capitalize">
                  {selectedCollab.type === 'advisory' ? 'PhD Advisory' : 'Research Project'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-medium text-xs capitalize">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {selectedCollab.status}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-medium text-xs capitalize">
                  <Radio className="w-2.5 h-2.5 text-blue-600" />
                  {isGoogle ? 'Google Workspace' : 'Zoom Workplace'}
                </span>
              </div>
              <h2 className="text-base md:text-lg font-semibold text-slate-900 mt-1 truncate leading-snug">
                {selectedCollab.title}
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">
                Collaborator: <span className="text-slate-800 font-bold">{selectedCollab.partner?.name}</span> ({selectedCollab.partner?.roleLabel}) • {selectedCollab.partner?.department}
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Workspace Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
          
          {/* Left Column: Nexus Synergy & Quick Modules (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto pr-1">
            
            {/* External Collaboration Hub */}
            <div className="theme-static bg-gradient-to-br from-slate-900 to-brand text-white rounded-2xl p-4 shadow-sm space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                    <Video className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-xs font-medium capitalize">Communication Channel</h3>
                    <p className="text-2xs text-blue-100 font-medium">Integrated {isGoogle ? 'Google Workspace' : 'Zoom Workplace'}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-medium capitalize">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href={hasWorkspace ? `/workspace/${workspaceId}?tab=meetings` : '/workspace'}
                  className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <Video className="w-4 h-4 text-emerald-300" />
                  <span className="text-2xs font-bold">{isGoogle ? 'Google Meet' : 'Zoom Meeting'}</span>
                  <span className="text-2xs text-blue-200">Start / Join ↗</span>
                </Link>

                <Link
                  href={hasWorkspace ? `/workspace/${workspaceId}?tab=discussions` : '/workspace'}
                  className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-blue-300" />
                  <span className="text-2xs font-bold">{isGoogle ? 'Chat Space' : 'Workplace Chat'}</span>
                  <span className="text-2xs text-blue-200">Open Space ↗</span>
                </Link>
              </div>
            </div>

            {/* Quick Nexus Modules Grid */}
            <div className="grid grid-cols-2 gap-2.5 shrink-0">
              
              {/* Files Module */}
              <div className="bg-surface border border-slate-200 rounded-2xl p-3.5 shadow-3xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-brand flex items-center justify-center">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800">{filesCount}</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Files &amp; Data</h4>
                  <p className="text-2xs text-slate-400 font-medium">Shared research assets</p>
                </div>
                <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="text-2xs font-bold text-brand hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Upload
                  </button>
                  <Link
                    href={hasWorkspace ? `/workspace/${workspaceId}?tab=files` : '/workspace'}
                    className="text-2xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                  >
                    View <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Milestones Module */}
              <div className="bg-surface border border-slate-200 rounded-2xl p-3.5 shadow-3xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Target className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800">
                    {milestonesList.length > 0 ? `${completedMilestones}/${milestonesList.length}` : '0/0'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Milestones</h4>
                  <p className="text-2xs text-slate-400 font-medium">Research deliverables</p>
                </div>
                <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                  <span className="text-2xs font-semibold text-emerald-700">
                    {milestonesList.length > 0 ? `${Math.round((completedMilestones / milestonesList.length) * 100)}% done` : 'No tasks'}
                  </span>
                  <Link
                    href={hasWorkspace ? `/workspace/${workspaceId}?tab=milestones` : '/workspace'}
                    className="text-2xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                  >
                    View <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Team Members Card */}
            <div className="bg-surface border border-slate-200 rounded-2xl p-3.5 shadow-3xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-slate-900 capitalize flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand" /> Collaboration Team
                </h4>
                <span className="text-2xs font-bold text-slate-400">2 Members</span>
              </div>

              <div className="space-y-2">
                {selectedCollab.participants?.map((p: any, idx: number) => (
                  <div key={p.id || idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-150/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 shrink-0">
                        <img src={getProfileImageUrl(p)} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{p.name || 'User'}</p>
                        <p className="text-2xs text-slate-500 font-semibold truncate">
                          {p.role === 'RESEARCH_SUPERVISOR' ? 'Research Supervisor' : 'Research Scholar'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-medium capitalize">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Research Objectives Summary */}
            <div className="bg-surface border border-slate-200 rounded-2xl p-3.5 shadow-3xs space-y-1.5 text-xs">
              <h4 className="text-xs font-medium text-slate-900 capitalize flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-brand" /> Synergy Objective
              </h4>
              <p className="text-2xs text-slate-600 font-medium leading-relaxed">
                {selectedCollab.objective || 'Co-author high-impact research, establish experimental methodology, and publish peer-reviewed papers.'}
              </p>
            </div>

          </div>

          {/* Right Column: Research Discussion Stream (7 cols) */}
          <div className="lg:col-span-7 bg-surface border border-slate-200 rounded-2xl shadow-3xs flex flex-col overflow-hidden">
            
            {/* Discussion Header */}
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-surface shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand" />
                <div>
                  <h3 className="text-xs font-medium text-slate-900 capitalize">
                    Research Discussion
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-medium text-xs capitalize">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Realtime Synced
                </span>
              </div>
            </div>

            {/* Transparency Caution */}
            <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-200/80 flex items-center gap-2 shrink-0">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <p className="text-2xs font-semibold text-amber-800 leading-tight">
                <span className="font-semibold">Notice:</span> Official institutional collaboration channel. Messages are archived for research auditability.
              </p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200 text-brand flex items-center justify-center shadow-inner">
                    <MessageSquare className="w-7 h-7 stroke-[2]" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900">Start the Research Discussion</h3>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      Connect with <span className="text-slate-800 font-bold">{selectedCollab.partner?.name}</span>. Exchange methodology updates, share draft links, or initiate a discussion prompt below.
                    </p>
                  </div>

                  {/* Quick Starter Chips */}
                  <div className="w-full max-w-md space-y-2 pt-2 text-left">
                    <p className="text-xs font-medium text-slate-400 capitalize text-center">Suggested Starters</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {quickPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setMessageInput(prompt)}
                          className="w-full text-left p-2.5 bg-surface hover:bg-blue-50/80 border border-slate-200 hover:border-blue-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-brand transition-all shadow-3xs flex items-center justify-between group cursor-pointer"
                        >
                          <span className="truncate pr-2">{prompt}</span>
                          <Send className="w-3 h-3 text-slate-300 group-hover:text-brand shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg: any) => {
                  const isMine = msg.senderId === currentUser?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs font-semibold leading-relaxed shadow-3xs ${
                          isMine
                            ? 'bg-brand text-white rounded-tr-xs'
                            : 'bg-surface border border-slate-200 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        <div className="flex justify-between items-end gap-3 mb-1">
                          <span className={`text-2xs font-semibold tracking-wide ${isMine ? 'text-blue-100' : 'text-slate-400'}`}>
                            {msg.senderName}
                          </span>
                          <span className={`text-2xs font-bold ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                            {msg.timestamp}
                          </span>
                        </div>
                        {msg.replyTo && (
                          <div className="mb-2 p-2 bg-slate-50/70 border-l-2 border-blue-500 rounded text-2xs text-slate-500 font-medium">
                            <span className="font-semibold text-brand block">Replying to {msg.replyTo.senderName}</span>
                            <span className="truncate block mt-0.5">"{msg.replyTo.content}"</span>
                          </div>
                        )}
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-surface shrink-0 space-y-2">
              {replyingTo && (
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-150 text-2xs">
                  <div className="truncate">
                    <span className="font-bold text-brand">Replying to {replyingTo.senderName}:</span>
                    <span className="text-slate-650 ml-1">"{replyingTo.content}"</span>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Discuss methodology, guidelines or updates with ${selectedCollab.partner?.name}...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-surface text-xs font-semibold transition-all"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="px-4 py-2.5 bg-brand hover:bg-brand-strong disabled:opacity-40 disabled:hover:bg-brand text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-bold shrink-0"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* RESEARCH FILE UPLOAD MODAL */}
        <AnimatePresence>
          {showUploadModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-left"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-brand" /> Reference Research File
                  </h3>
                  <button onClick={() => setShowUploadModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleUploadFile} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 capitalize">File Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Methodology_Draft.pdf"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-surface text-xs font-semibold transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 capitalize">File URL</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. /files/methodology_v1.pdf"
                      value={newFileUrl}
                      onChange={(e) => setNewFileUrl(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-surface text-xs font-semibold transition-all"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-5 py-2 bg-brand hover:bg-brand-strong text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {uploading ? 'Sharing...' : 'Reference Document'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  // Shared Pending Requests Component
  const pendingRequestsSection = ((isSupervisor && pendingApprovals?.length > 0) || myCollabRequests?.received?.filter((r: any) => r.status === 'PENDING').length > 0) ? (
    <div className="bg-surface border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4 max-w-4xl mx-auto w-full mb-8">
      <div className="border-b border-slate-100 pb-2">
        <h3 className="text-xs font-medium text-slate-900 capitalize flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-amber-600" /> Pending Collaboration Requests
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Scholar Advisor mapping requests */}
        {pendingApprovals?.map((req: any) => (
          <div key={req.id} className="p-4 bg-amber-50/20 border border-amber-200/50 rounded-2xl flex flex-col justify-between gap-3 text-left">
            <div>
              <h4 className="text-xs font-semibold text-slate-900">{req.name}</h4>
              <p className="text-xs font-medium text-slate-400 capitalize mt-0.5">{req.department || 'SRMIST'}</p>
              <p className="text-2xs text-slate-600 mt-1 font-semibold">Scholar is requesting supervisor assignment.</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => handleApproveScholar(req.id)}
                className="flex-1 py-2 bg-brand hover:bg-brand-strong text-white text-2xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                onClick={() => handleDeclineScholar(req.id)}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 text-2xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        ))}

        {/* Project proposal requests */}
        {myCollabRequests?.received?.filter((r: any) => r.status === 'PENDING').map((req: any) => (
          <div key={req.id} className="p-4 bg-blue-50/15 border border-blue-200/40 rounded-2xl flex flex-col justify-between gap-3 text-left">
            <div>
              <div className="flex items-center gap-1 bg-blue-50/60 border border-blue-100 rounded px-1.5 py-0.5 w-max">
                <Users className="w-3 h-3 text-brand" />
                <span className="text-xs font-medium text-brand capitalize">Research Collaboration</span>
              </div>
              <h4 className="text-xs font-semibold text-slate-900 mt-2">{req.requester?.name}</h4>
              <p className="text-2xs font-bold text-slate-500 truncate mt-0.5">Focus: {req.thread?.title || 'Joint Project'}</p>
              {req.message && (
                <p className="text-2xs text-slate-500 bg-surface border border-slate-100 rounded-lg p-2 mt-2 leading-relaxed italic">
                  "{req.message}"
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => handleAcceptCollab(req.id, req.requester?.name || '', req.thread?.title || '')}
                className="flex-1 py-2 bg-brand hover:bg-brand-strong text-white text-2xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Accept
              </button>
              <button
                onClick={() => handleDeclineCollab(req.id)}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-55 text-slate-550 text-2xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  // Render Loading / Error / Zero Collaborations (Empty State) or Active Collaborations Dashboard
  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 pb-20 select-none text-left">
      
      {initialLoading && activeCollaborations.length === 0 ? (
        /* ==================================================
           LOADING SKELETON
           ================================================== */
        <div className="w-full max-w-4xl mx-auto py-10 space-y-8 animate-pulse text-left">
          <div className="border-b border-slate-200 pb-4 space-y-2">
            <div className="w-28 h-4 bg-slate-200 rounded" />
            <div className="w-80 h-8 bg-slate-200 rounded-lg" />
            <div className="w-96 h-4 bg-slate-100 rounded" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-surface border border-slate-200/80 rounded-2xl" />
            <div className="h-24 bg-surface border border-slate-200/80 rounded-2xl" />
            <div className="h-24 bg-surface border border-slate-200/80 rounded-2xl" />
          </div>
          <div className="h-64 bg-surface border border-slate-200/80 rounded-3xl" />
        </div>
      ) : loadError && activeCollaborations.length === 0 ? (
        /* ==================================================
           ERROR STATE
           ================================================== */
        <div className="w-full max-w-md mx-auto py-16 text-center space-y-4">
          <div className="bg-surface border border-rose-200 rounded-3xl p-8 shadow-sm space-y-4">
            <div className="w-14 h-14 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Network className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Unable to load Curious Nexus</h3>
              <p className="text-xs text-slate-500 mt-1">{loadError}</p>
            </div>
            <button
              onClick={() => loadNexusData(true)}
              className="w-full py-2.5 bg-brand hover:bg-brand-strong text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        </div>
      ) : activeCollaborations.length === 0 ? (
        /* ==================================================
           3. EMPTY STATE — ZERO COLLABORATIONS
           ================================================== */
        <div className="w-full max-w-none px-6 md:px-10 py-10 space-y-8 text-left">
          
          {/* Header */}
          <div className="border-b border-slate-200 pb-4">
            <span className="text-xs font-medium text-brand capitalize">CURIOUS NEXUS</span>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mt-1">Research Collaboration Workspace</h1>
            <p className="text-xs text-slate-550 font-semibold mt-1">
              Your focused workspace for approved research collaborations with supervisors and scholars.
            </p>
          </div>

          {/* Compact Statistics Grid */}
          <div className="grid grid-cols-3 gap-4 font-sans">
            <div className="bg-surface border border-slate-200 rounded-2xl p-5 shadow-2xs text-center">
              <span className="text-3xl font-semibold text-slate-900">{stats.activeCollabsCount}</span>
              <p className="text-xs font-medium text-slate-450 capitalize mt-1">Active Collaborations</p>
            </div>
            <div className="bg-surface border border-slate-200 rounded-2xl p-5 shadow-2xs text-center">
              <span className="text-3xl font-semibold text-slate-900">{stats.activeProjectsCount}</span>
              <p className="text-xs font-medium text-slate-450 capitalize mt-1">Active Research Projects</p>
            </div>
            <div className="bg-surface border border-slate-200 rounded-2xl p-5 shadow-2xs text-center">
              <span className="text-3xl font-semibold text-slate-900">{stats.pendingRequestsCount}</span>
              <p className="text-xs font-medium text-slate-450 capitalize mt-1">Pending Collaboration Requests</p>
            </div>
          </div>

          {/* Pending Requests Prominent Section */}
          {pendingRequestsSection}

          {/* Central Empty State Card */}
          <div className="bg-surface border border-slate-200 rounded-3xl p-10 text-center shadow-3xs flex flex-col items-center justify-center max-w-2xl mx-auto space-y-4">
            <div className="w-16 h-16 bg-blue-50 border border-blue-100 text-brand rounded-2xl flex items-center justify-center shadow-3xs">
              <Network className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold text-slate-900">
                {stats.activeProjectsCount > 0 ? "No active 1:1 collaborations" : "No active research collaborations"}
              </h3>
              <p className="text-xs md:text-sm text-slate-550 leading-relaxed font-semibold max-w-md mx-auto">
                {stats.activeProjectsCount > 0
                  ? "You have an active research project, but no 1:1 research collaborations. Connect with researchers to start collaborating."
                  : "Once you establish an approved research collaboration, your research discussions, updates and collaboration activity will appear here."}
              </p>
            </div>
            {stats.activeProjectsCount > 0 && workspaces && workspaces.length > 0 ? (
              <Link
                href={`/workspace/${workspaces[0].id}`}
                className="px-5 py-2.5 bg-success hover:bg-success-strong text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 font-sans"
              >
                <FolderGit2 className="w-4 h-4" />
                Open Active Project Workspace
              </Link>
            ) : (
              <Link
                href="/researchers"
                className="px-5 py-2.5 bg-brand hover:bg-brand-strong text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 font-sans"
              >
                Explore Researchers →
              </Link>
            )}
          </div>

        </div>
      ) : (
        /* ==================================================
           4. ACTIVE COLLABORATIONS STATE
           ================================================== */
        <div className="w-full max-w-none px-6 md:px-10 py-6 space-y-8 text-left">
          
          {/* Header */}
          <div className="border-b border-slate-200 pb-4">
            <span className="text-xs font-medium text-brand capitalize">CURIOUS NEXUS</span>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mt-1">Research Collaboration Workspace</h1>
            <p className="text-xs text-slate-550 font-semibold mt-1">
              Your active research collaborations
            </p>
          </div>

          {/* Real Statistics Grid */}
          <div className="grid grid-cols-3 gap-4 font-sans">
            <div className="bg-surface border border-slate-200 rounded-2xl p-5 shadow-2xs text-center">
              <span className="text-3xl font-semibold text-slate-900">{stats.activeCollabsCount}</span>
              <p className="text-xs font-medium text-slate-450 capitalize mt-1">Active Collaborations</p>
            </div>
            <div className="bg-surface border border-slate-200 rounded-2xl p-5 shadow-2xs text-center">
              <span className="text-3xl font-semibold text-slate-900">{stats.activeProjectsCount}</span>
              <p className="text-xs font-medium text-slate-450 capitalize mt-1">Active Research Projects</p>
            </div>
            <div className="bg-surface border border-slate-200 rounded-2xl p-5 shadow-2xs text-center">
              <span className="text-3xl font-semibold text-slate-900">{stats.pendingRequestsCount}</span>
              <p className="text-xs font-medium text-slate-450 capitalize mt-1">Pending Collaboration Requests</p>
            </div>
          </div>

          {/* Pending Requests Prominent Section */}
          {pendingRequestsSection}

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search your collaborations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface border border-slate-200 rounded-xl text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand text-xs font-semibold shadow-3xs transition-all animate-none"
            />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {filteredCollaborations.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-surface border border-slate-200 rounded-3xl">
                <p className="text-xs font-semibold text-slate-450">No matching active collaborations found.</p>
              </div>
            ) : (
              filteredCollaborations.map((collab) => (
                <div
                  key={collab.id}
                  className="bg-surface border border-slate-200 hover:border-slate-300 rounded-3xl p-6 shadow-3xs flex flex-col justify-between gap-5 transition-all hover:shadow-2xs"
                >
                  <div className="space-y-4">
                    {/* Header line */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-sans text-sm font-semibold text-slate-905 tracking-tight truncate max-w-[70%]">
                        {collab.title}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-250 rounded-full font-medium text-xs capitalize">
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                        {collab.status}
                      </span>
                    </div>

                    {/* Partner identity */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                        <img src={getProfileImageUrl(collab.partner)} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-900 leading-tight">
                          {collab.partner?.name}
                        </h4>
                        <p className="text-xs font-medium text-brand capitalize mt-0.5">
                          {collab.partner?.roleLabel}
                        </p>
                      </div>
                    </div>

                    {/* Metadata lines */}
                    <div className="space-y-2.5 text-2xs">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-slate-400 uppercase tracking-wide shrink-0">Topic:</span>
                        <span className="font-semibold text-slate-700 truncate">{collab.topic}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-slate-400 uppercase tracking-wide shrink-0">Research Area:</span>
                        <span className="font-semibold text-slate-700 truncate">{collab.partner?.department}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-slate-400 uppercase tracking-wide shrink-0">Started Date:</span>
                        <span className="font-semibold text-slate-700">{collab.startedAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* CTA button */}
                  <button
                    onClick={() => setOpenedCollabId(collab.id)}
                    className="w-full py-2.5 bg-brand hover:bg-brand-strong text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer font-sans"
                  >
                    Open Collaboration
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* ─── START COLLABORATION PLATFORM SELECTION MODAL ─── */}
      {pendingAcceptReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cb-card bg-surface max-w-lg w-full p-6 rounded-2xl shadow-xl space-y-6 relative text-left">
            <button
              onClick={() => setPendingAcceptReq(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-primary capitalize font-mono">
                Nexus Initialization
              </span>
              <h3 className="text-xl font-bold font-display text-slate-900">Start Collaboration</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Choose the external collaboration platform for <strong className="text-slate-800">{pendingAcceptReq.name}</strong> on "{pendingAcceptReq.title}". CuriousBees remains your research system of record.
              </p>
            </div>

            {/* Platform Options */}
            <div className="space-y-3">
              {/* Google Workspace */}
              <div
                onClick={() => setSelectedPlatform('GOOGLE_WORKSPACE')}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                  selectedPlatform === 'GOOGLE_WORKSPACE'
                    ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20'
                    : 'border-slate-200 bg-surface hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface border border-slate-200 flex items-center justify-center p-2 shadow-2xs shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-slate-900">Google Workspace</h4>
                      <span className="text-2xs font-bold uppercase bg-primary/10 text-primary px-1.5 py-0.2 rounded">Recommended</span>
                    </div>
                    <ul className="text-2xs text-slate-500 space-y-0.5 list-disc list-inside">
                      <li>Google Chat Spaces for team discussion</li>
                      <li>Google Meet for video conferencing</li>
                      <li>Google Calendar for meeting scheduling</li>
                    </ul>
                  </div>
                </div>
                <input
                  type="radio"
                  name="platformSelect"
                  checked={selectedPlatform === 'GOOGLE_WORKSPACE'}
                  onChange={() => setSelectedPlatform('GOOGLE_WORKSPACE')}
                  className="mt-1"
                />
              </div>

              {/* Zoom Workplace */}
              <div
                onClick={() => setSelectedPlatform('ZOOM_WORKPLACE')}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                  selectedPlatform === 'ZOOM_WORKPLACE'
                    ? 'border-blue-500 bg-blue-500/5 shadow-xs ring-1 ring-blue-500/20'
                    : 'border-slate-200 bg-surface hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center p-2 text-blue-500 shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-slate-900">Zoom Workplace</h4>
                    </div>
                    <ul className="text-2xs text-slate-500 space-y-0.5 list-disc list-inside">
                      <li>Zoom Meetings for direct video syncs</li>
                      <li>Instant passcodes and participant links</li>
                    </ul>
                  </div>
                </div>
                <input
                  type="radio"
                  name="platformSelect"
                  checked={selectedPlatform === 'ZOOM_WORKPLACE'}
                  onChange={() => setSelectedPlatform('ZOOM_WORKPLACE')}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingAcceptReq(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmAcceptCollab}
                disabled={acceptingLoading}
                className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-medium capitalize rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                {acceptingLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Initializing Workspace...</span>
                  </>
                ) : (
                  <span>Continue with {selectedPlatform === 'GOOGLE_WORKSPACE' ? 'Google Workspace' : 'Zoom Workplace'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
