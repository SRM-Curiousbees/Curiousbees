'use client';

import React, { useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button, IconButton } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
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

  const labelFor = (value: string) => PLATFORM_OPTIONS.find((o) => o.value === value?.toUpperCase())?.label ?? 'Link';

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      dismissible={!isSubmitting}
      title="Profile links"
      description="Shown on your profile so others can find your work elsewhere."
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-6">
        <form onSubmit={handleAdd} className="space-y-4 rounded-xl border border-line bg-surface-muted p-4">
          {errorMsg && (
            <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {errorMsg}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Platform" htmlFor="link-platform">
              <select id="link-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="cb-input">
                {PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Label" htmlFor="link-label" hint="Optional">
              <input id="link-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="cb-input" />
            </Field>
          </div>
          <Field label="URL" htmlFor="link-url" required>
            <input
              id="link-url"
              type="url"
              required
              placeholder="https://orcid.org/0000-0000-0000-0000"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="cb-input"
            />
          </Field>
          <Button type="submit" size="sm" loading={isSubmitting}>
            <Plus aria-hidden />
            Add link
          </Button>
        </form>

        <section aria-labelledby="links-list">
          <h3 id="links-list" className="text-sm font-semibold text-ink">
            Your links <span className="font-normal text-ink-muted">{links.length}</span>
          </h3>
          {links.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">No links yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {links.map((link) => (
                <li key={link.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{link.label || labelFor(link.platform)}</p>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-xs text-ink-muted hover:text-brand">
                      <span className="truncate">{link.url}</span>
                      <ExternalLink className="size-3 shrink-0" aria-hidden />
                    </a>
                  </div>
                  <IconButton label={`Remove ${link.label || labelFor(link.platform)}`} size="sm" onClick={() => handleDelete(link.id)} className="text-ink-muted hover:text-danger-700">
                    <Trash2 />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  );
}
