'use client';

import React from 'react';
import { Target, Plus, Calendar, Tag, Activity, Edit3 } from 'lucide-react';
import { ResearchLifecycle } from './ResearchLifecycle';
import { cn } from '@/lib/utils';

interface CurrentResearchCardProps {
  researchProfile?: any;
  isOwnProfile?: boolean;
  onEditClick?: () => void;
}

export function CurrentResearchCard({ researchProfile, isOwnProfile, onEditClick }: CurrentResearchCardProps) {
  if (!researchProfile || !researchProfile.title) {
    return (
      <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
            <Target className="w-4 h-4 text-brand" />
            <span>Current Research</span>
          </div>
        </div>

        <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
          <p className="text-sm font-bold text-slate-600">No current research project has been added yet.</p>
          {isOwnProfile && onEditClick && (
            <button
              onClick={onEditClick}
              className="px-4 py-2 bg-brand hover:bg-brand-strong text-white font-semibold text-xs rounded-xl shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Configure Research Topic</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const { title, researchArea, status, currentStage, startDate, abstract } = researchProfile;
  const startYear = startDate ? new Date(startDate).getFullYear() : 2025;

  return (
    <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
          <Target className="w-4 h-4 text-brand" />
          <span>Current Research</span>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold border',
              status === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            )}
          >
            ● {status || 'ACTIVE'}
          </span>

          {isOwnProfile && onEditClick && (
            <button
              onClick={onEditClick}
              className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Topic
            </button>
          )}
        </div>
      </div>

      {/* Main Research Meta */}
      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-slate-900 leading-tight tracking-tight">{title}</h3>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 flex-wrap">
          <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
            <Tag className="w-3.5 h-3.5 text-brand" />
            Area: {researchArea || 'Computer Science'}
          </span>
          <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-brand" />
            Started: {startYear}
          </span>
        </div>

        {abstract && (
          <p className="text-sm font-medium text-slate-600 leading-relaxed pt-1 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            {abstract}
          </p>
        )}
      </div>

      {/* 6-Stage Progress Tracker */}
      <div className="pt-2 border-t border-slate-100">
        <ResearchLifecycle currentStage={currentStage} />
      </div>
    </div>
  );
}
