'use client';

import React from 'react';
import { Award, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpertiseItem {
  name: string;
  level: 'Advanced' | 'Intermediate' | 'Working Knowledge';
}

interface ResearchExpertiseCardProps {
  expertiseList?: ExpertiseItem[];
  isOwnProfile?: boolean;
  onEditClick?: () => void;
}

export function ResearchExpertiseCard({ expertiseList, isOwnProfile, onEditClick }: ResearchExpertiseCardProps) {
  const items: ExpertiseItem[] = expertiseList && expertiseList.length > 0
    ? expertiseList
    : [
        { name: 'Artificial Intelligence', level: 'Advanced' },
        { name: 'Machine Learning', level: 'Advanced' },
        { name: 'Python', level: 'Advanced' },
        { name: 'Natural Language Processing', level: 'Intermediate' },
        { name: 'Knowledge Graphs', level: 'Intermediate' },
        { name: 'Data Visualization', level: 'Working Knowledge' },
      ];

  return (
    <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
          <Award className="w-4 h-4 text-brand" />
          <span>Research Expertise</span>
        </div>
        {isOwnProfile && onEditClick && (
          <button
            onClick={onEditClick}
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors"
          >
            <span className="text-xs font-bold text-slate-900">{item.name}</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium capitalize border',
                item.level === 'Advanced'
                  ? 'bg-blue-50 text-brand border-blue-200'
                  : item.level === 'Intermediate'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              )}
            >
              {item.level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
