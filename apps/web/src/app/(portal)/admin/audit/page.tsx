'use client';

/**
 * Immutable Institutional Audit Trail & Compliance Center
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  History,
  Search,
  Filter,
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Eye,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminAuditPage() {
  const { fetchAdminAuditLogsPaginated } = useStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Selected Log Drawer
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminAuditLogsPaginated({
        search,
        action: actionFilter,
        category: categoryFilter,
        severity: severityFilter,
        page,
        limit: 25,
      });
      setLogs(res.items || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, categoryFilter, severityFilter, page]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="pb-2">
        <p className="mb-1.5 text-sm font-medium text-ink-muted">Security & Audit</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Audit log</h1>
          <p className="mt-1.5 max-w-prose text-base text-ink-secondary">A record of administrative and governance actions: who did what, to what, and when.</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            loadLogs();
          }}
          className="relative w-full md:w-80"
        >
          <input
            type="text"
            placeholder="Search details, actor, target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="ACCESS_CONTROL">Access Control</option>
            <option value="USER_MANAGEMENT">User Management</option>
            <option value="MODERATION">Moderation</option>
            <option value="INSTITUTION">Institution</option>
            <option value="SYSTEM">System</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
          >
            <option value="ALL">All Severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <p className="text-xs font-bold">Querying audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
            <History className="w-10 h-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No audit records found</h3>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-medium capitalize text-slate-500">
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{log.actorEmail || 'System'}</p>
                      <p className="text-2xs text-slate-400">{log.actorRole || 'System Service'}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold uppercase bg-slate-100 text-slate-700">
                        {log.category || 'GENERAL'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium capitalize border',
                          log.severity === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : log.severity === 'HIGH'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        )}
                      >
                        {log.severity || 'LOW'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-2xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title="View Full Audit Payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="py-3 px-4 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(page - 1) * 25 + 1} - {Math.min(page * 25, pagination.total)} of{' '}
              {pagination.total} audit logs
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-surface disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-slate-800">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-surface disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-slate-200/80 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">
                Audit Record Payload ({selectedLog.action})
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl font-mono space-y-1">
                <p><strong>ID:</strong> {selectedLog.id}</p>
                <p><strong>Action:</strong> {selectedLog.action}</p>
                <p><strong>Actor:</strong> {selectedLog.actorEmail} ({selectedLog.actorRole})</p>
                <p><strong>Target ID:</strong> {selectedLog.targetId}</p>
                <p><strong>Category:</strong> {selectedLog.category}</p>
                <p><strong>Severity:</strong> {selectedLog.severity}</p>
                <p><strong>Timestamp:</strong> {new Date(selectedLog.createdAt).toISOString()}</p>
              </div>

              {selectedLog.previousState && (
                <div>
                  <h4 className="font-bold text-slate-700">Previous State</h4>
                  <pre className="theme-static p-2.5 bg-slate-900 text-slate-200 rounded-xl text-2xs overflow-x-auto">
                    {JSON.stringify(selectedLog.previousState, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newState && (
                <div>
                  <h4 className="font-bold text-slate-700">New State</h4>
                  <pre className="theme-static p-2.5 bg-slate-900 text-slate-200 rounded-xl text-2xs overflow-x-auto">
                    {JSON.stringify(selectedLog.newState, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
