'use client';

import React from 'react';
import { Trophy, Award } from 'lucide-react';

interface AwardItem {
  title: string;
  organization: string;
  year: number | string;
  description?: string;
}

interface AwardsCardProps {
  awards?: AwardItem[];
}

export function AwardsCard({ awards = [] }: AwardsCardProps) {
  if (!awards || awards.length === 0) {
    return (
      <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
            <Trophy className="w-4 h-4 text-brand" />
            <span>Awards & Recognition</span>
          </div>
        </div>

        <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-xs font-bold text-slate-500">No awards or recognitions added yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
          <Trophy className="w-4 h-4 text-brand" />
          <span>Awards & Recognition ({awards.length})</span>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {awards.map((item, idx) => (
          <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-xs font-semibold text-slate-900">{item.title}</h5>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-2xs font-semibold">
                {item.year}
              </span>
            </div>
            <p className="text-2xs text-slate-600 font-medium">{item.organization}</p>
            {item.description && (
              <p className="text-2xs text-slate-500 italic pt-0.5">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
