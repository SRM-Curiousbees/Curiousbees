'use client';

/**
 * Roles & Permissions Visual Capability Matrix
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Lock, Shield, Check, Minus, Info, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RolesPermissionsPage() {
  const { fetchAdminRolesMatrix } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminRolesMatrix().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [fetchAdminRolesMatrix]);

  if (loading || !data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
        <p className="text-xs font-bold">Loading institutional roles matrix...</p>
      </div>
    );
  }

  // Group capabilities by category
  const categories: Record<string, any[]> = {};
  data.capabilities.forEach((cap: any) => {
    if (!categories[cap.category]) categories[cap.category] = [];
    categories[cap.category].push(cap);
  });

  const renderCell = (val: boolean | string) => {
    if (val === true) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600">
          <Check className="w-4 h-4" />
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 text-slate-300">
          <Minus className="w-4 h-4" />
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-2xs font-bold bg-slate-100 text-slate-700">
        {val}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="pb-2">
        <p className="mb-1.5 text-sm font-medium text-ink-muted">Access Control</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Roles and permissions</h1>
          <p className="mt-1.5 max-w-prose text-base text-ink-secondary">What each role can do. The web app and the API both enforce these rules.</p>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-slate-200/80 rounded-2xl p-4 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs">
              RS
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Research Scholar</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Conducts research, authors publications, submits progress updates, and collaborates under an assigned faculty supervisor.
          </p>
        </div>

        <div className="bg-surface border border-slate-200/80 rounded-2xl p-4 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-semibold text-xs">
              RP
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Research Supervisor</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Directly authenticates, mentors scholars, accepts/rejects supervision applications, and oversees PhD projects. No admin approval required.
          </p>
        </div>

        <div className="bg-surface border border-slate-200/80 rounded-2xl p-4 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-semibold text-xs">
              IA
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Institute Admin</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Institutional governance authority. Governs users, enforces content moderation, configures faculties, and monitors immutable audit logs.
          </p>
        </div>
      </div>

      {/* Permissions Table */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-medium capitalize text-slate-500">
              <th className="py-3.5 px-4 w-1/3">Capability</th>
              <th className="py-3.5 px-4 text-center">Scholar</th>
              <th className="py-3.5 px-4 text-center">Supervisor</th>
              <th className="py-3.5 px-4 text-center">Institute Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {Object.entries(categories).map(([category, caps]) => (
              <React.Fragment key={category}>
                <tr className="bg-slate-50/50">
                  <td colSpan={4} className="py-2.5 px-4 text-xs font-medium capitalize text-brand">
                    {category}
                  </td>
                </tr>
                {caps.map((cap) => (
                  <tr key={cap.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{cap.capability}</p>
                      <p className="text-2xs text-slate-400 mt-0.5">{cap.description}</p>
                    </td>
                    <td className="py-3 px-4 text-center">{renderCell(cap.scholar)}</td>
                    <td className="py-3 px-4 text-center">{renderCell(cap.supervisor)}</td>
                    <td className="py-3 px-4 text-center">{renderCell(cap.admin)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
