'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import {
  UserCheck,
  Clock,
  ArrowRight,
  Building,
  BookOpen,
  Calendar,
  Loader2,
  CheckCircle2,
  Inbox
} from 'lucide-react';
import { getProfileImageUrl } from '@/lib/avatar';

export function SupervisorRequestsWidget() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('/api/supervisor-requests');
        if (res.ok) {
          const data = await res.json();
          const pending = data.filter((r: any) => r.status === 'PENDING');
          setRequests(pending);
        }
      } catch (err) {
        console.error('Failed to load supervisor requests:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-surface border border-slate-200/80 rounded-3xl p-6 shadow-xs flex items-center justify-center gap-2 text-slate-500 min-h-[140px]">
        <Loader2 className="w-5 h-5 text-brand animate-spin" />
        <span className="text-xs font-medium capitalize">Loading Supervision Requests...</span>
      </div>
    );
  }

  const pendingCount = requests.length;

  return (
    <div className="bg-surface border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Supervision Requests</h2>
            <p className="text-xs text-slate-500">PhD Research Scholars awaiting assignment</p>
          </div>
        </div>

        {pendingCount > 0 ? (
          <span className="px-3 py-1 bg-gold/20 text-amber-700 border border-gold/40 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {pendingCount} Pending Request{pendingCount > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
            0 Pending
          </span>
        )}
      </div>

      {/* Content */}
      {pendingCount === 0 ? (
        <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-1.5">
          <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No pending supervision requests.</h3>
          <p className="text-xs text-slate-400">New supervisor requests from scholars will appear here.</p>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 capitalize">
                <th className="pb-3 pl-2">Scholar</th>
                <th className="pb-3">Research Area</th>
                <th className="pb-3 hidden md:table-cell">Department</th>
                <th className="pb-3">Requested</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {requests.map((req) => {
                const scholar = req.scholar;
                const scholarName = scholar?.name || scholar?.email || 'Research Scholar';
                const scholarArea = scholar?.scholarProfile?.researchArea || scholar?.bio || 'Interdisciplinary Research';
                const scholarDept = scholar?.departmentRef?.name || scholar?.department || 'Department Not Specified';
                const requestedDate = new Date(req.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                });

                return (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={getProfileImageUrl(scholar)}
                          alt={scholarName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{scholarName}</span>
                          <span className="text-2xs text-slate-400">{scholar?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 max-w-[200px] truncate text-slate-800 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-brand shrink-0" />
                        <span className="truncate">{scholarArea}</span>
                      </span>
                    </td>
                    <td className="py-3.5 hidden md:table-cell text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {scholarDept}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500 whitespace-nowrap">
                      {requestedDate}
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-gold/20 text-amber-700 border border-gold/30">
                        Pending
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/supervisor/requests/${req.id}`)}
                        className="px-3.5 py-1.5 bg-brand hover:bg-brand-strong text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
