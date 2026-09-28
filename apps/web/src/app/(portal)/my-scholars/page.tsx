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
      <div className="border-b border-slate-200 dark:border-white/[0.08] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#0C4DA2]/10 dark:bg-blue-600/20 text-[#0C4DA2] dark:text-[#3B82F6] rounded-xl border border-blue-100 dark:border-blue-900/30">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-[#0C4DA2] dark:text-[#3B82F6]">
              Supervision Panel
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-[#F5F7FA] tracking-tight mt-3 font-display">Academic Supervision Panel</h1>
          <p className="text-xs text-slate-500 dark:text-[#A7B3C5] font-semibold mt-1">
            Institutional workspace for Research Supervisors to approve requests, supervise scholars, and review progress reports.
          </p>
        </div>
      </div>

      {/* 2. Switcher Tabs (Supervision Navigation Dashboard Switcher) */}
      <div className="flex border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#101D30] p-2 rounded-2xl gap-3 text-xs font-black uppercase tracking-widest shrink-0 max-w-2xl shadow-3xs">
        <button
          onClick={() => { setActiveTab('scholars'); router.push('/my-scholars?tab=scholars'); }}
          className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'scholars'
              ? 'bg-[#0C4DA2] dark:bg-[#2563EB] text-white shadow-sm'
              : 'text-slate-500 dark:text-[#A7B3C5] hover:text-slate-800 dark:hover:text-[#F5F7FA] hover:bg-slate-50 dark:hover:bg-[#172942]'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>My Scholars</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'scholars' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#0B1728] text-slate-500 dark:text-[#A7B3C5]'}`}>
            {myScholars?.length || 0}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('requests'); router.push('/my-scholars?tab=requests'); }}
          className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-[#0C4DA2] dark:bg-[#2563EB] text-white shadow-sm'
              : 'text-slate-500 dark:text-[#A7B3C5] hover:text-slate-800 dark:hover:text-[#F5F7FA] hover:bg-slate-50 dark:hover:bg-[#172942]'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>Supervision Requests</span>
          {pendingRequestsCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] animate-pulse ${activeTab === 'requests' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-black'}`}>
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('reports'); router.push('/my-scholars?tab=reports'); }}
          className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'reports'
              ? 'bg-[#0C4DA2] dark:bg-[#2563EB] text-white shadow-sm'
              : 'text-slate-500 dark:text-[#A7B3C5] hover:text-slate-800 dark:hover:text-[#F5F7FA] hover:bg-slate-50 dark:hover:bg-[#172942]'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Advisory Reports</span>
          {scholarsNeedingAttention.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'reports' ? 'bg-white/20 text-white' : 'bg-red-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'}`}>
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
              <div className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-2xs">
                <span className="text-3xl font-black text-slate-900 dark:text-[#F5F7FA]">{myScholars.length}</span>
                <p className="text-[10px] font-bold text-slate-450 dark:text-[#718096] uppercase tracking-wider mt-1">Supervised Scholars</p>
              </div>
              <div className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-2xs">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {myScholars.filter(s => s.status === 'ACTIVE').length}
                </span>
                <p className="text-[10px] font-bold text-slate-450 dark:text-[#718096] uppercase tracking-wider mt-1">Active Candidates</p>
              </div>
              <div className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-2xs">
                <span className={`text-3xl font-black ${scholarsNeedingAttention.length > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-900 dark:text-[#F5F7FA]'}`}>
                  {scholarsNeedingAttention.length}
                </span>
                <p className="text-[10px] font-bold text-slate-450 dark:text-[#718096] uppercase tracking-wider mt-1">Attention Required</p>
              </div>
            </div>

            {/* Scholars List Grid */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-white/[0.08] pb-2">
                <h3 className="text-xs font-black text-slate-900 dark:text-[#F5F7FA] uppercase tracking-widest">
                  Candidate Directory
                </h3>
              </div>

              {myScholars.length === 0 ? (
                <div className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-3xl p-12 text-center shadow-3xs max-w-2xl mx-auto space-y-4 flex flex-col items-center">
                  <div className="w-14 h-14 bg-slate-50 dark:bg-[#0B1728] border border-slate-150 dark:border-white/[0.08] rounded-2xl flex items-center justify-center text-slate-400 dark:text-[#718096]">
                    <UserCheck className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA]">No scholars under your supervision yet</h3>
                    <p className="text-xs text-slate-550 dark:text-[#A7B3C5] font-semibold max-w-sm">
                      Supervised scholar candidates will appear here once supervision requests are accepted.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className="px-5 py-2.5 bg-[#0C4DA2] dark:bg-[#2563EB] hover:bg-[#042654] dark:hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 font-sans cursor-pointer"
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
                        className={`bg-white dark:bg-[#132238] border rounded-3xl p-6 shadow-3xs flex flex-col justify-between gap-5 transition-all hover:shadow-2xs relative ${
                          needsAttention ? 'border-amber-300 dark:border-amber-500/50 ring-2 ring-amber-300/10' : 'border-slate-200 dark:border-white/[0.08]'
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-150 dark:bg-slate-800">
                                {scholar.image ? (
                                  <img src={scholar.image} alt={scholar.name || ''} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-5 h-5 text-slate-400 dark:text-slate-500 m-auto mt-2.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-extrabold text-slate-905 dark:text-[#F5F7FA] truncate leading-snug">
                                  {scholar.name}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-450 dark:text-[#A7B3C5] truncate mt-0.5 uppercase tracking-wider">
                                  {scholar.department || 'General Research'}
                                </p>
                              </div>
                            </div>

                            {needsAttention && (
                              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40 rounded font-black text-[9px] uppercase tracking-wider shrink-0">
                                Needs Review
                              </span>
                            )}
                          </div>

                          {scholar.bio && (
                            <p className="text-xs text-slate-500 dark:text-[#A7B3C5] font-semibold italic border-l-2 border-slate-150 dark:border-slate-700 pl-2.5 line-clamp-2">
                              "{scholar.bio}"
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-3 text-[10px]">
                            <div className="bg-slate-50/50 dark:bg-[#0B1728] border border-slate-150 dark:border-white/[0.06] p-2.5 rounded-xl flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-slate-400 dark:text-[#718096] shrink-0" />
                              <div>
                                <span className="font-bold text-slate-450 dark:text-[#718096] block uppercase tracking-wider">Publications</span>
                                <span className="font-black text-slate-900 dark:text-[#F5F7FA] text-xs block mt-0.5">{scholar.publications?.length || 0}</span>
                              </div>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-[#0B1728] border border-slate-150 dark:border-white/[0.06] p-2.5 rounded-xl flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400 dark:text-[#718096] shrink-0" />
                              <div>
                                <span className="font-bold text-slate-450 dark:text-[#718096] block uppercase tracking-wider">Reports</span>
                                <span className="font-black text-slate-900 dark:text-[#F5F7FA] text-xs block mt-0.5">{scholar.submittedReports?.length || 0}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] bg-slate-50 dark:bg-[#0B1728] p-3 rounded-xl border border-slate-150 dark:border-white/[0.06] space-y-1">
                            <span className="font-extrabold text-slate-455 dark:text-[#718096] uppercase tracking-wider block text-[9px]">Last Academic Activity</span>
                            {latestReport ? (
                              <p className="font-semibold text-slate-705 dark:text-[#E2E8F0] leading-normal">
                                Submitted report: <span className="font-extrabold text-slate-900 dark:text-[#F5F7FA]">"{latestReport.title}"</span> on {new Date(latestReport.createdAt).toLocaleDateString()}
                              </p>
                            ) : (
                              <p className="font-medium text-slate-400 dark:text-[#718096] italic">No progress logs filed yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-slate-100/60 dark:border-white/[0.06] pt-4 mt-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/researchers/${scholar.id}`}
                              className="px-3 py-2 bg-slate-50 dark:bg-[#0B1728] hover:bg-slate-100 dark:hover:bg-[#172942] text-slate-700 dark:text-[#F5F7FA] text-[11px] font-bold rounded-xl border border-slate-200 dark:border-white/[0.08] transition-colors flex items-center gap-1 cursor-pointer font-sans"
                            >
                              View Scholar <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleOpenReassignModal(scholar)}
                              className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-amber-900 dark:text-amber-300 text-[11px] font-bold rounded-xl border border-amber-200/80 dark:border-amber-700/40 transition-colors flex items-center gap-1 cursor-pointer font-sans"
                              title="Reassign to another supervisor"
                            >
                              <UserPlus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Reassign
                            </button>
                          </div>
                          
                          {ws ? (
                            <Link
                              href={`/nexus?userId=${scholar.id}`}
                              className="px-4 py-2 bg-[#0C4DA2] dark:bg-[#2563EB] hover:bg-[#042654] dark:hover:bg-blue-600 text-white text-[11px] font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Open Collaboration
                            </Link>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 dark:text-[#718096] italic">No Active Collaboration</span>
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
            <div className="flex border-b border-slate-200 dark:border-white/[0.08] gap-4 text-[10px] font-black uppercase tracking-widest shrink-0 p-2 bg-slate-50 dark:bg-[#0B1728] rounded-xl max-w-md border">
              <button
                onClick={() => setRequestSubTab('pending')}
                className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer ${
                  requestSubTab === 'pending'
                    ? 'bg-white dark:bg-[#101D30] text-[#0C4DA2] dark:text-[#3B82F6] shadow-2xs font-extrabold border border-slate-150 dark:border-white/[0.08]'
                    : 'text-slate-400 dark:text-[#718096] hover:text-slate-755 dark:hover:text-[#F5F7FA]'
                }`}
              >
                Pending ({ (pendingApprovals?.length || 0) + (collaborationRequests?.filter((r: any) => r.status === 'PENDING').length || 0) })
              </button>
              <button
                onClick={() => setRequestSubTab('approved')}
                className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer ${
                  requestSubTab === 'approved'
                    ? 'bg-white dark:bg-[#101D30] text-[#0C4DA2] dark:text-[#3B82F6] shadow-2xs font-extrabold border border-slate-150 dark:border-white/[0.08]'
                    : 'text-slate-400 dark:text-[#718096] hover:text-slate-755 dark:hover:text-[#F5F7FA]'
                }`}
              >
                Approved ({myScholars?.length || 0})
              </button>
              <button
                onClick={() => setRequestSubTab('history')}
                className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer ${
                  requestSubTab === 'history'
                    ? 'bg-white dark:bg-[#101D30] text-[#0C4DA2] dark:text-[#3B82F6] shadow-2xs font-extrabold border border-slate-150 dark:border-white/[0.08]'
                    : 'text-slate-400 dark:text-[#718096] hover:text-slate-755 dark:hover:text-[#F5F7FA]'
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
                    <div className="col-span-full bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-3xl p-12 text-center shadow-3xs max-w-2xl mx-auto space-y-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-[#0B1728] border border-slate-155 dark:border-white/[0.08] rounded-2xl flex items-center justify-center text-slate-400 dark:text-[#718096]">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA]">No pending supervision requests</h3>
                        <p className="text-xs text-slate-500 dark:text-[#A7B3C5] font-semibold mt-1">
                          Scholar advisory request mappings or project synergy collaboration invites will appear here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Advisor Requests */}
                      {pendingApprovals?.map((req: any) => (
                        <div key={req.id} className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 shadow-3xs flex flex-col justify-between gap-5 text-left">
                          <div className="space-y-3.5">
                            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex">
                                {req.image ? (
                                  <img src={req.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-5 h-5 text-slate-400 dark:text-slate-500 m-auto" />
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-900 dark:text-[#3B82F6] uppercase tracking-widest text-[#0C4DA2]">Supervision Request</h4>
                                <h3 className="text-sm font-extrabold text-slate-955 dark:text-[#F5F7FA] mt-0.5">{req.name}</h3>
                              </div>
                            </div>
                            <div className="space-y-2 text-[11px]">
                              <div>
                                <span className="font-extrabold text-slate-400 dark:text-[#718096] uppercase tracking-wider block">Department</span>
                                <span className="font-bold text-slate-800 dark:text-[#E2E8F0] block mt-0.5">{req.department || 'SRMIST'}</span>
                              </div>
                              {req._proposalTitle && (
                                <div className="bg-blue-50/70 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl p-2.5">
                                  <span className="font-extrabold text-[#0C4DA2] dark:text-blue-400 uppercase tracking-wider block text-[10px]">Research Proposal</span>
                                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">{req._proposalTitle}</p>
                                </div>
                              )}
                              {(req._researchDomain || req._researchTopic) && (
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  {req._researchDomain && (
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-md text-[10px]">
                                      {req._researchDomain}
                                    </span>
                                  )}
                                  {req._researchTopic && (
                                    <span className="px-2 py-0.5 bg-[#FFC828]/15 dark:bg-[#FFC828]/10 text-amber-800 dark:text-amber-300 border border-amber-300/30 font-bold rounded-md text-[10px]">
                                      Topic: {req._researchTopic}
                                    </span>
                                  )}
                                </div>
                              )}
                              {(req._requestMessage || req.bio) && (
                                <div className="pt-1">
                                  <span className="font-extrabold text-slate-400 dark:text-[#718096] uppercase tracking-wider block text-[10px]">Scholar Note</span>
                                  <p className="font-medium text-slate-600 dark:text-[#A7B3C5] bg-slate-50 dark:bg-[#0B1728] border border-slate-150 dark:border-white/[0.06] rounded-lg p-2.5 mt-1 leading-relaxed italic">
                                    "{req._requestMessage || req.bio}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 border-t border-slate-100/60 dark:border-white/[0.06] pt-4">
                            <button
                              onClick={() => handleApproveScholar(req._requestId || req.id)}
                              className="flex-1 py-2 bg-[#0C4DA2] dark:bg-[#2563EB] hover:bg-[#042654] dark:hover:bg-blue-600 text-white text-[11px] font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleDeclineScholar(req._requestId || req.id)}
                              className="px-4 py-2 border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-[#172942] text-slate-555 dark:text-[#A7B3C5] text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Project requests */}
                      {collaborationRequests?.filter((r: any) => r.status === 'PENDING').map((req: any) => (
                        <div key={req.id} className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 shadow-3xs flex flex-col justify-between gap-5 text-left">
                          <div className="space-y-3.5">
                            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex">
                                {req.scholar?.image ? (
                                  <img src={req.scholar.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-5 h-5 text-slate-400 dark:text-slate-500 m-auto" />
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-905 dark:text-[#3B82F6] uppercase tracking-widest text-[#0C4DA2]">Project Synergy Request</h4>
                                <h3 className="text-sm font-extrabold text-slate-955 dark:text-[#F5F7FA] mt-0.5">{req.scholar?.name}</h3>
                              </div>
                            </div>
                            <div className="space-y-1.5 text-[11px]">
                              <div>
                                <span className="font-extrabold text-slate-400 dark:text-[#718096] uppercase tracking-wider block">Target Opportunity</span>
                                <span className="font-bold text-slate-808 dark:text-[#E2E8F0] block mt-0.5">{req.opportunity?.title || req.thread?.title || 'Joint Collaboration'}</span>
                              </div>
                              {req.message && (
                                <div className="pt-1.5">
                                  <span className="font-extrabold text-slate-400 dark:text-[#718096] uppercase tracking-wider block">Message Proposal</span>
                                  <p className="font-medium text-slate-650 dark:text-[#A7B3C5] bg-slate-50 dark:bg-[#0B1728] border border-slate-150 dark:border-white/[0.06] rounded-lg p-2.5 mt-1 leading-relaxed italic">
                                    "{req.message}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 border-t border-slate-100/60 dark:border-white/[0.06] pt-4">
                            <button
                              onClick={() => handleAcceptCollab(req.id)}
                              className="flex-1 py-2 bg-[#0C4DA2] dark:bg-[#2563EB] hover:bg-[#042654] dark:hover:bg-blue-600 text-white text-[11px] font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Accept Proposal
                            </button>
                            <button
                              onClick={() => handleDeclineCollab(req.id)}
                              className="px-4 py-2 border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-[#172942] text-slate-555 dark:text-[#A7B3C5] text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
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
                    <div className="col-span-full bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-3xl p-12 text-center shadow-3xs max-w-2xl mx-auto space-y-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-[#0B1728] border border-slate-155 dark:border-white/[0.08] rounded-2xl flex items-center justify-center text-slate-400 dark:text-[#718096]">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA]">No approved candidates</h3>
                        <p className="text-xs text-slate-555 dark:text-[#A7B3C5] font-semibold mt-1">
                          Supervised scholar connections mapped to your panel will appear here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    myScholars.map((scholar: any) => (
                      <div key={scholar.id} className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-3xl p-5 shadow-3xs flex items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex">
                            {scholar.image ? (
                              <img src={scholar.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-slate-400 dark:text-slate-500 m-auto" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Active Supervision
                            </h4>
                            <h3 className="text-sm font-extrabold text-slate-950 dark:text-[#F5F7FA] truncate mt-0.5">{scholar.name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-[#718096] uppercase tracking-wider truncate mt-0.5">
                              {scholar.department || 'SRMIST'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('scholars')}
                          className="px-3.5 py-1.5 bg-slate-50 dark:bg-[#0B1728] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-[#172942] text-slate-705 dark:text-[#F5F7FA] text-[10px] font-bold rounded-lg shrink-0 cursor-pointer font-sans"
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
                    <div className="col-span-full bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-3xl p-12 text-center shadow-3xs max-w-2xl mx-auto space-y-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-[#0B1728] border border-slate-155 dark:border-white/[0.08] rounded-2xl flex items-center justify-center text-slate-400 dark:text-[#718096]">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA]">No history logged</h3>
                        <p className="text-xs text-slate-500 dark:text-[#A7B3C5] font-semibold mt-1">
                          Supervisor decline actions and request histories will compile here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    historyRequests.map((req: any) => (
                      <div key={req.id} className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-3xl p-5 shadow-3xs flex items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex">
                            {req.scholar?.image ? (
                              <img src={req.scholar.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-slate-400 dark:text-slate-500 m-auto" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[10px] font-black text-rose-650 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                              <X className="w-3.5 h-3.5 stroke-[2.5]" /> Declined Request
                            </h4>
                            <h3 className="text-sm font-extrabold text-slate-955 dark:text-[#F5F7FA] truncate mt-0.5">{req.scholar?.name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-[#718096] uppercase tracking-wider truncate mt-0.5">
                              Focus: {req.opportunity?.title || req.thread?.title || 'Joint Project'}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-[#718096] italic">Logged</span>
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
                <Search className="w-4 h-4 text-slate-400 dark:text-[#718096] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search reports by title or scholar..."
                  value={reportsSearchQuery}
                  onChange={(e) => setReportsSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0B1728] border border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-850 dark:text-[#F5F7FA] placeholder:text-slate-400 dark:placeholder:text-[#718096] focus:outline-none focus:ring-2 focus:ring-[#0C4DA2] dark:focus:ring-[#2563EB] text-xs font-semibold shadow-3xs transition-all"
                />
              </div>
            )}

            {/* Reports List */}
            <div className="space-y-4">
              {filteredReports.length === 0 ? (
                <div className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-3xl p-12 text-center shadow-3xs max-w-2xl mx-auto space-y-3 flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-[#0B1728] border border-slate-155 dark:border-white/[0.08] rounded-2xl flex items-center justify-center text-slate-400 dark:text-[#718096]">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA]">No advisory reports available</h3>
                    <p className="text-xs text-slate-500 dark:text-[#A7B3C5] font-semibold mt-1">
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
                        className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:shadow-2xs"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider border ${progress.color}`}>
                              {progress.label}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-[#718096] font-bold uppercase tracking-wider">
                              Submitted: {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-slate-905 dark:text-[#F5F7FA] text-sm">{report.title}</h3>
                          {report.description && (
                            <p className="text-xs text-slate-550 dark:text-[#A7B3C5] font-semibold leading-relaxed line-clamp-2">
                              {report.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] font-bold text-slate-450 dark:text-[#718096]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex">
                                {report.scholar?.image ? (
                                  <img src={report.scholar.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-3 h-3 text-slate-400 dark:text-slate-500 m-auto" />
                                )}
                              </div>
                              <span className="text-slate-805 dark:text-[#F5F7FA]">{report.scholar?.name}</span>
                              <span className="text-slate-350 dark:text-[#718096]">•</span>
                              <span>{report.scholar?.department}</span>
                            </div>
                            
                            {report.evidenceUrl && (
                              <>
                                <span className="text-slate-350 dark:text-[#718096] hidden sm:inline">•</span>
                                <a
                                  href={report.evidenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#0C4DA2] dark:text-[#3B82F6] hover:underline flex items-center gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5" /> View Evidence
                                </a>
                              </>
                            )}
                          </div>

                          {report.feedback && (
                            <div className="bg-slate-50 dark:bg-[#0B1728] border border-slate-150 dark:border-white/[0.08] p-3 rounded-xl text-xs text-slate-650 dark:text-[#A7B3C5] mt-3 flex items-start gap-2 max-w-xl">
                              <MessageSquare className="w-4 h-4 text-slate-400 dark:text-[#718096] shrink-0 mt-0.5" />
                              <div>
                                <span className="font-extrabold text-slate-700 dark:text-[#F5F7FA] block mb-0.5">Advisory Feedback:</span>
                                <p className="font-medium leading-relaxed">{report.feedback}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {report.status === 'PENDING' && (
                          <button
                            onClick={() => handleOpenReview(report)}
                            className="px-4 py-2 bg-[#0C4DA2] dark:bg-[#2563EB] hover:bg-[#042654] dark:hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer shrink-0 self-end md:self-center font-sans"
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
              className="fixed inset-y-0 right-0 w-full sm:max-w-lg bg-white dark:bg-[#101D30] border-l border-slate-200 dark:border-white/[0.10] z-50 p-6 shadow-2xl flex flex-col overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-4 mb-6 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <span className="p-2 bg-[#0C4DA2]/10 dark:bg-blue-600/20 text-[#0C4DA2] dark:text-[#3B82F6] rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-[#F5F7FA] text-sm">
                      Review Progress Report
                    </h3>
                    <p className="text-[9px] text-slate-404 dark:text-[#718096] font-black uppercase tracking-wider mt-0.5">
                      Academic Intranet System
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-[#F5F7FA] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 flex-1 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-[#0B1728] border border-slate-150 dark:border-white/[0.08] p-4 rounded-xl space-y-3 text-xs leading-relaxed">
                    <div>
                      <span className="font-extrabold text-slate-450 dark:text-[#718096] block uppercase tracking-wider text-[9px]">Scholar Candidate</span>
                      <span className="font-extrabold text-slate-900 dark:text-[#F5F7FA] block mt-0.5">{activeReport.scholar?.name} ({activeReport.scholar?.department})</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-450 dark:text-[#718096] block uppercase tracking-wider text-[9px]">Submission Title</span>
                      <span className="font-bold text-slate-900 dark:text-[#F5F7FA] block mt-0.5">{activeReport.title}</span>
                    </div>
                    {activeReport.description && (
                      <div>
                        <span className="font-extrabold text-slate-450 dark:text-[#718096] block uppercase tracking-wider text-[9px]">Progress Summary</span>
                        <p className="font-medium text-slate-650 dark:text-[#A7B3C5] block mt-1 bg-white dark:bg-[#132238] border border-slate-100 dark:border-white/[0.06] rounded-lg p-2.5 leading-relaxed">{activeReport.description}</p>
                      </div>
                    )}
                    {activeReport.evidenceUrl && (
                      <a
                        href={activeReport.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-white dark:bg-[#132238] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-[#172942] text-slate-700 dark:text-[#F5F7FA] rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 w-max"
                      >
                        <FileText className="w-4 h-4 text-blue-600 dark:text-[#3B82F6]" /> Open Documents Evidence
                      </a>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-455 dark:text-[#718096] uppercase tracking-widest">
                      Supervisor Feedback / Comments
                    </label>
                    <textarea
                      rows={5}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide corrections, guidance or details on next steps..."
                      className="w-full px-3.5 py-2.5 text-xs leading-relaxed font-sans font-semibold rounded-xl bg-slate-50 dark:bg-[#0B1728] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-[#F5F7FA] placeholder:text-slate-400 dark:placeholder:text-[#718096] outline-none focus:border-[#0C4DA2] dark:focus:border-[#2563EB] transition-all focus:bg-white dark:focus:bg-[#101D30]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-6 border-t border-slate-100 dark:border-white/[0.08] shrink-0">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReviewReport('NEEDS_INFO')}
                      className="flex-1 py-2.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Needs Info
                    </button>
                    <button
                      onClick={() => handleReviewReport('REJECTED')}
                      className="flex-1 py-2.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-250 dark:border-rose-700/40 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Reject / Delay
                    </button>
                  </div>
                  <button
                    onClick={() => handleReviewReport('APPROVED')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer text-center font-sans"
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
              className="fixed inset-0 m-auto max-w-md h-fit bg-white dark:bg-[#101D30] rounded-3xl p-6 sm:p-7 shadow-2xl z-50 border border-slate-200 dark:border-white/[0.10] text-left space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700/40 flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA] font-display">Reassign Scholar</h3>
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-[#718096]">Transfer supervision to another faculty guide</p>
                  </div>
                </div>
                <button
                  onClick={() => setReassigningScholar(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#F5F7FA] rounded-full hover:bg-slate-100 dark:hover:bg-[#132238] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scholar Card Summary */}
              <div className="bg-slate-50 dark:bg-[#0B1728] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 shrink-0">
                  {reassigningScholar.image ? (
                    <img src={reassigningScholar.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-400 dark:text-slate-500 m-auto mt-2.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-[#F5F7FA] truncate">{reassigningScholar.name}</h4>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-[#A7B3C5] truncate">{reassigningScholar.department || 'SRMIST Scholar'}</p>
                </div>
              </div>

              {/* Select Target Supervisor */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-900 dark:text-[#F5F7FA] uppercase tracking-wider block">
                  Select New Supervisor <span className="text-rose-500">*</span>
                </label>
                {loadingSupervisors ? (
                  <div className="p-3 text-xs font-bold text-slate-400 dark:text-[#718096] bg-slate-50 dark:bg-[#0B1728] rounded-xl border border-slate-200 dark:border-white/[0.08] text-center animate-pulse">
                    Loading department supervisors...
                  </div>
                ) : availableSupervisors.length === 0 ? (
                  <div className="p-3 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/40 text-center">
                    No other approved supervisors found.
                  </div>
                ) : (
                  <select
                    value={selectedNewSupervisorId}
                    onChange={(e) => setSelectedNewSupervisorId(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-[#0B1728] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs font-bold text-slate-900 dark:text-[#F5F7FA] outline-none focus:border-[#0C4DA2] dark:focus:border-[#2563EB] transition-colors cursor-pointer shadow-2xs"
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
                <label className="text-xs font-black text-slate-900 dark:text-[#F5F7FA] uppercase tracking-wider block">
                  Transfer Reason / Advisory Notes <span className="text-slate-400 dark:text-[#718096] font-normal">(Optional)</span>
                </label>
                <textarea
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  placeholder="e.g. Domain realignment or department faculty guide request..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 dark:bg-[#0B1728] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-900 dark:text-[#F5F7FA] placeholder:text-slate-400 dark:placeholder:text-[#718096] outline-none focus:border-[#0C4DA2] dark:focus:border-[#2563EB] focus:bg-white dark:focus:bg-[#101D30] transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
                <button
                  onClick={() => setReassigningScholar(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-[#0B1728] hover:bg-slate-200 dark:hover:bg-[#172942] text-slate-700 dark:text-[#A7B3C5] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReassign}
                  disabled={!selectedNewSupervisorId || submittingReassign}
                  className="flex-1 py-2.5 bg-[#0C4DA2] dark:bg-[#2563EB] hover:bg-[#042654] dark:hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
