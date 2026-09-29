'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Users, GraduationCap, ArrowRight, ExternalLink, BookOpen, UserPlus } from 'lucide-react';
import { getProfileImageUrl } from '@/lib/avatar';

interface SupervisionCardProps {
  user: any;
  isOwnProfile?: boolean;
}

export function SupervisionCard({ user, isOwnProfile }: SupervisionCardProps) {
  const router = useRouter();
  const isAdmin = user?.role === 'INSTITUTE_ADMIN';
  const isSupervisor = user?.role === 'RESEARCH_SUPERVISOR';

  if (isAdmin) {
    return (
      <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
            <GraduationCap className="w-4 h-4 text-brand" />
            <span>Institutional Governance</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-brand/10 text-brand">
            Admin
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <p className="text-xs font-bold text-slate-800">
            Institutional Research Administration
          </p>
          <p className="text-2xs text-slate-500 leading-relaxed font-medium">
            Overseeing university research programs, doctoral supervisory capacities, and faculty departments.
          </p>
          {isOwnProfile && (
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-3.5 py-1.5 bg-brand hover:bg-brand-strong text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                Admin Dashboard
              </button>
              <button
                onClick={() => router.push('/admin/users')}
                className="px-3.5 py-1.5 bg-surface border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                User Management
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isSupervisor) {
    const scholars: any[] = user?.scholars || [];

    return (
      <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
            <Users className="w-4 h-4 text-brand" />
            <span>Supervision — Active Scholars ({scholars.length})</span>
          </div>
        </div>

        {scholars.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-500">Currently supervising 0 scholars.</p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {scholars.map((scholar) => (
              <div
                key={scholar.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden bg-surface shrink-0">
                    <img src={getProfileImageUrl(scholar)} alt={scholar.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-semibold text-slate-900 truncate">{scholar.name}</h5>
                    <p className="text-2xs text-slate-500 font-medium truncate">
                      {scholar.researchProfile?.title || scholar.department || 'Research Scholar'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => router.push(`/researchers/${scholar.id}`)}
                    className="px-3 py-1.5 bg-surface border border-slate-200 hover:bg-slate-100 text-brand text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    View Scholar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Scholar role looking at supervisor
  const supervisor = user?.supervisor;

  return (
    <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
          <GraduationCap className="w-4 h-4 text-brand" />
          <span>Research Supervisor</span>
        </div>
      </div>

      {!supervisor ? (
        <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
          <p className="text-xs font-bold text-slate-500">No supervisor assigned yet.</p>
          {isOwnProfile && (
            <button
              onClick={() => router.push('/researchers?role=RESEARCH_SUPERVISOR')}
              className="px-4 py-2 bg-brand hover:bg-brand-strong text-white font-semibold text-xs rounded-xl shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Find a Supervisor</span>
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full border-2 border-surface shadow-xs overflow-hidden bg-surface shrink-0">
              <img src={getProfileImageUrl(supervisor)} alt={supervisor.name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">{supervisor.name}</h4>
              <p className="text-xs font-bold text-brand">
                {supervisor.supervisorProfile?.designation || 'Research Supervisor'} · {supervisor.department || 'Computer Science'}
              </p>
              <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">
                ● ACTIVE SUPERVISION
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/researchers/${supervisor.id}`)}
              className="px-3.5 py-2 bg-surface border border-slate-200 hover:bg-slate-100 text-brand text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              View Supervisor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
