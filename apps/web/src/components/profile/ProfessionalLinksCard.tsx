'use client';

import React from 'react';
import { ExternalLink, Link2, Edit3, Globe, Github, Linkedin, Youtube, Twitter } from 'lucide-react';
import { ResearcherExternalLink } from '@curiousbees/types';

interface ProfessionalLinksCardProps {
  links?: ResearcherExternalLink[];
  isOwnProfile?: boolean;
  onEditClick?: () => void;
}

const PLATFORM_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  ORCID: { label: 'ORCID iD', bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' },
  GOOGLE_SCHOLAR: { label: 'Google Scholar', bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
  RESEARCHGATE: { label: 'ResearchGate', bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-200' },
  GITHUB: { label: 'GitHub', bg: 'bg-slate-100', text: 'text-slate-900', border: 'border-slate-300' },
  LINKEDIN: { label: 'LinkedIn', bg: 'bg-sky-50', text: 'text-sky-900', border: 'border-sky-200' },
  WEBSITE: { label: 'Personal Website', bg: 'bg-blue-50', text: 'text-brand', border: 'border-blue-200' },
  PORTFOLIO: { label: 'Research Portfolio', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
  YOUTUBE: { label: 'YouTube Channel', bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' },
  TWITTER: { label: 'X / Twitter', bg: 'bg-slate-100', text: 'text-slate-900', border: 'border-slate-300' },
  OTHER: { label: 'External Profile', bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200' },
};

export function ProfessionalLinksCard({ links = [], isOwnProfile, onEditClick }: ProfessionalLinksCardProps) {
  const visibleLinks = links.filter((l) => l.isVisible !== false);

  return (
    <div className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium capitalize text-brand">
          <Globe className="w-4 h-4 text-brand" />
          <span>Professional & Research Links</span>
        </div>

        {isOwnProfile && onEditClick && (
          <button
            onClick={onEditClick}
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Links
          </button>
        )}
      </div>

      {visibleLinks.length === 0 ? (
        <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-xs font-bold text-slate-500">No professional or research links added.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {visibleLinks.map((link) => {
            const config = PLATFORM_CONFIG[link.platform.toUpperCase()] || PLATFORM_CONFIG.OTHER;

            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-xl border ${config.bg} ${config.border} hover:opacity-90 transition-all flex items-center justify-between gap-3 shadow-2xs group cursor-pointer`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Link2 className={`w-4 h-4 ${config.text} shrink-0`} />
                  <span className={`text-xs font-semibold ${config.text} truncate`}>
                    {link.label || config.label}
                  </span>
                </div>

                <ExternalLink className={`w-3.5 h-3.5 ${config.text} shrink-0 opacity-70 group-hover:opacity-100 transition-opacity`} />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
