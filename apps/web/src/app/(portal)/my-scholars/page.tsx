'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useStore } from '@/store/useStore';
import { 
  GraduationCap, 
  Mail, 
  MessageSquare, 
  BookOpen, 
  FileText, 
  Check, 
  X, 
  Clock, 
  User, 
  ArrowUpRight, 
  Building,
  UserCheck,
  Search,
  Activity,
  ShieldAlert,
  ChevronRight,
  UploadCloud,
  FileSpreadsheet,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
    addToast
  } = useStore();

  // Reassign Modal State
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
      const res = await fetch('/api/users/supervisors');
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

  // Supervision Data Loading & Error States
  const [loading, setLoading] = useState(myScholars.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Active Supervision tab state: scholars, requests, reports
  const [activeTab, setActiveTab] = useState<'scholars' | 'requests' | 'reports'>('scholars');

  // Requests sub-tab state: pending, approved, history
  const [requestSubTab, setRequestSubTab] = useState<'pending' | 'approved' | 'history'>('pending');

  // Reports state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [feedback, setFeedback] = useState('');
  const [reportsSearchQuery, setReportsSearchQuery] = useState('');

  // Guard: Only Research Supervisors allowed
  useEffect(() => {
    if (currentUser && currentUser.role !== 'RESEARCH_SUPERVISOR') {
      router.replace('/feed');
    }
  }, [currentUser, router]);

  // Handle URL deep link search tab param
  useEffect(() => {
    if (tabParam === 'requests') {
      setActiveTab('requests');
    } else if (tabParam === 'reports') {
      setActiveTab('reports');
    } else {
      setActiveTab('scholars');
    }
  }, [tabParam]);

  // Load backend data reliably
  const loadSupervisionData = React.useCallback(async (showLoading = true) => {
    if (currentUser?.role !== 'RESEARCH_SUPERVISOR') return;
    if (showLoading && myScholars.length === 0) setLoading(true);
    setError(null);
    try {
      await Promise.allSettled([
        fetchMyScholars(),
        fetchWorkspaces(),
        fetchReports(),
        fetchPendingApprovals(),
        fetchCollaborationRequests(),
      ]);
    } catch (e: any) {
      console.error('Failed to load supervision data:', e);
      setError('Unable to load supervision panel data.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.role, fetchMyScholars, fetchWorkspaces, fetchReports, fetchPendingApprovals, fetchCollaborationRequests, myScholars.length]);

  useEffect(() => {
    loadSupervisionData(myScholars.length === 0);
  }, [loadSupervisionData]);

  if (currentUser?.role !== 'RESEARCH_SUPERVISOR') {
    return null;
  }

  // --- MY SCHOLARS HELPERS ---
  const getWorkspaceForScholar = (scholarId: string) => {
    if (!workspaces) return null;
    return workspaces.find(ws => ws.members?.some((m: any) => m.userId === scholarId));
  };

  const scholarsNeedingAttention = myScholars.filter(scholar => 
    reports.some(r => r.scholarId === scholar.id && r.status === 'PENDING')
  );

  // --- REQUESTS WORKFLOW HANDLERS ---
  const handleApproveScholar = async (scholarId: string) => {
    try {
      await approveScholar(scholarId);
      addToast('Scholar approved and mapped to supervision.', 'success');
      fetchPendingApprovals();
      fetchMyScholars();
    } catch (e: any) {
      addToast(`Approval failed: ${e.message}`, 'error');
    }
  };

  const handleDeclineScholar = async (scholarId: string) => {
    try {
      await declineScholar(scholarId);
      addToast('Scholar supervision request declined.', 'info');
      fetchPendingApprovals();
    } catch (e: any) {
      addToast(`Declined action failed: ${e.message}`, 'error');
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

  const historyRequests = collaborationRequests?.filter((r: any) => r.status === 'REJECTED') || [];

  // --- REPORTS MONITORING HANDLERS ---
  const handleOpenReview = (report: any) => {
    setActiveReport(report);
    setFeedback(report.feedback || '');
    setIsDrawerOpen(true);
  };

  const handleReviewReport = async (status: 'APPROVED' | 'REJECTED' | 'NEEDS_INFO') => {
    if (!activeReport) return;
    try {
      await reviewReport(activeReport.id, status, feedback || undefined);
      addToast(`Report status updated to ${status}.`, 'success');
      setIsDrawerOpen(false);
      fetchReports();
    } catch (err: any) {
      addToast(`Error reviewing report: ${err.message}`, 'error');
    }
  };

  const getProgressStatus = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'On Track', color: 'bg-emerald-50 text-emerald-800 border-emerald-255' };
      case 'PENDING':
        return { label: 'Needs Review', color: 'bg-amber-50 text-amber-800 border-amber-255' };
      case 'NEEDS_INFO':
        return { label: 'Awaiting Update', color: 'bg-blue-50 text-blue-800 border-blue-255' };
      case 'REJECTED':
        return { label: 'Delayed', color: 'bg-rose-50 text-rose-800 border-rose-255' };
      default:
        return { label: 'Awaiting Update', color: 'bg-slate-50 text-slate-800 border-slate-255' };
    }
  };

  const filteredReports = reports?.filter((r) => {
    const q = reportsSearchQuery.toLowerCase();
    return (
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.scholar?.name && r.scholar.name.toLowerCase().includes(q)) ||
      (r.scholar?.department && r.scholar.department.toLowerCase().includes(q))
    );
  }) || [];

  // Request counter badge helper
  const pendingRequestsCount = (pendingApprovals?.length || 0) + (collaborationRequests?.filter((r: any) => r.status === 'PENDING').length || 0);

  return (
    <div className="space-y-6 text-left select-none pb-20">
      
      {/* 1. Header Banner */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand/10 text-brand rounded-xl border border-blue-100">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="text-xs font-medium capitalize text-brand">
              Supervision Panel
            </span>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mt-3 font-display">Academic Supervision Panel</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Institutional workspace for Research Supervisors to approve requests, supervise scholars, and review progress reports.
          </p>
        </div>
      </div>

      {/* 2. Switcher Tabs (Supervision Navigation Dashboard Switcher) */}
      <div className="flex border border-slate-200 bg-surface p-2 rounded-2xl gap-3 text-xs font-medium capitalize shrink-0 max-w-2xl shadow-3xs">
        <button
          onClick={() => { setActiveTab('scholars'); router.push('/my-scholars?tab=scholars'); }}
          className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'scholars'
              ? 'bg-brand text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>My Scholars</span>
          <span className={`px-1.5 py-0.5 rounded text-2xs ${activeTab === 'scholars' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {myScholars?.length || 0}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('requests'); router.push('/my-scholars?tab=requests'); }}
          className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-brand text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>Supervision Requests</span>
          {pendingRequestsCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-2xs animate-pulse ${activeTab === 'requests' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 font-semibold'}`}>
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('reports'); router.push('/my-scholars?tab=reports'); }}
          className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'reports'
              ? 'bg-brand text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Advisory Reports</span>
          {scholarsNeedingAttention.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-2xs ${activeTab === 'reports' ? 'bg-white/20 text-white' : 'bg-red-50 text-rose-700'}`}>
              {scholarsNeedingAttention.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. Render Panel Content based on Active Switcher Tab */}
      <div className="pt-2">

        {/* Tab A: MY SCHOLARS */}
        {activeTab === 'scholars' && (
          <div className="space-y-6">
            
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 font-sans">
              <div className="bg-surface border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <span className="text-3xl font-semibold text-slate-900">{myScholars.length}</span>
                <p className="text-xs font-medium text-slate-450 capitalize mt-1">Supervised Scholars</p>
              </div>
              <div className="bg-surface border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <span className="text-3xl font-semibold text-emerald-600">
                  {myScholars.filter(s => s.status === 'ACTIVE').length}
                </span>
                <p className="text-xs font-medium text-slate-450 capitalize mt-1">Active Candidates</p>
              </div>
              <div className="bg-surface border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <span className={`text-3xl font-semibold ${scholarsNeedingAttention.length > 0 ? 'text-amber-500' : 'text-slate-900'}`}>
                  {scholarsNeedingAttention.length}
                </span>
                <p className="text-xs font-medium text-slate-450 capitalize mt-1">Attention Required</p>
              </div>
            </div>

            {/* Scholars List Grid */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-medium text-slate-900 capitalize">
                  Candidate Directory
                </h3>
              </div>

              {myScholars.length === 0 ? (
                <div className="bg-surface border border-slate-200 rounded-3xl p-12 text-center shadow-3xs max-w-2xl mx-auto space-y-4 flex flex-col items-center">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center text-slate-400">
                    <UserCheck className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-900">No scholars under your supervision yet</h3>
                    <p className="text-xs text-slate-550 font-semibold max-w-sm">
                      Supervised scholar candidates will appear here once supervision requests are accepted.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className="px-5 py-2.5 bg-brand hover:bg-brand-strong text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 font-sans cursor-pointer"
                  >
                    Review Supervision Requests →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myScholars.map((scholar) => {
                    const ws = getWorkspaceForScholar(scholar.id);
                    const needsAttention = reports.some(r => r.scholarId === scholar.id && r.status === 'PENDING');
                    const scholarReports = reports.filter(r => r.scholarId === scholar.id);
                    const latestReport = scholarReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

                    return (
                      <div 
                        key={scholar.id} 
                        className={`bg-surface border rounded-3xl p-6 shadow-3xs flex flex-col justify-between gap-5 transition-all hover:shadow-2xs relative ${
                          needsAttention ? 'border-amber-300 ring-2 ring-amber-300/10' : 'border-slate-200'
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-150">
                                {scholar.image ? (
                                  <img src={scholar.image} alt={scholar.name || ''} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-5 h-5 text-slate-400 m-auto mt-2.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-slate-905 truncate leading-snug">
                                  {scholar.name}
                                </h3>
                                <p className="text-xs font-medium text-slate-450 truncate mt-0.5 capitalize">
                                  {scholar.department || 'General Research'}
                                </p>
                              </div>
                            </div>

                            {needsAttention && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-medium text-xs capitalize shrink-0">
                                Needs Review
                              </span>
                            )}
                          </div>

                          {scholar.bio && (
                            <p className="text-xs text-slate-500 font-semibold italic border-l-2 border-slate-150 pl-2.5 line-clamp-2">
                              "{scholar.bio}"
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-3 text-2xs">
                            <div className="bg-slate-50/50 border border-slate-150 p-2.5 rounded-xl flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-450 block uppercase tracking-wider">Publications</span>
                                <span className="font-semibold text-slate-900 text-xs block mt-0.5">{scholar.publications?.length || 0}</span>
                              </div>
                            </div>
                            <div className="bg-slate-50/50 border border-slate-150 p-2.5 rounded-xl flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-450 block uppercase tracking-wider">Reports</span>
                                <span className="font-semibold text-slate-900 text-xs block mt-0.5">{scholar.submittedReports?.length || 0}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-2xs bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-1">
                            <span className="font-medium text-slate-455 capitalize block text-xs">Last Academic Activity</span>
                            {latestReport ? (
                              <p className="font-semibold text-slate-705 leading-normal">
                                Submitted report: <span className="font-semibold text-slate-900">"{latestReport.title}"</span> on {new Date(latestReport.createdAt).toLocaleDateString()}
                              </p>
                            ) : (
                              <p className="font-medium text-slate-400 italic">No progress logs filed yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-slate-100/60 pt-4 mt-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/researchers/${scholar.id}`}
                              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-2xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer font-sans"
                            >
                              View Scholar <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleOpenReassignModal(scholar)}
                              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-2xs font-bold rounded-xl border border-amber-200/80 transition-colors flex items-center gap-1 cursor-pointer font-sans"
                              title="Reassign to another supervisor"
                            >
                              <UserPlus className="w-3.5 h-3.5 text-amber-600" /> Reassign
                            </button>
                          </div>
                          
                          {ws ? (
                            <Link
                              href={`/nexus?userId=${scholar.id}`}
                              className="px-4 py-2 bg-brand hover:bg-brand-strong text-white text-2xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Open Collaboration
                            </Link>
                          ) : (
                            <span className="text-2xs font-bold text-slate-400 italic">No Active Collaboration</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab B: SUPERVISION REQUESTS */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            
            {/* Request type sub-tabs */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-medium capitalize shrink-0 p-2 bg-slate-50 rounded-xl max-w-md border">
              <button
                onClick={() => setRequestSubTab('pending')}
                className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer ${
                  requestSubTab === 'pending'
                    ? 'bg-surface text-brand shadow-2xs font-semibold border border-slate-150'
                    : 'text-slate-400 hover:text-slate-755'
                }`}
              >
                Pending ({ (pendingApprovals?.length || 0) + (collaborationRequests?.filter((r: any) => r.status === 'PENDING').length || 0) })
              </button>
              <button
                onClick={() => setRequestSubTab('approved')}
                className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer ${
                  requestSubTab === 'approved'
                    ? 'bg-surface text-brand shadow-2xs font-semibold border border-slate-150'
                    : 'text-slate-400 hover:text-slate-755'
                }`}
              >
                Approved ({myScholars?.length || 0})
              </button>
              <button
                onClick={() => setRequestSubTab('history')}
                className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer ${
                  requestSubTab === 'history'
                    ? 'bg-surface text-brand shadow-2xs font-semibold border border-slate-150'
                    : 'text-slate-400 hover:text-slate-755'
                }`}
              >
                Declined ({historyRequests.length})
              </button>
            </div>

            {/* Sub-tab content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* SUBTAB 1: PENDING */}
              {requestSubTab === 'pending' && (
                <>
                  {pendingApprovals?.length === 0 && collaborationRequests?.filter((r: any) => r.status === 'PENDING').length === 0 ? (
                    <div className="col-span-full bg-surface border border-slate-200 rounded-3xl p-12 text-center shadow-3xs max-w-2xl mx-auto space-y-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-50 border border-slate-155 rounded-2xl flex items-center justify-center text-slate-400">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">No pending supervision requests</h3>
                        <p className="text-xs text-slate-500 font-semibold mt-1">
                          Scholar advisory request mappings or project synergy collaboration invites will appear here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Advisor Requests */}
                      {pendingApprovals?.map((req: any) => (
                        <div key={req.id} className="bg-surface border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between gap-5 text-left">
                          <div className="space-y-3.5">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex">
                                {req.image ? (
                                  <img src={req.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-5 h-5 text-slate-400 m-auto" />
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-medium capitalize text-brand">Supervision Request</h4>
                                <h3 className="text-sm font-semibold text-slate-955 mt-0.5">{req.name}</h3>
                              </div>
                            </div>
                            <div className="space-y-2 text-2xs">
                              <div>
                                <span className="font-semibold text-slate-400 uppercase tracking-wider block">Department</span>
                                <span className="font-bold text-slate-800 block mt-0.5">{req.department || 'SRMIST'}</span>
                              </div>
                              {req._proposalTitle && (
                                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2.5">
                                  <span className="font-medium text-brand capitalize block text-xs">Research Proposal</span>
                                  <p className="font-bold text-slate-900 mt-0.5">{req._proposalTitle}</p>
                                </div>
                              )}
                              {(req._researchDomain || req._researchTopic) && (
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  {req._researchDomain && (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md text-2xs">
                                      {req._researchDomain}
                                    </span>
                                  )}
                                  {req._researchTopic && (
                                    <span className="px-2 py-0.5 bg-gold/15 text-amber-800 border border-amber-300/30 font-bold rounded-md text-2xs">
                                      Topic: {req._researchTopic}
                                    </span>
                                  )}
                                </div>
                              )}
                              {(req._requestMessage || req.bio) && (
                                <div className="pt-1">
                                  <span className="font-medium text-slate-400 capitalize block text-xs">Scholar Note</span>
                                  <p className="font-medium text-slate-600 bg-slate-50 border border-slate-150 rounded-lg p-2.5 mt-1 leading-relaxed italic">
                                    "{req._requestMessage || req.bio}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 border-t border-slate-100/60 pt-4">
                            <button
                              onClick={() => handleApproveScholar(req._requestId || req.id)}
                              className="flex-1 py-2 bg-brand hover:bg-brand-strong text-white text-2xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleDeclineScholar(req._requestId || req.id)}
                              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-555 text-2xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Project requests */}
                      {collaborationRequests?.filter((r: any) => r.status === 'PENDING').map((req: any) => (
                        <div key={req.id} className="bg-surface border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between gap-5 text-left">
                          <div className="space-y-3.5">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex">
                                {req.scholar?.image ? (
                                  <img src={req.scholar.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-5 h-5 text-slate-400 m-auto" />
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-medium text-slate-905 capitalize text-brand">Project Synergy Request</h4>
                                <h3 className="text-sm font-semibold text-slate-955 mt-0.5">{req.scholar?.name}</h3>
                              </div>
                            </div>
                            <div className="space-y-1.5 text-2xs">
                              <div>
                                <span className="font-semibold text-slate-400 uppercase tracking-wider block">Target Opportunity</span>
                                <span className="font-bold text-slate-808 block mt-0.5">{req.opportunity?.title || req.thread?.title || 'Joint Collaboration'}</span>
                              </div>
                              {req.message && (
                                <div className="pt-1.5">
                                  <span className="font-semibold text-slate-400 uppercase tracking-wider block">Message Proposal</span>
                                  <p className="font-medium text-slate-650 bg-slate-50 border border-slate-150 rounded-lg p-2.5 mt-1 leading-relaxed italic">
                                    "{req.message}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 border-t border-slate-100/60 pt-4">
                            <button
                              onClick={() => handleAcceptCollab(req.id)}
                              className="flex-1 py-2 bg-brand hover:bg-brand-strong text-white text-2xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Accept Proposal
                            </button>
                            <button
                              onClick={() => handleDeclineCollab(req.id)}
                              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-555 text-2xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* SUBTAB 2: APPROVED */}
              {requestSubTab === 'approved' && (
                <>
                  {myScholars?.length === 0 ? (
                    <div className="col-span-full bg-surface border border-slate-200 rounded-3xl p-12 text-center shadow-3xs max-w-2xl mx-auto space-y-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-50 border border-slate-155 rounded-2xl flex items-center justify-center text-slate-400">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">No approved candidates</h3>
                        <p className="text-xs text-slate-555 font-semibold mt-1">
                          Supervised scholar connections mapped to your panel will appear here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    myScholars.map((scholar: any) => (
                      <div key={scholar.id} className="bg-surface border border-slate-200 rounded-3xl p-5 shadow-3xs flex items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex">
                            {scholar.image ? (
                              <img src={scholar.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-slate-400 m-auto" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-medium text-emerald-700 capitalize flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Active Supervision
                            </h4>
                            <h3 className="text-sm font-semibold text-slate-950 truncate mt-0.5">{scholar.name}</h3>
                            <p className="text-xs font-medium text-slate-400 capitalize truncate mt-0.5">
                              {scholar.department || 'SRMIST'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('scholars')}
                          className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-705 text-2xs font-bold rounded-lg shrink-0 cursor-pointer font-sans"
                        >
                          Manage
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* SUBTAB 3: DECLINED / HISTORY */}
              {requestSubTab === 'history' && (
                <>
                  {historyRequests.length === 0 ? (
                    <div className="col-span-full bg-surface border border-slate-200 rounded-3xl p-12 text-center shadow-3xs max-w-2xl mx-auto space-y-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-50 border border-slate-155 rounded-2xl flex items-center justify-center text-slate-400">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">No history logged</h3>
                        <p className="text-xs text-slate-500 font-semibold mt-1">
                          Supervisor decline actions and request histories will compile here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    historyRequests.map((req: any) => (
                      <div key={req.id} className="bg-surface border border-slate-200 rounded-3xl p-5 shadow-3xs flex items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex">
                            {req.scholar?.image ? (
                              <img src={req.scholar.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-slate-400 m-auto" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-medium text-rose-650 capitalize flex items-center gap-1.5">
                              <X className="w-3.5 h-3.5 stroke-[2.5]" /> Declined Request
                            </h4>
                            <h3 className="text-sm font-semibold text-slate-955 truncate mt-0.5">{req.scholar?.name}</h3>
                            <p className="text-xs font-medium text-slate-400 capitalize truncate mt-0.5">
                              Focus: {req.opportunity?.title || req.thread?.title || 'Joint Project'}
                            </p>
                          </div>
                        </div>
                        <span className="text-2xs font-bold text-slate-400 italic">Logged</span>
                      </div>
                    ))
                  )}
                </>
              )}

            </div>
          </div>
        )}

        {/* Tab C: ADVISORY REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            
            {/* Search filter */}
            {reports.length > 0 && (
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search reports by title or scholar..."
                  value={reportsSearchQuery}
                  onChange={(e) => setReportsSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface border border-slate-200 rounded-xl text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand text-xs font-semibold shadow-3xs transition-all"
                />
              </div>
            )}

            {/* Reports List */}
            <div className="space-y-4">
              {filteredReports.length === 0 ? (
                <div className="bg-surface border border-slate-200 rounded-3xl p-12 text-center shadow-3xs max-w-2xl mx-auto space-y-3 flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-155 rounded-2xl flex items-center justify-center text-slate-400">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">No advisory reports available</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Evaluated monthly submissions from candidate scholars will populate here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredReports.map((report) => {
                    const progress = getProgressStatus(report.status);
                    return (
                      <div 
                        key={report.id} 
                        className="bg-surface border border-slate-200 rounded-2xl p-5 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:shadow-2xs"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded font-medium text-xs capitalize border ${progress.color}`}>
                              {progress.label}
                            </span>
                            <span className="text-xs text-slate-400 font-medium capitalize">
                              Submitted: {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="font-semibold text-slate-905 text-sm">{report.title}</h3>
                          {report.description && (
                            <p className="text-xs text-slate-550 font-semibold leading-relaxed line-clamp-2">
                              {report.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-2xs font-bold text-slate-450">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex">
                                {report.scholar?.image ? (
                                  <img src={report.scholar.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-3 h-3 text-slate-400 m-auto" />
                                )}
                              </div>
                              <span className="text-slate-805">{report.scholar?.name}</span>
                              <span className="text-slate-350">•</span>
                              <span>{report.scholar?.department}</span>
                            </div>
                            
                            {report.evidenceUrl && (
                              <>
                                <span className="text-slate-350 hidden sm:inline">•</span>
                                <a
                                  href={report.evidenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand hover:underline flex items-center gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5" /> View Evidence
                                </a>
                              </>
                            )}
                          </div>

                          {report.feedback && (
                            <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-xs text-slate-650 mt-3 flex items-start gap-2 max-w-xl">
                              <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-slate-700 block mb-0.5">Advisory Feedback:</span>
                                <p className="font-medium leading-relaxed">{report.feedback}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {report.status === 'PENDING' && (
                          <button
                            onClick={() => handleOpenReview(report)}
                            className="px-4 py-2 bg-brand hover:bg-brand-strong text-white text-xs font-medium capitalize rounded-xl shadow-xs transition-all cursor-pointer shrink-0 self-end md:self-center font-sans"
                          >
                            Review Report
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Advisory review drawer (Report Review workflow) */}
      <AnimatePresence>
        {isDrawerOpen && activeReport && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 cursor-pointer"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:max-w-lg bg-surface border-l border-slate-200 z-50 p-6 shadow-2xl flex flex-col overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <span className="p-2 bg-brand/10 text-brand rounded-xl border border-blue-100">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">
                      Review Progress Report
                    </h3>
                    <p className="text-xs text-slate-404 font-medium capitalize mt-0.5">
                      Academic Intranet System
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 flex-1 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3 text-xs leading-relaxed">
                    <div>
                      <span className="font-medium text-slate-450 block capitalize text-xs">Scholar Candidate</span>
                      <span className="font-semibold text-slate-900 block mt-0.5">{activeReport.scholar?.name} ({activeReport.scholar?.department})</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-450 block capitalize text-xs">Submission Title</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{activeReport.title}</span>
                    </div>
                    {activeReport.description && (
                      <div>
                        <span className="font-medium text-slate-450 block capitalize text-xs">Progress Summary</span>
                        <p className="font-medium text-slate-650 block mt-1 bg-surface border border-slate-100 rounded-lg p-2.5 leading-relaxed">{activeReport.description}</p>
                      </div>
                    )}
                    {activeReport.evidenceUrl && (
                      <a
                        href={activeReport.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-surface border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-2xs font-bold transition-all flex items-center gap-1.5 w-max"
                      >
                        <FileText className="w-4 h-4 text-blue-600" /> Open Documents Evidence
                      </a>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-455 capitalize">
                      Supervisor Feedback / Comments
                    </label>
                    <textarea
                      rows={5}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide corrections, guidance or details on next steps..."
                      className="w-full px-3.5 py-2.5 text-xs leading-relaxed font-sans font-semibold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand transition-all focus:bg-surface"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-6 border-t border-slate-100 shrink-0">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReviewReport('NEEDS_INFO')}
                      className="flex-1 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-medium capitalize rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Needs Info
                    </button>
                    <button
                      onClick={() => handleReviewReport('REJECTED')}
                      className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-250 text-xs font-medium capitalize rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Reject / Delay
                    </button>
                  </div>
                  <button
                    onClick={() => handleReviewReport('APPROVED')}
                    className="w-full py-2.5 bg-success hover:bg-success-strong text-white text-xs font-medium capitalize rounded-xl shadow-xs transition-all cursor-pointer text-center font-sans"
                  >
                    Approve Progress
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4. REASSIGN SCHOLAR TO NEW SUPERVISOR MODAL */}
      <AnimatePresence>
        {reassigningScholar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReassigningScholar(null)}
              className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="fixed inset-0 m-auto max-w-md h-fit bg-surface rounded-3xl p-6 sm:p-7 shadow-2xl z-50 border border-slate-200 text-left space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 font-display">Reassign Scholar</h3>
                    <p className="text-2xs font-semibold text-slate-400">Transfer supervision to another faculty guide</p>
                  </div>
                </div>
                <button
                  onClick={() => setReassigningScholar(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scholar Card Summary */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-200 shrink-0">
                  {reassigningScholar.image ? (
                    <img src={reassigningScholar.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-400 m-auto mt-2.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">{reassigningScholar.name}</h4>
                  <p className="text-2xs font-semibold text-slate-500 truncate">{reassigningScholar.department || 'SRMIST Scholar'}</p>
                </div>
              </div>

              {/* Select Target Supervisor */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-900 capitalize block">
                  Select New Supervisor <span className="text-rose-500">*</span>
                </label>
                {loadingSupervisors ? (
                  <div className="p-3 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-center animate-pulse">
                    Loading department supervisors...
                  </div>
                ) : availableSupervisors.length === 0 ? (
                  <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 rounded-xl border border-rose-200 text-center">
                    No other approved supervisors found.
                  </div>
                ) : (
                  <select
                    value={selectedNewSupervisorId}
                    onChange={(e) => setSelectedNewSupervisorId(e.target.value)}
                    className="w-full p-3 bg-surface border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-brand transition-colors cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Choose Target Supervisor --</option>
                    {availableSupervisors.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name} ({sup.department || 'SRMIST'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Transfer Notes */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-900 capitalize block">
                  Transfer Reason / Advisory Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  placeholder="e.g. Domain realignment or department faculty guide request..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand focus:bg-surface transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setReassigningScholar(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReassign}
                  disabled={!selectedNewSupervisorId || submittingReassign}
                  className="flex-1 py-2.5 bg-brand hover:bg-brand-strong disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingReassign ? 'Transferring...' : 'Confirm Reassign'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function MyScholarsPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-xs font-bold text-slate-400">Loading Supervision Workspace...</div>}>
      <SupervisionPanelContent />
    </Suspense>
  );
}
