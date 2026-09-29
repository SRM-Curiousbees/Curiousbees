'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const STAGES = [
  { id: 'PROPOSAL', label: 'Proposal' },
  { id: 'LITERATURE_REVIEW', label: 'Literature Review' },
  { id: 'METHODOLOGY', label: 'Methodology' },
  { id: 'IMPLEMENTATION', label: 'Implementation' },
  { id: 'EVALUATION', label: 'Evaluation' },
  { id: 'THESIS_PUBLICATION', label: 'Thesis / Publication' },
];

interface ResearchLifecycleProps {
  currentStage?: string;
}

export function ResearchLifecycle({ currentStage = 'METHODOLOGY' }: ResearchLifecycleProps) {
  const currentIdx = Math.max(
    0,
    STAGES.findIndex((s) => s.id === currentStage)
  );

  return (
    <div className="w-full pt-2 pb-1">
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-3 px-1">
        <span>Research Progress Stage</span>
        <span className="text-brand font-semibold uppercase">
          Stage {currentIdx + 1} of 6: {STAGES[currentIdx]?.label}
        </span>
      </div>

      {/* Horizontal Rail for Desktop & Tablet */}
      <div className="hidden md:grid grid-cols-6 gap-2 relative">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div key={stage.id} className="flex flex-col items-center text-center space-y-2 relative">
              {/* Connector Bar */}
              {idx < STAGES.length - 1 && (
                <div
                  className={cn(
                    'absolute top-3.5 left-[50%] w-full h-1 -z-0 transition-colors',
                    idx < currentIdx ? 'bg-emerald-500' : 'bg-slate-200'
                  )}
                />
              )}

              {/* Indicator Node */}
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center relative z-10 transition-all text-xs font-semibold shadow-2xs',
                  isCompleted
                    ? 'bg-success text-white'
                    : isCurrent
                    ? 'bg-brand text-white ring-4 ring-blue-100 scale-110'
                    : 'bg-slate-100 text-slate-400 border border-slate-300'
                )}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>

              {/* Stage Title */}
              <span
                className={cn(
                  'text-xs font-bold leading-tight max-w-[90px]',
                  isCurrent ? 'text-brand' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stacked Vertical Rail for Mobile */}
      <div className="md:hidden space-y-2 pt-1">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div
              key={stage.id}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-xl border text-xs font-bold transition-all',
                isCurrent
                  ? 'bg-blue-50/70 border-blue-200 text-brand'
                  : isCompleted
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                  isCompleted
                    ? 'bg-success text-white'
                    : isCurrent
                    ? 'bg-brand text-white'
                    : 'bg-slate-200 text-slate-500'
                )}
              >
                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span className="flex-1">{stage.label}</span>
              {isCurrent && (
                <span className="px-2 py-0.5 rounded-md bg-brand text-white text-xs capitalize font-medium">
                  Current Stage
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
