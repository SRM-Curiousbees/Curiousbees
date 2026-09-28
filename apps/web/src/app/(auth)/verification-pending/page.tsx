'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { 
  LogOut, 
  Hourglass,
  CheckCircle2,
  Lock,
  Mail,
  Building2,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  XCircle,
  FileText,
  Copy,
  Check,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';
import SRMLogo from '@/components/SRMLogo';

export default function VerificationPendingPage() {
  const router = useRouter();
  const { 
    currentUser, 
    syncUserSession, 
    logout 
  } = useStore();

  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date>(new Date());

  // Polling periodically for approval status changes
  useEffect(() => {
    const checkStatus = async () => {
      setLastCheckedAt(new Date());
      const user = await syncUserSession({ force: true });
      if (user) {
        if (user.role === 'INSTITUTE_ADMIN') {
          router.replace('/admin/dashboard');
          return;
        }

        if ((user.role as string) === 'RESEARCH_SUPERVISOR' || (user.role as string) === 'SUPERVISOR') {
          router.replace('/feed');
          return;
        }

        if (user.role === 'RESEARCH_SCHOLAR' && user.status === 'ACTIVE' && user.approved && user.supervisorId) {
          router.replace('/feed');
          return;
        }
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, [syncUserSession, router]);

  const isSupervisorPending = currentUser?.role === 'RESEARCH_SUPERVISOR';
  const latestRequest = requests[0];
  const isRejected = currentUser?.status === 'REJECTED' || latestRequest?.status === 'REJECTED';
  const isNoSupervisorAssigned = !isSupervisorPending && !latestRequest && currentUser?.role === 'RESEARCH_SCHOLAR' && !currentUser?.supervisorId;

  // Fetch current scholar supervision request details
  useEffect(() => {
    if (currentUser?.role === 'RESEARCH_SCHOLAR') {
      const fetchRequest = async () => {
        setLoadingRequests(true);
        try {
          const { apiFetch } = await import('@/lib/api-client');
          const res = await apiFetch('/api/supervisor-requests');
          if (res.ok) {
            const data = await res.json();
            setRequests(data);
          }
        } catch (e) {
          console.error('Failed to load supervisor requests:', e);
        } finally {
          setLoadingRequests(false);
        }
      };
      fetchRequest();
    }
  }, [currentUser]);

  const handleCancelRequest = async () => {
    if (!latestRequest?.id) return;
    setCancelling(true);
    try {
      const { apiFetch } = await import('@/lib/api-client');
      const res = await apiFetch(`/api/supervisor-requests/${latestRequest.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await apiFetch('/api/users/onboarding/reset', { method: 'POST' }).catch(() => {});
        await syncUserSession({ force: true });
        setShowCancelModal(false);
        router.replace('/onboarding');
      }
    } catch (e) {
      console.error('Failed to cancel request:', e);
    } finally {
      setCancelling(false);
    }
  };

  const handleSelectAnotherSupervisor = async () => {
    try {
      const { apiFetch } = await import('@/lib/api-client');
      await apiFetch('/api/users/onboarding/reset', { method: 'POST' }).catch(() => {});
      await syncUserSession({ force: true });
      router.replace('/onboarding');
    } catch (e) {
      console.error('Failed to reset onboarding:', e);
      router.replace('/onboarding');
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-[#021024] via-[#071E42] to-[#04152D] min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-x-hidden font-sans w-full text-slate-900 selection:bg-yellow-400 selection:text-blue-950">
      
      {/* Decorative ambient background lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

      {/* Top Header Bar with SRM Logo */}
      <div className="fixed top-5 left-5 right-5 flex items-center justify-between z-30 pointer-events-none">
        <div className="pointer-events-auto">
          <SRMLogo size={42} variant="full" theme="light" />
        </div>
        <motion.button 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => { logout(); router.push('/login'); }}
          className="pointer-events-auto flex items-center space-x-2 px-4 py-2 border border-white/15 rounded-full text-xs font-bold text-white/80 hover:text-yellow-400 hover:bg-white/10 hover:border-yellow-400/40 transition-all duration-300 cursor-pointer backdrop-blur-md shadow-lg"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </motion.button>
      </div>

      {/* Main Glassmorphic Card Container */}
      <motion.main 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-xl relative z-10 my-8"
      >
        <div className="bg-white/95 backdrop-blur-2xl border border-white/30 rounded-3xl p-6 sm:p-9 shadow-[0_20px_70px_rgba(0,0,0,0.45)] flex flex-col items-center text-center space-y-6 relative overflow-hidden">
          
          {/* Top Decorative accent line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-amber-400 to-blue-500" />

          {/* Logo container with soft glow */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-yellow-400 rounded-2xl blur-sm opacity-30 group-hover:opacity-60 transition duration-500" />
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-blue-100 shadow-md bg-white flex items-center justify-center">
              <Logo showText={false} size={42} />
            </div>
          </div>

          {/* Status Badge & Header */}
          <div className="space-y-2.5 w-full">
            <div className="flex justify-center">
              <span className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border shadow-xs ${
                isRejected 
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : isNoSupervisorAssigned
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : isSupervisorPending
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-amber-50/90 border-amber-200 text-amber-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isRejected 
                    ? 'bg-rose-500' 
                    : isNoSupervisorAssigned
                    ? 'bg-blue-600'
                    : isSupervisorPending 
                    ? 'bg-blue-600 animate-pulse' 
                    : 'bg-amber-500 animate-ping'
                }`} />
                {isRejected 
                  ? 'Request Declined / Cancelled' 
                  : isNoSupervisorAssigned
                  ? 'Supervisor Selection Pending'
                  : isSupervisorPending 
                  ? 'Admin Review in Progress' 
                  : 'Pending Supervisor Approval'}
              </span>
            </div>

            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight leading-snug">
              {isRejected 
                ? 'Supervision Request Declined' 
                : isNoSupervisorAssigned
                ? 'Select a Research Supervisor'
                : isSupervisorPending 
                ? 'Awaiting Institutional Review' 
                : 'Waiting for Supervisor Approval'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-md mx-auto">
              {isRejected 
                ? 'Your supervision request was not approved or has been withdrawn. You can select another research faculty guide to initiate a fresh request.'
                : isNoSupervisorAssigned
                ? 'You have not designated a Research Supervisor yet. Please complete your supervisor selection to activate your research portal.'
                : isSupervisorPending 
                ? 'Your registration as a Research Supervisor is currently pending validation by University Administration.'
                : 'Your research profile has been dispatched to your designated supervisor. You will be automatically granted portal access once approved.'}
            </p>
          </div>

          {/* Supervisor Card (Scholar view with active request) */}
          {!isSupervisorPending && latestRequest?.supervisor && !isRejected && (
            <div className="w-full bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-left space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  <GraduationCap className="w-3.5 h-3.5 text-[#0C4DA2]" />
                  <span>Designated Supervisor</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(latestRequest.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0C4DA2] to-[#042654] text-white flex items-center justify-center font-black text-lg shadow-md shrink-0 border border-blue-300/30">
                    {latestRequest.supervisor.name?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                      {latestRequest.supervisor.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{latestRequest.supervisor.department || 'Department Faculty'}</span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <a 
                        href={`mailto:${latestRequest.supervisor.email}`}
                        className="text-[11px] font-bold text-[#0C4DA2] hover:underline truncate max-w-[200px]"
                      >
                        {latestRequest.supervisor.email}
                      </a>
                      <button
                        onClick={() => handleCopyEmail(latestRequest.supervisor.email)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                        title="Copy email address"
                      >
                        {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200/60 rounded-lg text-[10px] font-extrabold uppercase shrink-0">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  SRMIST Faculty
                </span>
              </div>

              {/* Action Buttons inside Supervisor Card */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowDetailsModal(true)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-3xs cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Details</span>
                </button>
                
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={cancelling}
                  className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl transition-all shadow-3xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Cancel Request</span>
                </button>
              </div>
            </div>
          )}

          {/* Workflow Progress Steps */}
          {!isRejected && !isNoSupervisorAssigned && (
            <div className="w-full bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 text-left space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Approval Lifecycle
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {/* Step 1 */}
                <div className="flex flex-col items-center p-2.5 bg-emerald-50 border border-emerald-200/60 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold mb-1 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-extrabold text-[11px] text-emerald-950">Submitted</span>
                  <span className="text-[9px] font-semibold text-emerald-700">Email Dispatched</span>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center p-2.5 bg-amber-50 border border-amber-200 rounded-xl relative shadow-xs">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold mb-1 animate-pulse">
                    <Hourglass className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-extrabold text-[11px] text-amber-950">Reviewing</span>
                  <span className="text-[9px] font-semibold text-amber-700">In Queue</span>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center p-2.5 bg-slate-100/70 border border-slate-200 rounded-xl opacity-60">
                  <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-xs font-bold mb-1">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-[11px] text-slate-700">Access</span>
                  <span className="text-[9px] font-semibold text-slate-500">Upon Approval</span>
                </div>
              </div>
            </div>
          )}

          {/* Rejection or No Supervisor Callout */}
          {(isRejected || isNoSupervisorAssigned) && (
            <div className="w-full space-y-3">
              <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-left space-y-1.5 text-xs">
                <span className="font-extrabold text-blue-950 block flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[#0C4DA2]" />
                  Designate Your Research Supervisor
                </span>
                <p className="text-slate-600 text-[11px] font-medium leading-relaxed">
                  Choose a verified faculty supervisor from your department to initiate supervision approval and unlock your full research workspace.
                </p>
              </div>

              <button
                onClick={handleSelectAnotherSupervisor}
                className="w-full py-3.5 bg-[#0C4DA2] hover:bg-[#042654] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg active:scale-98"
              >
                <span>Select a Research Supervisor</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Live Sync Status Pill */}
          {!isRejected && !isNoSupervisorAssigned && (
            <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 px-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-600">Auto-syncing every 5s</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">
                Updated {lastCheckedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}

        </div>

        {/* Footer info pill */}
        <div className="mt-4 text-center">
          <p className="text-[11px] font-bold text-white/50 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-400/80" />
            <span>SRMIST Institutional Security & Collaboration Standard</span>
          </p>
        </div>
      </motion.main>

      {/* SUBMISSION DETAILS MODAL */}
      <AnimatePresence>
        {showDetailsModal && latestRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailsModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 text-left space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0C4DA2] flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Request Summary</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {latestRequest.id?.slice(0, 12)}...</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Supervisor</span>
                    <span className="font-extrabold text-slate-900">{latestRequest.supervisor?.name}</span>
                    <span className="text-slate-500 block text-[11px]">{latestRequest.supervisor?.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Department</span>
                    <span className="font-bold text-slate-700">{latestRequest.supervisor?.department || 'Department Guide'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Request Status</span>
                  <span className="font-extrabold text-amber-700 capitalize">{latestRequest.status}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Submission Timestamp</span>
                  <span className="font-semibold text-slate-700">{new Date(latestRequest.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-5 py-2.5 bg-[#0C4DA2] hover:bg-[#042654] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM CANCEL MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-2xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900">Cancel Supervision Request?</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  This will withdraw your application to <strong>{latestRequest?.supervisor?.name || 'this supervisor'}</strong> and allow you to select another supervisor.
                </p>
              </div>
              <div className="flex gap-2.5 w-full pt-2">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Keep Request
                </button>
                <button
                  onClick={handleCancelRequest}
                  disabled={cancelling}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1"
                >
                  {cancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
