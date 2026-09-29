'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import {
  GitMerge, Search, Loader2, Check, X, Clock, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';
import AvatarRing from '@/components/AvatarRing';

function StatusBadge({ status }: { status: string }) {
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Check className="w-2.5 h-2.5" /> Approved
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold uppercase bg-red-50 text-red-700 border border-red-200">
        <X className="w-2.5 h-2.5" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold uppercase bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-2.5 h-2.5" /> Pending
    </span>
  );
}

export default function AdminScholarRequestsPage() {
  const router = useRouter();
  const { currentUser } = useStore();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const isAdmin = currentUser?.role === 'INSTITUTE_ADMIN';

  useEffect(() => {
    if (currentUser && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [currentUser, isAdmin, router]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { apiFetch } = await import('@/lib/api-client');
      const res = await apiFetch('/api/supervisor-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.error('Failed to load scholar requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [currentUser, isAdmin]);

  if (!isAdmin) return null;

  const filtered = requests.filter((req) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (req.scholar?.name || '').toLowerCase().includes(term) ||
      (req.scholar?.email || '').toLowerCase().includes(term) ||
      (req.supervisor?.name || '').toLowerCase().includes(term) ||
      (req.supervisor?.email || '').toLowerCase().includes(term);
    const matchStatus = !statusFilter || req.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6 text-left select-none">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 gap-4">
        <div>
          <span className="text-xs font-medium text-primary capitalize flex items-center gap-1.5">
            <GitMerge className="w-4 h-4 text-primary" />
            <span>Scholar-Supervisor Mapping Audit</span>
          </span>
          <h1 className="cb-page-title mt-2 font-display">Scholar Supervision Requests</h1>
          <p className="cb-page-subtitle">
            View all supervision mapping requests across the institution — pending, approved, and rejected.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 text-xs font-medium capitalize flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="cb-card p-4 bg-surface/95 backdrop-blur-md flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium capitalize">Pending</p>
            <p className="text-lg font-semibold text-slate-800">{pendingCount}</p>
          </div>
        </div>
        <div className="cb-card p-4 bg-surface/95 backdrop-blur-md flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium capitalize">Approved</p>
            <p className="text-lg font-semibold text-slate-800">{approvedCount}</p>
          </div>
        </div>
        <div className="cb-card p-4 bg-surface/95 backdrop-blur-md flex items-center gap-3">
          <div className="p-2.5 bg-red-50 rounded-lg text-red-600 border border-red-100">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium capitalize">Rejected</p>
            <p className="text-lg font-semibold text-slate-800">{rejectedCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="cb-card p-4 bg-surface/95 backdrop-blur-md grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search scholar or supervisor name/email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="cb-input pl-9"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3 h-[42px] text-xs font-semibold rounded-lg bg-surface border border-slate-200 focus:outline-none transition-all cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      {loading && requests.length === 0 ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="cb-card p-12 text-center bg-surface/95 backdrop-blur-md">
          <GitMerge className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No Requests Found</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm || statusFilter
              ? 'Try adjusting your search or filter.'
              : 'No scholar-supervisor mapping requests have been submitted yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block cb-card overflow-hidden bg-surface/95 backdrop-blur-md border border-slate-100 shadow-sm">
            <div className="relative overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="cb-table-header text-xs capitalize text-slate-450 border-b border-slate-100 bg-slate-50/50">
                    <th className="p-4 pl-6">Scholar</th>
                    <th className="p-4">Supervisor</th>
                    <th className="p-4">Scholar Dept.</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {filtered.map((req) => (
                    <tr key={req.id} className="cb-table-row text-xs hover:bg-slate-50/20 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center space-x-3">
                          <AvatarRing
                            src={req.scholar?.image || undefined}
                            name={req.scholar?.name || undefined}
                            role="RESEARCH_SCHOLAR"
                            size="sm"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 leading-snug">{req.scholar?.name || 'N/A'}</h4>
                            <p className="text-2xs text-slate-400 font-semibold">{req.scholar?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <AvatarRing
                            src={req.supervisor?.image || undefined}
                            name={req.supervisor?.name || undefined}
                            role="RESEARCH_SUPERVISOR"
                            size="sm"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 leading-snug">{req.supervisor?.name || 'N/A'}</h4>
                            <p className="text-2xs text-slate-400 font-semibold">{req.supervisor?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-650 font-bold">{req.scholar?.department || '—'}</td>
                      <td className="p-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="p-4 pr-6 text-slate-500 font-semibold text-2xs">
                        {new Date(req.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filtered.map((req) => (
              <div key={req.id} className="cb-card p-5 bg-surface/95 backdrop-blur-md border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium capitalize">Scholar → Supervisor</span>
                  <StatusBadge status={req.status} />
                </div>
                <div className="flex items-center gap-3">
                  <AvatarRing src={req.scholar?.image} name={req.scholar?.name} role="RESEARCH_SCHOLAR" size="sm" />
                  <div>
                    <p className="font-bold text-xs text-slate-900">{req.scholar?.name || 'N/A'}</p>
                    <p className="text-2xs text-slate-400">{req.scholar?.email}</p>
                  </div>
                </div>
                <div className="text-2xs text-slate-400 font-semibold flex items-center gap-1">
                  <span>→</span>
                  <span className="font-bold text-slate-700">{req.supervisor?.name || 'N/A'}</span>
                  <span className="text-slate-400">({req.supervisor?.email})</span>
                </div>
                <p className="text-2xs text-slate-400 font-semibold">
                  {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
