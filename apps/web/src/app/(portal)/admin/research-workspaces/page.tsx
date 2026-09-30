'use client';

/**
 * Institutional Research Workspaces & Projects Oversight
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { FolderGit2, Search, Users, FileText, CheckSquare, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminWorkspacesPage() {
  const { fetchAdminWorkspaces } = useStore();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminWorkspaces({ search, page, limit: 20 });
      setWorkspaces(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, [page]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="pb-2">
        <p className="mb-1.5 text-sm font-medium text-ink-muted">Research Oversight</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Workspaces</h1>
          <p className="mt-1.5 max-w-prose text-base text-ink-secondary">Workspaces across the institution, with their members and activity counts. Files and updates stay private to members.</p>
      </div>

      {/* Filter bar */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            loadWorkspaces();
          }}
          className="relative w-full md:w-80"
        >
          <input
            type="text"
            placeholder="Search workspaces or projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <p className="text-xs font-bold">Querying workspaces...</p>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="col-span-3 py-16 bg-surface border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
            <FolderGit2 className="w-10 h-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No research workspaces found</h3>
          </div>
        ) : (
          workspaces.map((ws) => (
            <div
              key={ws.id}
              className="bg-surface border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{ws.name}</h3>
                    <p className="text-2xs text-slate-400">ID: {ws.id.slice(0, 10)}...</p>
                  </div>
                </div>
                {ws.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                    {ws.description}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center justify-between text-2xs">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Users className="w-3.5 h-3.5" /> Members
                  </span>
                  <span className="font-bold text-slate-800">
                    {ws.members?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-2xs">
                  <span className="flex items-center gap-1 text-slate-400">
                    <CheckSquare className="w-3.5 h-3.5" /> Milestones
                  </span>
                  <span className="font-bold text-slate-800">
                    {ws._count?.milestones || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-2xs">
                  <span className="flex items-center gap-1 text-slate-400">
                    <FileText className="w-3.5 h-3.5" /> Documents
                  </span>
                  <span className="font-bold text-slate-800">
                    {ws._count?.files || 0}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
