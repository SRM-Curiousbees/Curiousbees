'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Globe, Check, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { ResearcherExternalLink } from '@curiousbees/types';

interface ProfessionalLinksEditorProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  links: ResearcherExternalLink[];
  onRefresh: () => void;
}

const PLATFORM_OPTIONS = [
  { value: 'ORCID', label: 'ORCID iD' },
  { value: 'GOOGLE_SCHOLAR', label: 'Google Scholar' },
  { value: 'RESEARCHGATE', label: 'ResearchGate' },
  { value: 'GITHUB', label: 'GitHub' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'WEBSITE', label: 'Personal Website' },
  { value: 'PORTFOLIO', label: 'Portfolio' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'TWITTER', label: 'X / Twitter' },
  { value: 'OTHER', label: 'Other External Link' },
];

export function ProfessionalLinksEditor({
  isOpen,
  onClose,
  userId,
  links,
  onRefresh,
}: ProfessionalLinksEditorProps) {
  const { addExternalLink, deleteExternalLink } = useStore();

  const [platform, setPlatform] = useState('ORCID');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg('Please provide a valid URL.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await addExternalLink(userId, { platform, label: label.trim() || undefined, url: url.trim() });
      setUrl('');
      setLabel('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (linkId: string) => {
    try {
      await deleteExternalLink(userId, linkId);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove link.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand" />
            <h3 className="text-base font-semibold text-slate-900">Edit Professional & Research Links</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-900 border border-red-200 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Form to add a new link */}
          <form onSubmit={handleAdd} className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-medium capitalize text-brand">Add / Update External Link</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Label (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ORCID Profile"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full URL</label>
              <input
                type="url"
                required
                placeholder="https://orcid.org/0000-0002-1825-0097"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-brand hover:bg-brand-strong text-white font-semibold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Save Link</span>
                </>
              )}
            </button>
          </form>

          {/* Configured Links List */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium capitalize text-slate-500">Configured Links ({links.length})</h4>

            {links.length === 0 ? (
              <p className="text-xs font-medium text-slate-400 italic">No external links saved yet.</p>
            ) : (
              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="p-3 rounded-xl border border-slate-200 bg-surface flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-brand block">{link.platform}</span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-600 font-medium hover:underline truncate block"
                      >
                        {link.url}
                      </a>
                    </div>

                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                      title="Remove Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
