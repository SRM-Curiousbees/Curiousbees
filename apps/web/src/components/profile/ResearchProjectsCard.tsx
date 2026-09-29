'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FolderGit2, ExternalLink, Calendar, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectItem {
  id: string;
  title: string;
  researchArea?: string;
  status: string;
  role: string;
  updatedAt?: string | Date;
}

interface ResearchProjectsCardProps {
  projects?: ProjectItem[];
  isOwnProfile?: boolean;
}

export function ResearchProjectsCard({ projects = [], isOwnProfile }: ResearchProjectsCardProps) {
  const router = useRouter();

  if (!projects || projects.length === 0) {
    return (
      <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
            <FolderGit2 className="w-4 h-4 text-brand" />
            <span>Research Projects</span>
          </div>
        </div>

        <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-xs font-bold text-slate-500">No research projects yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
          <FolderGit2 className="w-4 h-4 text-brand" />
          <span>Research Projects ({projects.length})</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {projects.map((project) => (
          <div
            key={project.id}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 transition-all space-y-2 flex flex-col justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-brand capitalize">
                  {project.role || 'Contributor'}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md text-2xs font-bold border',
                    project.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  )}
                >
                  {project.status || 'ACTIVE'}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">{project.title}</h4>
              <p className="text-xs text-slate-500 font-medium">Area: {project.researchArea || 'Computer Science'}</p>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-2xs text-slate-400 font-medium">
                {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Active workspace'}
              </span>

              <button
                onClick={() => router.push(`/workspace/${project.id}`)}
                className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Project</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
