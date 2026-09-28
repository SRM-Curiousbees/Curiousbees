'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { 
  FolderOpen, 
  CheckSquare, 
  Megaphone, 
  UploadCloud, 
  Plus, 
  Calendar, 
  User, 
  ArrowLeft, 
  Loader2, 
  FileText, 
  X, 
  Check, 
  Download, 
  AlertTriangle, 
  Sparkles, 
  ChevronRight,
  MessageSquare,
  Video,
  ExternalLink,
  Activity,
  Layers,
  BookOpen,
  Settings2,
  Clock,
  Radio,
  CheckCircle2,
  CalendarCheck2,
  CalendarX2,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MeetingProvider, IntegrationProvider } from '@curiousbees/types';

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
    uploadResearchFileToS3,
    addWorkspaceMilestone, 
    toggleWorkspaceMilestone, 
    addWorkspaceAnnouncement, 
    workspaceMeetings,
    fetchWorkspaceMeetings,
    createWorkspaceMeeting,
    cancelWorkspaceMeeting,
    setWorkspaceCollaborationProvider,
    connectWorkspaceChatSpace,
    integrationConnections,
    fetchIntegrationStatus,
    isLoading,
    addToast
  } = useStore();

  // Tab State
  type TabId = 'overview' | 'research' | 'tasks' | 'publications' | 'files' | 'discussions' | 'meetings' | 'activity' | 'integrations';
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Local Form States
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);

  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);

  // Meeting Schedule Modal
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDesc, setMeetingDesc] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingDuration, setMeetingDuration] = useState<number>(30);
  const [meetingProvider, setMeetingProvider] = useState<MeetingProvider>('GOOGLE_MEET');
  const [customMeetingUrl, setCustomMeetingUrl] = useState('');
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [connectingChat, setConnectingChat] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceDetails(workspaceId).catch(() => {
        router.push('/workspace');
      });
      fetchWorkspaceMeetings(workspaceId);
      fetchIntegrationStatus();
    }
  }, [workspaceId, fetchWorkspaceDetails, fetchWorkspaceMeetings, fetchIntegrationStatus, router]);

  const meetings = workspaceMeetings[workspaceId] || [];
  const upcomingMeetings = meetings.filter(m => m.status === 'SCHEDULED' && new Date(m.scheduledAt) >= new Date(Date.now() - 3600000));
  const pastMeetings = meetings.filter(m => m.status !== 'SCHEDULED' || new Date(m.scheduledAt) < new Date(Date.now() - 3600000));

  if (isLoading && !activeWorkspace) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <Sparkles className="w-5 h-5 text-primary absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-xs text-primary font-bold uppercase tracking-wider font-mono">Secure Node Handshake</p>
          <p className="text-xs text-slate-400 font-semibold uppercase">Synchronizing research workspace credentials...</p>
        </div>
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="text-center py-12 cb-card max-w-md mx-auto my-12 p-8 space-y-5 bg-white/90 backdrop-blur-md">
        <div className="w-12 h-12 bg-red-50 text-red-600 border border-red-100 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h3 className="font-display font-bold text-lg text-slate-900">Workspace Node Offline</h3>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            The requested research node does not exist or you do not have sufficient credential clearance.
          </p>
        </div>
        <button 
          onClick={() => router.push('/workspace')} 
          className="w-full py-2.5 bg-primary text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow cursor-pointer"
        >
          Back to Workspaces
        </button>
      </div>
    );
  }

  // Find if current user is owner of workspace
  const userMemberRecord = activeWorkspace.members?.find(m => m.userId === currentUser?.id);
  const isOwner = userMemberRecord?.role === 'OWNER' || currentUser?.role === 'RESEARCH_SUPERVISOR' || currentUser?.role === 'INSTITUTE_ADMIN';

  // Handle file upload
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !fileUrl) {
      addToast('Please select a file to upload or enter a resource link.', 'error');
      return;
    }

    setIsUploadingFile(true);
    try {
      if (selectedFile) {
        // Direct browser upload to S3 via presigned URL
        const s3Result = await uploadResearchFileToS3(selectedFile, `workspaces/${workspaceId}`);
        await addWorkspaceFile(workspaceId, fileName || selectedFile.name, s3Result.fileUrl, s3Result.size);
        addToast(`Successfully uploaded ${fileName || selectedFile.name} to S3.`, 'success');
      } else if (fileUrl) {
        await addWorkspaceFile(workspaceId, fileName || 'Research Document Link', fileUrl, 0);
        addToast(`Linked external resource to workspace.`, 'success');
      }

      setFileName('');
      setFileUrl('');
      setSelectedFile(null);
      setShowFileModal(false);
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || 'File upload failed.', 'error');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Handle milestone add
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle) return;

    try {
      await addWorkspaceMilestone(workspaceId, milestoneTitle, milestoneDesc, milestoneDueDate || undefined);
      setMilestoneTitle('');
      setMilestoneDesc('');
      setMilestoneDueDate('');
      setShowMilestoneModal(false);
      addToast(`Created milestone: ${milestoneTitle}`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Handle meeting scheduling
  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle || !meetingDate || !meetingTime) {
      addToast('Please provide meeting title, date, and time.', 'error');
      return;
    }

    try {
      setSchedulingMeeting(true);
      const scheduledDateTime = new Date(`${meetingDate}T${meetingTime}`);

      await createWorkspaceMeeting(workspaceId, {
        title: meetingTitle,
        description: meetingDesc,
        provider: meetingProvider,
        scheduledAt: scheduledDateTime,
        duration: Number(meetingDuration),
        externalMeetingUrl: meetingProvider === 'EXTERNAL' ? customMeetingUrl : undefined,
      });

      setShowMeetingModal(false);
      setMeetingTitle('');
      setMeetingDesc('');
      setMeetingDate('');
      setMeetingTime('');
      setCustomMeetingUrl('');
      addToast(`Scheduled "${meetingTitle}" via ${meetingProvider === 'GOOGLE_MEET' ? 'Google Meet' : meetingProvider === 'ZOOM' ? 'Zoom' : 'External Link'}.`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Could not schedule research meeting.', 'error');
    } finally {
      setSchedulingMeeting(false);
    }
  };

  // Handle Google Chat Space connection
  const handleConnectGoogleChat = async () => {
    try {
      setConnectingChat(true);
      const res = await connectWorkspaceChatSpace(workspaceId);
      addToast('Created dedicated Google Chat Space for this collaboration.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Please ensure Google Workspace is connected in Settings.', 'error');
    } finally {
      setConnectingChat(false);
    }
  };

  // Get initials for member avatars
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // Progress metrics calculation
  const totalMilestones = activeWorkspace.milestones?.length || 0;
  const completedMilestones = activeWorkspace.milestones?.filter(m => m.completed).length || 0;
  const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const currentProvider = activeWorkspace.collaborationProvider || 'GOOGLE_WORKSPACE';

  return (
    <div className="space-y-6 text-left select-none max-w-7xl mx-auto py-2">
      
      {/* 🔙 BACK HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <button 
          onClick={() => router.push('/workspace')} 
          className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Workspaces</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-mono flex items-center gap-1.5 bg-primary/5 px-2.5 py-1 rounded-md border border-primary/15">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Curious Nexus</span>
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            ID: {workspaceId.substring(0, 8)}
          </span>
        </div>
      </div>

      {/* 📄 WORKSPACE HERO HEADER */}
      <div className="cb-card p-6 bg-white border border-slate-200/80 rounded-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xs">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-3 relative z-10 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase tracking-wider font-bold">
              Active Collaboration
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
              {currentProvider === 'GOOGLE_WORKSPACE' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Google Workspace</span>
                </>
              ) : currentProvider === 'ZOOM_WORKPLACE' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Zoom Workplace</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>External Hub</span>
                </>
              )}
            </span>
          </div>
          
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
            {activeWorkspace.title}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm max-w-3xl leading-relaxed font-medium">
            {activeWorkspace.description || 'Shared institutional workspace for research peer collaboration, file management, and milestones tracking.'}
          </p>

          {/* Members Ring */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Collaborators:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {activeWorkspace.members?.map((member) => (
                <div key={member.userId} className="flex items-center space-x-2 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
                    {member.user?.image ? (
                      <img src={member.user.image} alt={member.user.name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-bold text-primary">{getInitials(member.user?.name || '')}</span>
                    )}
                  </div>
                  <div className="text-left leading-none">
                    <p className="text-xs font-bold text-slate-800">{member.user?.name}</p>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 block">
                      {member.role === 'OWNER' ? 'Principal Investigator' : 'Collaborator'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Launch & Progress widget */}
        <div className="cb-card p-4 bg-slate-50 border border-slate-200/60 rounded-xl w-full md:w-64 relative z-10 flex flex-col justify-between space-y-4 shrink-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Research Progress</span>
              <span className="text-xs font-bold text-primary font-mono">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-primary rounded-full"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {completedMilestones} of {totalMilestones} Milestones Complete
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('discussions')}
              className="flex-1 py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3 h-3 text-blue-600" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => { setActiveTab('meetings'); setShowMeetingModal(true); }}
              className="flex-1 py-1.5 px-2.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Video className="w-3 h-3" />
              <span>Meet</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🎛️ 9-TAB NAVIGATION BAR */}
      <div className="flex items-center gap-1 bg-slate-100/90 border border-slate-200/80 p-1.5 rounded-xl overflow-x-auto no-scrollbar shadow-2xs">
        {([
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'research', label: 'Research', icon: BookOpen },
          { id: 'tasks', label: 'Tasks', icon: CheckSquare },
          { id: 'publications', label: 'Publications', icon: FileText },
          { id: 'files', label: 'Files', icon: UploadCloud },
          { id: 'discussions', label: 'Discussions', icon: MessageSquare },
          { id: 'meetings', label: 'Meetings', icon: Video },
          { id: 'activity', label: 'Activity', icon: Activity },
          { id: 'integrations', label: 'Integrations', icon: Settings2 },
        ] as const).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all duration-150 shrink-0 cursor-pointer select-none ${
                isActive 
                  ? 'bg-white text-primary shadow-xs border border-slate-200/80 font-bold' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.id === 'meetings' && upcomingMeetings.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-mono font-bold">
                  {upcomingMeetings.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ⚡ TAB CONTENTS */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">

          {/* ── 1. OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Collaboration Hub Card */}
                <div className="md:col-span-2 cb-card p-6 bg-white border border-slate-200/80 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span>Research Collaboration Summary</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This Curious Nexus connects approved researchers for institutional joint research, milestone verification, publication co-authoring, and peer syncs.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Milestones</span>
                      <p className="text-lg font-bold font-mono text-slate-900">{completedMilestones}/{totalMilestones}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Shared Files</span>
                      <p className="text-lg font-mono font-bold text-slate-900">{activeWorkspace.files?.length || 0}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Meetings</span>
                      <p className="text-lg font-mono font-bold text-slate-900">{meetings.length}</p>
                    </div>
                  </div>
                </div>

                {/* Primary Communication Channel Card */}
                <div className="cb-card p-6 bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Collaboration Tool</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {currentProvider === 'GOOGLE_WORKSPACE' ? 'Google Workspace' : currentProvider === 'ZOOM_WORKPLACE' ? 'Zoom Workplace' : 'External'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {currentProvider === 'GOOGLE_WORKSPACE' 
                        ? 'Google Chat Space for ongoing research discussions and Google Meet for scheduled calls.' 
                        : 'Zoom Meetings for high-fidelity video discussions and screen sharing.'}
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('discussions')}
                    className="w-full py-2 bg-primary hover:bg-primary/95 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Open Research Discussion</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

              </div>
            </motion.div>
          )}

          {/* ── 2. RESEARCH TAB ── */}
          {activeTab === 'research' && (
            <motion.div
              key="research-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="cb-card p-6 bg-white border border-slate-200/80 rounded-2xl space-y-4 text-xs"
            >
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Research Objectives & Scope</span>
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {activeWorkspace.description || 'This collaboration aims to address computational and theoretical frameworks in the designated research domains.'}
              </p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Institutional Governance</span>
                <p className="text-slate-500">
                  All research conducted under this Curious Nexus complies with SRMIST Academic Integrity and Ethics Guidelines.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── 3. TASKS TAB (MILESTONES) ── */}
          {activeTab === 'tasks' && (
            <motion.div
              key="tasks-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Collaboration Milestones</h3>
                <button 
                  onClick={() => setShowMilestoneModal(true)} 
                  className="flex items-center space-x-1.5 px-3 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Milestone</span>
                </button>
              </div>

              {activeWorkspace.milestones && activeWorkspace.milestones.length > 0 ? (
                <div className="space-y-3">
                  {activeWorkspace.milestones.map((milestone) => (
                    <div 
                      key={milestone.id} 
                      className={`cb-card p-4 border rounded-xl flex items-start justify-between gap-4 transition-all bg-white ${
                        milestone.completed ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200/80 hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleWorkspaceMilestone(workspaceId, milestone.id, !milestone.completed)}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                            milestone.completed 
                              ? 'bg-emerald-600 border-emerald-600 text-white' 
                              : 'border-slate-300 hover:border-primary bg-white'
                          }`}
                        >
                          {milestone.completed && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <div className="space-y-1">
                          <h4 className={`text-xs font-bold ${milestone.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {milestone.title}
                          </h4>
                          {milestone.description && (
                            <p className="text-xs text-slate-500 leading-relaxed">{milestone.description}</p>
                          )}
                          {milestone.dueDate && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400">
                              <Calendar className="w-3 h-3" />
                              <span>Due {new Date(milestone.dueDate).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        milestone.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {milestone.completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 cb-card bg-white border border-slate-200/80 rounded-xl space-y-3">
                  <CheckSquare className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No milestones yet</p>
                  <p className="text-xs text-slate-400">Create research targets and progress deliverables for this collaboration.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── 4. PUBLICATIONS TAB ── */}
          {activeTab === 'publications' && (
            <motion.div
              key="publications-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="cb-card p-6 bg-white border border-slate-200/80 rounded-2xl space-y-4"
            >
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>Associated Publications & Drafts</span>
              </h3>
              <p className="text-xs text-slate-500">
                Manuscripts, conference pre-prints, and journal submissions linked to this research node.
              </p>
              <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No linked publications yet</p>
                <p className="text-xs text-slate-400">Manuscripts will appear here once submitted or linked from Publications module.</p>
              </div>
            </motion.div>
          )}

          {/* ── 5. FILES TAB ── */}
          {activeTab === 'files' && (
            <motion.div
              key="files-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Shared Documents & Artifacts</h3>
                <button 
                  onClick={() => setShowFileModal(true)} 
                  className="flex items-center space-x-1.5 px-3 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Resource</span>
                </button>
              </div>

              {activeWorkspace.files && activeWorkspace.files.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeWorkspace.files.map((file) => (
                    <div 
                      key={file.id} 
                      className="cb-card p-4 flex items-start justify-between hover:border-primary/40 transition-all bg-white border border-slate-200/80 rounded-xl"
                    >
                      <div className="flex items-start space-x-3 text-left min-w-0">
                        <div className="w-9 h-9 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate" title={file.name}>
                            {file.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Uploaded by {file.uploadedBy?.name || 'Academic'} | {file.size} KB
                          </p>
                        </div>
                      </div>
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-primary hover:bg-primary hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider shrink-0 ml-2 flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 cb-card bg-white border border-slate-200/80 rounded-xl space-y-3">
                  <UploadCloud className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No resources shared yet</p>
                  <p className="text-xs text-slate-400">Upload research datasets, code snippets, or draft documents.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── 6. DISCUSSIONS TAB (GOOGLE CHAT / ZOOM CHAT) ── */}
          {activeTab === 'discussions' && (
            <motion.div
              key="discussions-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {currentProvider === 'GOOGLE_WORKSPACE' ? (
                /* Google Chat Space Integration Card */
                <div className="cb-card p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center p-2.5 shadow-2xs">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-base text-slate-900">Google Chat Research Space</h3>
                          <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Connected</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Dedicated external space for "{activeWorkspace.title}"
                        </p>
                      </div>
                    </div>

                    {activeWorkspace.googleChatSpaceUrl ? (
                      <a
                        href={activeWorkspace.googleChatSpaceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                      >
                        <span>Open Research Discussion</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button
                        onClick={handleConnectGoogleChat}
                        disabled={connectingChat}
                        className="px-4 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                      >
                        {connectingChat ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Provisioning Space...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Connect Google Chat Space</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Space Name</span>
                      <p className="font-bold text-slate-800">CuriousBees · {activeWorkspace.title}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Space Membership</span>
                      <p className="text-slate-600">{activeWorkspace.members?.length || 2} Approved Collaborators</p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-slate-600 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p>
                      All ongoing peer communication, file attachments, and direct messages take place securely inside your institutional Google Chat space. CuriousBees stores zero message transcripts.
                    </p>
                  </div>
                </div>
              ) : (
                /* Zoom Workplace / External Channel Card */
                <div className="cb-card p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#2D8CFF]/10 border border-[#2D8CFF]/20 flex items-center justify-center p-2.5">
                      <Video className="w-6 h-6 text-[#2D8CFF]" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-900">Zoom Workplace Collaboration</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Selected platform for video conferencing and research meetings.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setActiveTab('meetings'); setShowMeetingModal(true); }}
                    className="px-4 py-2.5 bg-[#2D8CFF] hover:bg-[#2378DE] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Schedule Zoom Discussion</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── 7. MEETINGS TAB (GOOGLE MEET & ZOOM) ── */}
          {activeTab === 'meetings' && (
            <motion.div
              key="meetings-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-display font-bold text-slate-900">Research Meetings</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Schedule and join video conferencing syncs for this research collaboration.
                  </p>
                </div>

                <button
                  onClick={() => setShowMeetingModal(true)}
                  className="px-4 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Meeting</span>
                </button>
              </div>

              {/* Upcoming Meetings Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <CalendarCheck2 className="w-3.5 h-3.5 text-primary" />
                  <span>Upcoming Meetings ({upcomingMeetings.length})</span>
                </div>

                {upcomingMeetings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingMeetings.map((meeting) => {
                      const meetDate = new Date(meeting.scheduledAt);
                      const isGoogle = meeting.provider === 'GOOGLE_MEET';
                      const isZoom = meeting.provider === 'ZOOM';

                      return (
                        <div 
                          key={meeting.id}
                          className="cb-card p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isGoogle 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : isZoom 
                                  ? 'bg-blue-50 text-[#2D8CFF] border border-blue-200' 
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}>
                                <Video className="w-3 h-3" />
                                <span>{isGoogle ? 'Google Meet' : isZoom ? 'Zoom Workplace' : 'External'}</span>
                              </span>

                              <span className="text-[11px] font-mono font-bold text-slate-500">
                                {meeting.duration} mins
                              </span>
                            </div>

                            <h4 className="font-display font-bold text-sm text-slate-900 leading-snug">
                              {meeting.title}
                            </h4>

                            {meeting.description && (
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {meeting.description}
                              </p>
                            )}

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-semibold">
                                  {meetDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                                <span>·</span>
                                <span className="font-mono font-bold text-slate-900">
                                  {meetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium">
                                Host: {meeting.createdBy?.name?.split(' ')[0] || 'Peer'}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 flex items-center gap-2">
                            <a
                              href={meeting.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                              <span>Join Meeting</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            {meeting.createdById === currentUser?.id && (
                              <button
                                onClick={() => {
                                  if (confirm('Cancel this scheduled meeting?')) {
                                    cancelWorkspaceMeeting(workspaceId, meeting.id);
                                  }
                                }}
                                className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 cb-card bg-white border border-slate-200/80 rounded-2xl text-center space-y-3">
                    <Video className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No upcoming meetings scheduled</p>
                    <p className="text-xs text-slate-400">Click "Schedule Meeting" to coordinate your next research review.</p>
                  </div>
                )}
              </div>

              {/* Past Meetings Section */}
              {pastMeetings.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200/80">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Past Meetings & Archives
                  </span>
                  <div className="space-y-2">
                    {pastMeetings.map((meeting) => (
                      <div 
                        key={meeting.id}
                        className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <h5 className="font-bold text-slate-800">{meeting.title}</h5>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {new Date(meeting.scheduledAt).toLocaleDateString()} · {meeting.duration} mins · {meeting.provider}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                          {meeting.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── 8. ACTIVITY TAB ── */}
          {activeTab === 'activity' && (
            <motion.div
              key="activity-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="cb-card p-6 bg-white border border-slate-200/80 rounded-2xl space-y-4"
            >
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span>Collaboration Audit & Activity Log</span>
              </h3>
              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">Curious Nexus Workspace Synchronized</p>
                    <p className="text-slate-500 text-[10px]">Secure node established between research scholars and supervisors.</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">Node Ready</span>
                </div>
                {meetings.map((m) => (
                  <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800">Meeting Scheduled: {m.title}</p>
                      <p className="text-slate-500 text-[10px]">Scheduled via {m.provider} for {new Date(m.scheduledAt).toLocaleString()}.</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{m.status}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── 9. INTEGRATIONS TAB ── */}
          {activeTab === 'integrations' && (
            <motion.div
              key="integrations-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="cb-card p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-display font-bold text-slate-900">Workspace Collaboration Platform</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select the primary communication infrastructure for this research collaboration.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Google Workspace Option */}
                  <div 
                    onClick={() => setWorkspaceCollaborationProvider(workspaceId, 'GOOGLE_WORKSPACE')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      currentProvider === 'GOOGLE_WORKSPACE' 
                        ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-900">Google Workspace</h4>
                        <p className="text-xs text-slate-500 font-medium">Google Chat Spaces & Google Meet</p>
                      </div>
                      <input 
                        type="radio" 
                        name="collabProvider" 
                        checked={currentProvider === 'GOOGLE_WORKSPACE'} 
                        onChange={() => setWorkspaceCollaborationProvider(workspaceId, 'GOOGLE_WORKSPACE')}
                        className="mt-1"
                      />
                    </div>
                    <span className="text-[10px] font-bold uppercase text-primary font-mono">Primary SRM Provider</span>
                  </div>

                  {/* Zoom Workplace Option */}
                  <div 
                    onClick={() => setWorkspaceCollaborationProvider(workspaceId, 'ZOOM_WORKPLACE')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      currentProvider === 'ZOOM_WORKPLACE' 
                        ? 'border-[#2D8CFF] bg-[#2D8CFF]/5 shadow-xs ring-1 ring-[#2D8CFF]/20' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-900">Zoom Workplace</h4>
                        <p className="text-xs text-slate-500 font-medium">Zoom Meetings & Video Conferencing</p>
                      </div>
                      <input 
                        type="radio" 
                        name="collabProvider" 
                        checked={currentProvider === 'ZOOM_WORKPLACE'} 
                        onChange={() => setWorkspaceCollaborationProvider(workspaceId, 'ZOOM_WORKPLACE')}
                        className="mt-1"
                      />
                    </div>
                    <span className="text-[10px] font-bold uppercase text-[#2D8CFF] font-mono">Secondary Provider</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Need to link or re-authorize external accounts?</span>
                  <button
                    onClick={() => router.push('/settings/integrations')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Manage External Connections</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── 🗓️ SCHEDULE MEETING MODAL ── */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cb-card bg-white max-w-lg w-full p-6 rounded-2xl shadow-xl space-y-5 relative">
            <button 
              onClick={() => setShowMeetingModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold font-display text-slate-900">Schedule Research Meeting</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Coordinate a video conference sync for this collaboration.
              </p>
            </div>

            <form onSubmit={handleScheduleMeeting} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Meeting Title</label>
                <input 
                  type="text" 
                  value={meetingTitle} 
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Research Milestone Sync #03" 
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Description (Optional)</label>
                <textarea 
                  value={meetingDesc} 
                  onChange={(e) => setMeetingDesc(e.target.value)}
                  placeholder="Agenda points or discussion topics..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Date</label>
                  <input 
                    type="date" 
                    value={meetingDate} 
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Time</label>
                  <input 
                    type="time" 
                    value={meetingTime} 
                    onChange={(e) => setMeetingTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Duration</label>
                <select
                  value={meetingDuration}
                  onChange={(e) => setMeetingDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes (1 Hour)</option>
                </select>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2 pt-1">
                <label className="font-bold text-slate-700">Meeting Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMeetingProvider('GOOGLE_MEET')}
                    className={`py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      meetingProvider === 'GOOGLE_MEET'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Google Meet
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeetingProvider('ZOOM')}
                    className={`py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      meetingProvider === 'ZOOM'
                        ? 'border-[#2D8CFF] bg-[#2D8CFF]/10 text-[#2D8CFF] font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Zoom Workplace
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeetingProvider('EXTERNAL')}
                    className={`py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      meetingProvider === 'EXTERNAL'
                        ? 'border-purple-600 bg-purple-50 text-purple-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    External Link
                  </button>
                </div>
              </div>

              {meetingProvider === 'EXTERNAL' && (
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-slate-700">Custom Conference URL</label>
                  <input 
                    type="url" 
                    value={customMeetingUrl} 
                    onChange={(e) => setCustomMeetingUrl(e.target.value)}
                    placeholder="https://teams.microsoft.com/... or https://..." 
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schedulingMeeting}
                  className="px-5 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  {schedulingMeeting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <span>Create Research Meeting</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 📁 FILE UPLOAD MODAL ── */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cb-card bg-white max-w-md w-full p-6 rounded-2xl shadow-xl space-y-4 relative">
            <button 
              onClick={() => {
                if (!isUploadingFile) {
                  setShowFileModal(false);
                  setSelectedFile(null);
                }
              }}
              disabled={isUploadingFile}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Research Document</h3>
              <p className="text-slate-500 text-xs">Direct encrypted S3 upload for papers, datasets, or presentations.</p>
            </div>
            <form onSubmit={handleUploadFile} className="space-y-3 text-xs">
              {/* File Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Select File (Max 50MB)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-primary/50 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    id="research-file-input"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        if (!fileName) setFileName(file.name);
                      }
                    }}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.txt,.csv"
                  />
                  <label htmlFor="research-file-input" className="cursor-pointer flex flex-col items-center gap-1.5">
                    <UploadCloud className="w-8 h-8 text-primary" />
                    {selectedFile ? (
                      <div className="text-left w-full mt-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                        <span className="font-semibold text-slate-800 truncate max-w-[240px]">{selectedFile.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    ) : (
                      <>
                        <span className="font-bold text-slate-800 hover:text-primary">Click to browse file</span>
                        <span className="text-[10px] text-slate-400">PDF, Word, PPT, Excel, ZIP, Data up to 50MB</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Display Name (Optional)</label>
                <input 
                  type="text" 
                  value={fileName} 
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. SRM-Research-Report-2026.pdf" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-primary"
                />
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-2 text-[10px] font-bold text-slate-400 uppercase">OR External Link</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">External Resource URL</label>
                <input 
                  type="url" 
                  value={fileUrl} 
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or https://arxiv.org/..." 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-primary"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isUploadingFile}
                  onClick={() => {
                    setShowFileModal(false);
                    setSelectedFile(null);
                  }}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingFile || (!selectedFile && !fileUrl)}
                  className="px-4 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isUploadingFile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isUploadingFile ? 'Uploading to S3...' : 'Upload Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 🎯 MILESTONE MODAL ── */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cb-card bg-white max-w-md w-full p-6 rounded-2xl shadow-xl space-y-4 relative">
            <button 
              onClick={() => setShowMilestoneModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900">Add Collaboration Milestone</h3>
            <form onSubmit={handleCreateMilestone} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Milestone Title</label>
                <input 
                  type="text" 
                  value={milestoneTitle} 
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Complete Baseline Benchmarking" 
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description</label>
                <textarea 
                  value={milestoneDesc} 
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  placeholder="Deliverable criteria..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Target Due Date</label>
                <input 
                  type="date" 
                  value={milestoneDueDate} 
                  onChange={(e) => setMilestoneDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-primary"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg font-bold shadow-xs"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
