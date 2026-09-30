'use client';

/**
 * Publications registry. Scholars see and manage their own record; supervisors see
 * the institution's publications and manage their own. Edit and delete are shown only
 * where the API allows them (the author, or an institute admin).
 */

import React, { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { ActionMenu } from '@/components/ui/action-menu';
import { Field } from '@/components/ui/field';

const STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'PUBLISHED', label: 'Published' },
];

export default function PublicationsPage() {
  const { currentUser, publications, fetchPublications, createPublication, updatePublication, deletePublication, addToast } = useStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPub, setEditingPub] = useState<any | null>(null);
  const [deletingPub, setDeletingPub] = useState<any | null>(null);
  const [loading, setLoading] = useState(publications.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [doi, setDoi] = useState('');
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState('PUBLISHED');

  const isSupervisor = currentUser?.role === 'RESEARCH_SUPERVISOR';
  const isAdmin = currentUser?.role === 'INSTITUTE_ADMIN';

  const loadPublications = React.useCallback(
    async (showLoading = true) => {
      const targetUserId = isSupervisor || isAdmin ? undefined : currentUser?.id;
      if (showLoading && publications.length === 0) setLoading(true);
      setError(null);
      try {
        await fetchPublications(targetUserId);
      } catch (e: any) {
        console.error('Failed to load publications:', e);
        setError('The publications list could not be loaded.');
      } finally {
        setLoading(false);
      }
    },
    [currentUser?.id, isSupervisor, isAdmin, fetchPublications, publications.length],
  );

  useEffect(() => {
    loadPublications(publications.length === 0);
  }, [loadPublications]);

  const handleOpenCreate = () => {
    setEditingPub(null);
    setTitle('');
    setAuthors(currentUser?.name || '');
    setDoi('');
    setPublisher('');
    setYear(new Date().getFullYear());
    setStatus('PUBLISHED');
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (pub: any) => {
    setEditingPub(pub);
    setTitle(pub.title);
    setAuthors(pub.authors);
    setDoi(pub.doi || '');
    setPublisher(pub.publisher || '');
    setYear(pub.year);
    setStatus(pub.status);
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !authors || !year) {
      setFormError('Title, authors and year are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = { title, authors, doi: doi || undefined, publisher: publisher || undefined, year: Number(year), status };
    try {
      if (editingPub) {
        await updatePublication(editingPub.id, payload);
        addToast('Publication updated.', 'success');
      } else {
        await createPublication(payload);
        addToast('Publication added.', 'success');
      }
      setIsDrawerOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'The publication could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPub) return;
    setSaving(true);
    try {
      await deletePublication(deletingPub.id);
      addToast('Publication deleted.', 'success');
      setDeletingPub(null);
    } catch (err: any) {
      addToast(err?.message || 'The publication could not be deleted.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const q = searchTerm.toLowerCase();
  const filteredPubs = publications.filter((p) => p.title.toLowerCase().includes(q) || p.authors.toLowerCase().includes(q));
  const canManage = (pub: any) => pub.userId === currentUser?.id || isAdmin;

  return (
    <div>
      <PageHeader
        meta="Research"
        title="Publications"
        description={
          isSupervisor
            ? 'Journal articles, conference papers and chapters recorded by researchers across SRMIST.'
            : 'Your journal articles, conference papers and chapters. They appear on your researcher profile.'
        }
        actions={
          !isAdmin && (
            <Button onClick={handleOpenCreate}>
              <Plus aria-hidden />
              Add publication
            </Button>
          )
        }
      />

      <Card>
        <div className="border-b border-line p-4">
          <div className="relative max-w-sm">
            <label htmlFor="pub-search" className="sr-only">
              Search publications
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              id="pub-search"
              type="search"
              placeholder="Search title or authors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cb-input pl-9"
            />
          </div>
        </div>

        {loading && publications.length === 0 ? (
          <div role="status" aria-label="Loading publications" className="divide-y divide-line">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2.5 px-5 py-5">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            ))}
          </div>
        ) : error && publications.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Publications didn't load"
            description={`${error} Check your connection and try again.`}
            action={
              <Button variant="secondary" onClick={() => loadPublications(true)}>
                Try again
              </Button>
            }
          />
        ) : filteredPubs.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={searchTerm ? 'No publications match your search' : 'No publications yet'}
            description={
              searchTerm
                ? 'Try a different title or author name.'
                : 'Add your journal articles, conference papers and chapters so collaborators can find your work.'
            }
            action={
              !searchTerm &&
              !isAdmin && (
                <Button onClick={handleOpenCreate}>
                  <Plus aria-hidden />
                  Add your first publication
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {filteredPubs.map((pub) => {
              const author = (pub as any).user;
              const dept = author?.departmentRef?.name || author?.department;
              return (
                <li key={pub.id} className="flex items-start gap-4 px-5 py-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={pub.status} />
                      <span className="text-xs tabular-nums text-ink-muted">{pub.year}</span>
                    </div>
                    <h2 className="mt-2 font-serif text-lg font-semibold leading-snug text-ink">{pub.title}</h2>
                    <p className="mt-1 text-sm text-ink-secondary">{pub.authors}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                      {pub.publisher && <span className="italic">{pub.publisher}</span>}
                      {pub.doi && (
                        <a
                          href={`https://doi.org/${pub.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline"
                        >
                          doi:{pub.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}
                          <ExternalLink className="size-3" aria-hidden />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      )}
                      {author && isSupervisor && (
                        <span>
                          Recorded by <span className="text-ink-secondary">{author.name}</span>
                          {dept ? ` · ${dept}` : ''}
                        </span>
                      )}
                    </p>
                  </div>
                  {canManage(pub) && (
                    <ActionMenu
                      label={`Actions for ${pub.title}`}
                      items={[
                        { label: 'Edit', icon: Pencil, onSelect: () => handleOpenEdit(pub) },
                        'separator',
                        { label: 'Delete', icon: Trash2, tone: 'danger', onSelect: () => setDeletingPub(pub) },
                      ]}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Dialog
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        dismissible={!saving}
        side="right"
        title={editingPub ? 'Edit publication' : 'Add publication'}
        description="Shown on your researcher profile."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDrawerOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="publication-form" loading={saving}>
              {editingPub ? 'Save changes' : 'Add publication'}
            </Button>
          </>
        }
      >
        <form id="publication-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}
          <Field label="Title" htmlFor="pub-title" required>
            <input id="pub-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="cb-input" />
          </Field>
          <Field label="Authors" htmlFor="pub-authors" required hint="Separate names with commas, in the order they appear on the paper.">
            <input id="pub-authors" type="text" value={authors} onChange={(e) => setAuthors(e.target.value)} required className="cb-input" />
          </Field>
          <Field label="Journal, conference or publisher" htmlFor="pub-publisher">
            <input
              id="pub-publisher"
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="e.g. IEEE Transactions on Image Processing"
              className="cb-input"
            />
          </Field>
          <Field label="DOI" htmlFor="pub-doi" hint="For example 10.1109/TIP.2024.1234567">
            <input id="pub-doi" type="text" value={doi} onChange={(e) => setDoi(e.target.value)} className="cb-input font-mono text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Year" htmlFor="pub-year" required>
              <input
                id="pub-year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                required
                min={1900}
                max={new Date().getFullYear() + 2}
                className="cb-input tabular-nums"
              />
            </Field>
            <Field label="Status" htmlFor="pub-status" required>
              <select id="pub-status" value={status} onChange={(e) => setStatus(e.target.value)} className="cb-input">
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!deletingPub}
        onClose={() => setDeletingPub(null)}
        dismissible={!saving}
        size="sm"
        title="Delete this publication?"
        description={deletingPub ? `“${deletingPub.title}” will be removed from your profile. This cannot be undone.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingPub(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={saving}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
