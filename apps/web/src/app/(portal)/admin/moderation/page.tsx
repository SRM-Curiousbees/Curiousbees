'use client';

/**
 * Content Moderation Queue & Reports Center
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  MessageSquare,
  BookOpen,
  User,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ModerationStatus = 'ALL' | 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export default function ModerationPage() {
  const {
    fetchAdminModerationReports,
    resolveModerationReport,
    dismissModerationReport,
  } = useStore();

  const [activeTab, setActiveTab] = useState<ModerationStatus>('OPEN');
  const [targetTypeFilter, setTargetTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Modal resolution state
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [modalAction, setModalAction] = useState<'RESOLVE' | 'DISMISS' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminModerationReports({
        status: activeTab,
        targetType: targetTypeFilter,
        search,
        page,
        limit: 20,
      });
      setReports(res.items || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [activeTab, targetTypeFilter, page]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !modalAction || !actionNote.trim()) return;

    setSubmitting(true);
    try {
      if (modalAction === 'RESOLVE') {
        await resolveModerationReport(selectedReport.id, actionNote);
      } else {
        await dismissModerationReport(selectedReport.id, actionNote);
      }
      setSelectedReport(null);
      setModalAction(null);
      setActionNote('');
      await loadReports();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="pb-2">
        <p className="mb-1.5 text-sm font-medium text-ink-muted">Content Governance</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Reports</h1>
          <p className="mt-1.5 max-w-prose text-base text-ink-secondary">Reports filed for review. Every decision is recorded in the audit log.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 pb-1 overflow-x-auto">
        {[
          { id: 'OPEN', label: 'Open Queue' },
          { id: 'UNDER_REVIEW', label: 'Under Review' },
          { id: 'RESOLVED', label: 'Resolved' },
          { id: 'DISMISSED', label: 'Dismissed' },
          { id: 'ALL', label: 'All Reports' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setPage(1);
            }}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-brand text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports Table */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <p className="text-xs font-bold">Querying moderation queue...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
            <ShieldAlert className="w-10 h-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No reports in this queue</h3>
            <p className="text-xs text-slate-400">
              All policy reports for this status filter have been reviewed and addressed.
            </p>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-medium capitalize text-slate-500">
                  <th className="py-3.5 px-4">Target Type</th>
                  <th className="py-3.5 px-4">Reason / Violation</th>
                  <th className="py-3.5 px-4">Reporter</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Filed At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Target Type */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {rep.targetType === 'POST' || rep.targetType === 'THREAD' ? (
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                        ) : rep.targetType === 'PUBLICATION' ? (
                          <BookOpen className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <User className="w-4 h-4 text-purple-500" />
                        )}
                        <span className="font-bold text-slate-900">
                          {rep.targetType}
                        </span>
                      </div>
                      {rep.targetPreview && (
                        <p className="text-2xs text-slate-500 truncate max-w-[200px] mt-0.5">
                          {rep.targetPreview.title || rep.targetPreview.name || rep.targetId}
                        </p>
                      )}
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{rep.reason}</p>
                      {rep.description && (
                        <p className="text-2xs text-slate-500 line-clamp-1 mt-0.5">{rep.description}</p>
                      )}
                    </td>

                    {/* Reporter */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">
                        {rep.reporter?.name || 'Anonymous'}
                      </p>
                      <p className="text-2xs text-slate-400">{rep.reporter?.email || '—'}</p>
                    </td>

                    {/* Severity */}
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium capitalize border',
                          rep.severity === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : rep.severity === 'HIGH'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        )}
                      >
                        {rep.severity}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium capitalize border',
                          rep.status === 'OPEN'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : rep.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        )}
                      >
                        {rep.status}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-slate-400 text-2xs">
                      {new Date(rep.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {rep.status === 'OPEN' || rep.status === 'UNDER_REVIEW' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedReport(rep);
                              setModalAction('RESOLVE');
                              setActionNote('');
                            }}
                            className="px-2.5 py-1 rounded-lg text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReport(rep);
                              setModalAction('DISMISS');
                              setActionNote('');
                            }}
                            className="px-2.5 py-1 rounded-lg text-2xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <span className="text-2xs text-slate-400 font-semibold italic">
                          {rep.resolutionNote ? `Note: ${rep.resolutionNote}` : 'Archived'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedReport && modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-slate-200/80 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900">
              <AlertTriangle className="w-5 h-5 text-brand shrink-0" />
              <h3 className="text-base font-semibold">
                {modalAction === 'RESOLVE' ? 'Resolve Moderation Report' : 'Dismiss Moderation Report'}
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Target: <strong className="text-slate-900">{selectedReport.targetType} ({selectedReport.targetId})</strong>
              <br />
              Reason: <em>"{selectedReport.reason}"</em>
            </p>

            <form onSubmit={handleActionSubmit} className="space-y-3">
              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">
                  {modalAction === 'RESOLVE' ? 'Resolution Note & Action Taken' : 'Dismissal Justification'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record your administrative resolution note..."
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReport(null);
                    setModalAction(null);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !actionNote.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand hover:bg-brand-strong text-white transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
