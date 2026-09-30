'use client';

/**
 * Publications Governance & Institutional Catalog Oversight
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  BookOpen,
  Search,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  ExternalLink,
  BookMarked,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminPublicationsPage() {
  const { fetchAdminPublicationsList, hideAdminPublication, restoreAdminPublication } = useStore();
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hiddenFilter, setHiddenFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [actionModal, setActionModal] = useState<{
    type: 'HIDE' | 'RESTORE';
    pub: any;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPublications = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminPublicationsList({
        search,
        hidden: hiddenFilter === 'ALL' ? undefined : hiddenFilter,
        page,
        limit: 20,
      });
      setPublications(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublications();
  }, [hiddenFilter, page]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal || !reason.trim()) return;

    setSubmitting(true);
    try {
      if (actionModal.type === 'HIDE') {
        await hideAdminPublication(actionModal.pub.id, reason);
      } else {
        await restoreAdminPublication(actionModal.pub.id, reason);
      }
      setActionModal(null);
      setReason('');
      await loadPublications();
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
        <p className="mb-1.5 text-sm font-medium text-ink-muted">Research Governance</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Publications</h1>
          <p className="mt-1.5 max-w-prose text-base text-ink-secondary">Publications researchers have added. Hide entries that shouldn’t be listed, or restore them.</p>
      </div>

      {/* Filter bar */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            loadPublications();
          }}
          className="relative w-full md:w-80"
        >
          <input
            type="text"
            placeholder="Search title, DOI, publisher, authors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <select
          value={hiddenFilter}
          onChange={(e) => {
            setHiddenFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
        >
          <option value="ALL">All Visibility</option>
          <option value="false">Active Publications Only</option>
          <option value="true">Hidden / Moderated Only</option>
        </select>
      </div>

      {/* Publications Table */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <p className="text-xs font-bold">Querying publications catalog...</p>
          </div>
        ) : publications.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No publications found</h3>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-medium capitalize text-slate-500">
                  <th className="py-3 px-4">Publication Title & Details</th>
                  <th className="py-3 px-4">Author / User</th>
                  <th className="py-3 px-4">Year & Publisher</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Visibility</th>
                  <th className="py-3 px-4 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {publications.map((pub) => (
                  <tr key={pub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 max-w-sm">
                      <p className="font-bold text-slate-900 truncate">{pub.title}</p>
                      <p className="text-2xs text-slate-500 truncate mt-0.5">Authors: {pub.authors}</p>
                      {pub.doi && (
                        <p className="text-2xs text-blue-600 font-mono mt-0.5">
                          DOI: {pub.doi}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{pub.user?.name || 'Unknown'}</p>
                      <p className="text-2xs text-slate-400">{pub.user?.department || 'SRMIST'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{pub.year}</p>
                      <p className="text-2xs text-slate-400">{pub.publisher || 'Published'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-medium capitalize bg-slate-100 text-slate-700">
                        {pub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium capitalize border',
                          pub.hidden
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        )}
                      >
                        {pub.hidden ? 'Hidden' : 'Visible'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {pub.hidden ? (
                        <button
                          onClick={() => {
                            setActionModal({ type: 'RESTORE', pub });
                            setReason('');
                          }}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Restore Publication"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActionModal({ type: 'HIDE', pub });
                            setReason('');
                          }}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Hide for Policy Review"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Moderation Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-slate-200/80 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <h3 className="text-base font-semibold">
                {actionModal.type === 'HIDE' ? 'Hide Publication from Catalog' : 'Restore Publication'}
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Target Publication: <strong className="text-slate-900">"{actionModal.pub.title}"</strong>
            </p>

            <form onSubmit={handleAction} className="space-y-3">
              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">
                  Mandatory Audit Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record policy or governance justification..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand hover:bg-brand-strong text-white transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Confirm Moderation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
