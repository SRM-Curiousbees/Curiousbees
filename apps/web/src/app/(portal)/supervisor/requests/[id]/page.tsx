'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { apiFetch } from '@/lib/api-client';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Building,
  GraduationCap,
  BookOpen,
  Mail,
  Hash,
  MessageSquare,
  AlertCircle,
  Loader2,
  UserCheck,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfileImageUrl } from '@/lib/avatar';

export default function SupervisorRequestReviewPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params?.id as string;
  const { currentUser, syncUserSession } = useStore();

  const [request, setRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & Action States
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<'approved' | 'rejected' | null>(null);

  useEffect(() => {
    if (!requestId) return;

    const fetchRequestDetails = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await apiFetch(`/api/supervisor-requests/${requestId}`);
        if (res.ok) {
          const data = await res.json();
          setRequest(data);
        } else if (res.status === 401) {
          router.push(`/login?redirectTo=${encodeURIComponent(`/supervisor/requests/${requestId}`)}`);
        } else if (res.status === 403) {
          setErrorMessage('You are not authorized to review this supervision request.');
        } else if (res.status === 404) {
          setErrorMessage('This supervision request was not found.');
        } else {
          setErrorMessage('Unable to load supervision request details.');
        }
      } catch (err) {
        setErrorMessage('Network error while connecting to server.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequestDetails();
  }, [requestId, router]);

  const handleApprove = async () => {
    setIsProcessingAction(true);
    try {
      const res = await apiFetch(`/api/supervisor-requests/${requestId}/approve`, {
        method: 'PUT',
      });
      if (res.ok) {
        const updated = await res.json();
        setRequest(updated);
        setActionSuccess('approved');
        setShowAcceptModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.message || 'Failed to approve supervision request.');
      }
    } catch {
      setErrorMessage('Network error during approval.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleReject = async () => {
    setIsProcessingAction(true);
    try {
      const res = await apiFetch(`/api/supervisor-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRequest(updated);
        setActionSuccess('rejected');
        setShowRejectModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.message || 'Failed to reject supervision request.');
      }
    } catch {
      setErrorMessage('Network error during rejection.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <p className="text-xs font-medium text-slate-500 capitalize">Loading Request Details...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-surface border border-red-200 rounded-3xl shadow-sm text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 leading-relaxed">{errorMessage}</p>
        <button
          onClick={() => router.push('/supervisor')}
          className="px-6 py-2.5 bg-brand text-white font-bold text-xs rounded-xl shadow-sm hover:bg-brand-strong transition-colors cursor-pointer"
        >
          Return to Supervisor Panel
        </button>
      </div>
    );
  }

  const scholar = request?.scholar;
  const isPending = request?.status === 'PENDING' && !actionSuccess;
  const isApproved = request?.status === 'APPROVED' || actionSuccess === 'approved';
  const isRejected = request?.status === 'REJECTED' || actionSuccess === 'rejected';

  const scholarName = scholar?.name || scholar?.email || 'Research Scholar';
  const scholarDept = scholar?.department || 'Department of Computer Applications';
  const scholarFaculty = scholar?.faculty || 'SRMIST Kattankulathur';
  const scholarArea = scholar?.scholarProfile?.researchArea || scholar?.bio || 'Artificial Intelligence & Machine Learning';
  const scholarId = scholar?.employeeId || scholar?.scholarProfile?.registrationNo || scholar?.id?.substring(0, 8);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/supervisor')}
          className="flex items-center gap-2 text-xs font-medium capitalize text-slate-500 hover:text-brand transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Supervision Requests
        </button>

        {isPending && (
          <span className="px-3 py-1 bg-gold/20 text-amber-700 border border-gold/40 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        )}
        {isApproved && (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Request Accepted
          </span>
        )}
        {isRejected && (
          <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-full text-xs font-bold flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-slate-500" /> Request Rejected
          </span>
        )}
      </div>

      {/* Main Review Card */}
      <div className="bg-surface border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Banner */}
        <div className="bg-gradient-to-r from-brand to-brand-950 p-8 text-white relative theme-static">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white/20 overflow-hidden bg-slate-100 shadow-md shrink-0">
                <img
                  src={getProfileImageUrl(scholar)}
                  alt={scholarName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-semibold text-white">{scholarName}</h1>
                  <span className="theme-static px-2.5 py-0.5 rounded-full text-2xs font-bold bg-gold text-brand-950">
                    Ph.D. Scholar
                  </span>
                </div>
                <p className="text-xs text-white/80 flex items-center gap-1.5 font-medium">
                  <Building className="w-3.5 h-3.5 text-gold" /> {scholarDept}
                </p>
                <p className="text-xs text-white/70 flex items-center gap-1.5 font-medium">
                  <GraduationCap className="w-3.5 h-3.5 text-gold" /> {scholarFaculty}
                </p>
              </div>
            </div>

            {/* Quick Metadata */}
            <div className="flex md:flex-col items-start md:items-end gap-3 text-xs text-white/80">
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs border border-white/15">
                <Mail className="w-3.5 h-3.5 text-gold" />
                <span>{scholar?.email}</span>
              </div>
              {scholarId && (
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs border border-white/15">
                  <Hash className="w-3.5 h-3.5 text-gold" />
                  <span>ID: {scholarId}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-8 space-y-8">
          {/* Research Area & Profile */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium capitalize text-brand">
              Research Area & Profile
            </h3>
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <BookOpen className="w-4 h-4 text-brand" />
                <span>{scholarArea}</span>
              </div>
              {scholar?.bio && (
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  {scholar.bio}
                </p>
              )}
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium capitalize text-brand">
              Request Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <span className="text-2xs font-bold text-slate-400 uppercase">Requested On</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {new Date(request?.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <span className="text-2xs font-bold text-slate-400 uppercase">Current Status</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5 capitalize">
                  {request?.status?.toLowerCase() || 'Pending'}
                </p>
              </div>
            </div>

            {request?.message && (
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-1 mt-3">
                <span className="text-2xs font-bold text-brand uppercase flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Message from Scholar
                </span>
                <p className="text-xs text-slate-700 italic leading-relaxed">
                  "{request.message}"
                </p>
              </div>
            )}

            {request?.rejectionReason && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-1 mt-3">
                <span className="text-2xs font-bold text-red-800 uppercase flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Rejection Reason
                </span>
                <p className="text-xs text-red-700 leading-relaxed">
                  {request.rejectionReason}
                </p>
              </div>
            )}
          </div>

          {/* Action Area */}
          {isPending && (
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isProcessingAction}
                className="w-full sm:w-auto px-6 py-3 border border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Reject Request
              </button>
              <button
                onClick={() => setShowAcceptModal(true)}
                disabled={isProcessingAction}
                className="w-full sm:w-auto px-6 py-3 bg-brand hover:bg-brand-strong text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-gold" />
                <span>Accept Request</span>
              </button>
            </div>
          )}

          {isApproved && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Scholar Accepted</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                You have accepted <strong>{scholarName}</strong> as your research scholar. You can now collaborate in workspaces and oversee their research milestones.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => router.push(`/researchers/${scholar?.id}`)}
                  className="px-4 py-2 bg-success hover:bg-success-strong text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Open Scholar Profile
                </button>
                <button
                  onClick={() => router.push('/supervisor')}
                  className="px-4 py-2 bg-surface border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Go to Supervisor Dashboard
                </button>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <XCircle className="w-5 h-5 text-slate-500" />
                <span>Request Rejected</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This supervision request has been declined. The scholar has been notified.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Accept Confirmation Modal */}
      <AnimatePresence>
        {showAcceptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAcceptModal(false)}
              className="fixed inset-0 bg-black/65 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface rounded-3xl shadow-2xl p-6 space-y-5 z-10 border border-slate-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Accept Supervision Request?</h3>
                    <p className="text-xs text-slate-500">CuriousBees Research Assignment</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to accept <strong>{scholarName}</strong> as your research scholar. After acceptance, you will be assigned as their primary research supervisor.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  disabled={isProcessingAction}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-strong text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessingAction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Accepting...</span>
                    </>
                  ) : (
                    <span>Accept Request</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Confirmation Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRejectModal(false)}
              className="fixed inset-0 bg-black/65 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface rounded-3xl shadow-2xl p-6 space-y-5 z-10 border border-slate-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Reject Supervision Request</h3>
                    <p className="text-xs text-slate-500">Optional Reason Feedback</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Optional Rejection Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Current research capacity full, outside domain focus, etc."
                  rows={3}
                  className="w-full bg-surface border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={isProcessingAction}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 rounded-xl bg-danger hover:bg-danger-strong text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessingAction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <span>Reject Request</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
