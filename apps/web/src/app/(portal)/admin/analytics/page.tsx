'use client';

/**
 * Institutional Governance Analytics & Metric Telemetry
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { BarChart3, TrendingUp, Users, BookOpen, MessageSquare, ShieldAlert, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminAnalyticsPage() {
  const { fetchAdminAnalytics } = useStore();
  const [range, setRange] = useState('30D');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async (r = range) => {
    setLoading(true);
    try {
      const res = await fetchAdminAnalytics(r);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(range);
  }, [range]);

  if (loading || !data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
        <p className="text-xs font-bold">Aggregating institutional analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-purple-50 text-purple-700 border border-purple-200">
              Institutional Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Institutional Analytics
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Real platform growth metrics, doctoral adoption rates, and departmental research output.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          {['7D', '30D', '6M', '1Y'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                range === r
                  ? 'bg-surface text-brand shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs">
          <span className="text-2xs font-bold text-slate-400 block uppercase">Total Users</span>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{data.summary.totalUsers}</p>
          <p className="text-2xs text-emerald-600 font-bold mt-1">
            {data.distribution.scholars} Scholars • {data.distribution.supervisors} Supervisors
          </p>
        </div>

        <div className="bg-surface border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs">
          <span className="text-2xs font-bold text-slate-400 block uppercase">Publications Catalog</span>
          <p className="text-2xl font-semibold text-emerald-600 mt-1">{data.summary.totalPublications}</p>
          <p className="text-2xs text-slate-400 mt-1">Verified scholarly works</p>
        </div>

        <div className="bg-surface border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs">
          <span className="text-2xs font-bold text-slate-400 block uppercase">Research Workspaces</span>
          <p className="text-2xl font-semibold text-cyan-600 mt-1">{data.summary.totalWorkspaces}</p>
          <p className="text-2xs text-slate-400 mt-1">Active lab projects</p>
        </div>

        <div className="bg-surface border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs">
          <span className="text-2xs font-bold text-slate-400 block uppercase">Feed Discussions</span>
          <p className="text-2xl font-semibold text-blue-600 mt-1">{data.summary.totalPosts}</p>
          <p className="text-2xs text-slate-400 mt-1">Academic interactions</p>
        </div>
      </div>

      {/* Activity Timeline Bar Chart Visual */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">
          User Registrations & Post Volume ({range})
        </h3>

        <div className="h-48 flex items-end gap-1.5 pt-6 pb-2 px-2 overflow-x-auto">
          {data.timeline?.map((item: any) => {
            const maxVal = Math.max(...data.timeline.map((t: any) => t.users + t.posts), 5);
            const total = item.users + item.posts;
            const heightPercent = Math.max((total / maxVal) * 100, 6);

            return (
              <div key={item.date} className="flex-1 min-w-[14px] flex flex-col items-center gap-1 group">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full bg-gradient-to-t from-brand to-blue-400 rounded-t-md transition-all group-hover:brightness-125"
                  title={`${item.date}: ${item.users} users, ${item.posts} posts`}
                />
                <span className="text-2xs text-slate-400 rotate-45 origin-left truncate hidden sm:block">
                  {item.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Departmental Distribution & Engagement
        </h3>
        <div className="relative overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-medium capitalize text-slate-500">
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Supervisors</th>
                <th className="py-3 px-4">Scholars</th>
                <th className="py-3 px-4">Total Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.departmentActivity?.map((dept: any) => (
                <tr key={dept.code} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-800">{dept.name}</td>
                  <td className="py-3 px-4 font-mono text-2xs text-slate-500">{dept.code}</td>
                  <td className="py-3 px-4 text-teal-600 font-bold">{dept.supervisorCount}</td>
                  <td className="py-3 px-4 text-blue-600 font-bold">{dept.scholarCount}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{dept.userCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
