'use client';

import React, { useState } from 'react';
import { FileText, ExternalLink, Plus, BookOpen, Layers } from 'lucide-react';

interface PublicationItem {
  id: string;
  title: string;
  authors?: string;
  venue?: string;
  journal?: string;
  conference?: string;
  year: number;
  doi?: string;
  status?: string;
  authorshipRole?: string;
}

interface PublicationsCardProps {
  publications?: PublicationItem[];
  isOwnProfile?: boolean;
}

export function PublicationsCard({ publications = [], isOwnProfile }: PublicationsCardProps) {
  const [showAll, setShowAll] = useState(false);

  const displayedList = showAll ? publications : publications.slice(0, 3);

  if (!publications || publications.length === 0) {
    return (
      <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
            <FileText className="w-4 h-4 text-brand" />
            <span>Publications</span>
          </div>
        </div>

        <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-xs font-bold text-slate-500">No publications have been added yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
          <FileText className="w-4 h-4 text-brand" />
          <span>Publications ({publications.length})</span>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {displayedList.map((pub) => (
          <div
            key={pub.id}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-sm font-semibold text-slate-900 leading-snug flex-1">{pub.title}</h4>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-brand border border-blue-100 text-2xs font-bold shrink-0">
                {pub.year}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              {pub.authors || 'Researcher et al.'}
            </p>

            <div className="flex items-center justify-between gap-2 pt-1 text-xs text-slate-500 font-medium border-t border-slate-200/60 flex-wrap">
              <span className="italic truncate max-w-[280px]">
                {pub.venue || pub.journal || pub.conference || 'Peer-Reviewed Journal'}
              </span>

              <div className="flex items-center gap-3 shrink-0">
                {pub.doi && (
                  <a
                    href={pub.doi.startsWith('http') ? pub.doi : `https://doi.org/${pub.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>DOI</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {publications.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-brand text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          {showAll ? 'Show Fewer Publications' : `View All (${publications.length}) Publications`}
        </button>
      )}
    </div>
  );
}
