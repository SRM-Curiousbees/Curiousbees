'use client';

import React from 'react';
import { Layers, Edit3 } from 'lucide-react';

interface ResearchFocusCardProps {
  areas?: string[];
  isOwnProfile?: boolean;
  onEditClick?: () => void;
}

export function ResearchFocusCard({ areas, isOwnProfile, onEditClick }: ResearchFocusCardProps) {
  const primaryAreas = areas && areas.length > 0
    ? areas
    : ['Artificial Intelligence', 'Machine Learning', 'Computer Vision', 'Data Analytics', 'Knowledge Graphs'];

  return (
    <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
          <Layers className="w-4 h-4 text-brand" />
          <span>Primary Research Areas</span>
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

      <div className="flex flex-wrap gap-2 pt-1">
        {primaryAreas.map((area, idx) => (
          <div
            key={idx}
            className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 flex items-center gap-2 shadow-2xs hover:border-blue-200 hover:bg-blue-50/50 transition-all"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span>{area}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
