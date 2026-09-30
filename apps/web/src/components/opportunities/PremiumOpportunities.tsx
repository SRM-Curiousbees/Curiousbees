'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateOpportunitySchema } from '@curiousbees/shared-utils';
import { Briefcase, Calendar, ExternalLink, Mail, Plus, Search, SlidersHorizontal, User, Users, X } from 'lucide-react';
import type { CollaborationRequest, Opportunity } from '@curiousbees/types';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { handleAvatarError } from '@/lib/avatar';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge, type Tone } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Field, DetailItem } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

// Suggestions for the publish form; posters can add their own.
const SUGGESTED_DOMAINS = [
  'Artificial Intelligence',
  'Quantum Computing',
  'Bioinformatics',
  'VLSI & Photonics',
  'Cybersecurity',
  'Medical Imaging',
  'Clean Energy',
  'Robotics',
  'Nanotechnology',
  'Cloud Computing',
  'Data Science',
  'Signal Processing',
];

const OPPORTUNITY_TYPES = [
  'PhD Position',
  'Research Assistantship',
  'Research Project',
  'Research Internship',
  'Fellowship',
  'Postdoctoral Position',
  'Lab Position',
  'Research Collaboration',
  'Grant / Funding Opportunity',
  'Other',
];

const FUNDING_OPTIONS = ['Fully Funded', 'Partially Funded', 'Self Funded', 'Fellowship Supported', 'Grant Supported', 'Stipend Available', 'Unspecified'];
const ELIGIBILITY_OPTIONS = ['PhD Scholars', 'Research Scholars', 'Postgraduate Students', 'Faculty', 'Research Assistants', 'External Researchers'];
const MODE_OPTIONS = ['On Campus', 'Remote', 'Hybrid', 'Field / Laboratory', 'Other'];
const APPLICATION_METHODS = [
  { value: 'CuriousBees', label: 'Requests through CuriousBees' },
  { value: 'External Application Link', label: 'External application link' },
  { value: 'Email', label: 'Email' },
];

const REQUEST_STATUS: Record<CollaborationRequest['status'], { tone: Tone; label: string }> = {
  PENDING: { tone: 'warning', label: 'Request pending' },
  PUBLISHED: { tone: 'success', label: 'Request accepted' },
  REJECTED: { tone: 'danger', label: 'Request declined' },
  NEEDS_INFO: { tone: 'warning', label: 'More information needed' },
};

const EMPTY_FORM = {
  title: '',
  description: '',
  department: '',
  researchDomain: '',
  opportunityType: 'PhD Position',
  positionsCount: 1,
  funding: 'Unspecified',
  fundingDetails: '',
  eligibility: ['PhD Scholars'],
  deadline: '',
  mode: 'On Campus',
  applicationMethod: 'CuriousBees',
  applicationUrl: '',
  applicationEmail: '',
};

type Filters = { type: string; funding: string[]; mode: string[]; domain: string[] };
const NO_FILTERS: Filters = { type: '', funding: [], mode: [], domain: [] };

function splitDomains(value?: string | null) {
  return (value || '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
}

function formatDate(value?: string | Date | null) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
}

function isClosed(deadline?: string | Date | null) {
  const d = deadline ? new Date(deadline) : null;
  if (!d || isNaN(d.getTime())) return false;
  // A deadline date stays open until the end of that day.
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
}

function deptBase(value?: string | null) {
  return (value || '').split('(')[0].trim();
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function externalHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function Avatar({ src, className }: { src?: string | null; className?: string }) {
  return src ? (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={(e) => handleAvatarError(e)}
      className={cn('size-8 shrink-0 rounded-full border border-line bg-surface-muted object-cover', className)}
    />
  ) : (
    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-muted', className)}>
      <User className="size-3.5" aria-hidden />
    </span>
  );
}

function CheckOption({ label, count, checked, onChange }: { label: string; count?: number; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md py-1.5 text-sm text-ink-secondary hover:text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 shrink-0 rounded border-line-strong accent-[rgb(var(--brand-solid))]" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className="shrink-0 text-xs tabular-nums text-ink-muted">{count}</span>}
    </label>
  );
}

export function PremiumOpportunities() {
  const {
    opportunities,
    fetchOpportunities,
    createOpportunity,
    collaborationRequests,
    fetchCollaborationRequests,
    createCollaborationRequest,
    currentUser,
    addToast,
  } = useStore();

  const [loading, setLoading] = useState(opportunities.length === 0);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<Opportunity | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [requesting, setRequesting] = useState(false);

  const role = currentUser?.role as string | undefined;
  const isScholar = role === 'RESEARCH_SCHOLAR' || role === 'SCHOLAR';
  const isSupervisor = role === 'RESEARCH_SUPERVISOR' || role === 'SUPERVISOR';
  // Institute administrators govern the platform and do not post research opportunities.
  const canPublish = isScholar || isSupervisor;
  const userDept = currentUser?.department || '';

  useEffect(() => {
    let active = true;
    Promise.allSettled([fetchOpportunities(), fetchCollaborationRequests()]).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchOpportunities, fetchCollaborationRequests]);

  // The scholar's own requests, keyed by opportunity.
  const myRequests = useMemo(() => {
    const map = new Map<string, CollaborationRequest>();
    if (!isScholar) return map;
    (collaborationRequests || []).forEach((r) => {
      if (r.opportunityId && r.scholarId === currentUser?.id) map.set(r.opportunityId, r);
    });
    return map;
  }, [collaborationRequests, currentUser?.id, isScholar]);

  // Mirrors the API's department rule so people see why they can't request, instead of an error.
  const inMyDepartment = (opp: Opportunity) => {
    const oppDeptId = (opp as any).departmentId as string | undefined;
    const myDeptId = (currentUser as any)?.departmentId as string | undefined;
    if (oppDeptId && myDeptId) return oppDeptId === myDeptId;
    const mine = deptBase(userDept).toLowerCase();
    const theirs = deptBase(opp.department).toLowerCase();
    return !!mine && !!theirs && (mine === theirs || mine.includes(theirs) || theirs.includes(mine));
  };

  const interestNames = useMemo(
    () => ((currentUser?.interests || []) as any[]).map((i) => i?.interest?.name || i?.name || '').filter(Boolean).map((n: string) => n.toLowerCase()),
    [currentUser?.interests],
  );

  const all = useMemo(() => (opportunities || []).filter((o) => o && o.title), [opportunities]);

  // Filter options come from the opportunities that exist, so every option returns results.
  const facets = useMemo(
    () => ({
      type: countBy(all.map((o) => o.opportunityType).filter(Boolean) as string[]),
      funding: countBy(all.map((o) => o.funding).filter((f): f is string => !!f && f !== 'Unspecified')),
      mode: countBy(all.map((o) => o.mode).filter(Boolean) as string[]),
      domain: countBy(all.flatMap((o) => splitDomains(o.researchDomain))),
    }),
    [all],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = all.filter((o) => {
      const haystack = [o.title, o.description, o.researchDomain, o.department, o.opportunityType, o.author?.name].join(' ').toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (filters.type && o.opportunityType !== filters.type) return false;
      if (filters.funding.length && !filters.funding.includes(o.funding || '')) return false;
      if (filters.mode.length && !filters.mode.includes(o.mode || '')) return false;
      if (filters.domain.length && !splitDomains(o.researchDomain).some((d) => filters.domain.includes(d))) return false;
      return true;
    });
    // Open before closed; within each, ones matching the viewer's research interests first.
    const score = (o: Opportunity) =>
      (isClosed(o.deadline) ? 0 : 2) + (interestNames.some((i) => (o.researchDomain || '').toLowerCase().includes(i)) ? 1 : 0);
    return [...matched].sort((a, b) => score(b) - score(a));
  }, [all, query, filters, interestNames]);

  const activeFilterCount = (filters.type ? 1 : 0) + filters.funding.length + filters.mode.length + filters.domain.length;
  const hasQueryOrFilters = activeFilterCount > 0 || query.trim() !== '';

  const toggle = (key: 'funding' | 'mode' | 'domain', value: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));

  // ── Publish form ──────────────────────────────────────────────────────────
  const [domainTags, setDomainTags] = useState<string[]>([]);
  const [customDomain, setCustomDomain] = useState('');
  const [eligibility, setEligibility] = useState<string[]>(['PhD Scholars']);
  const todayISO = new Date().toISOString().split('T')[0];

  // Only supervisors can review join requests, so scholars' posts take applications by email or link.
  const methods = isSupervisor ? APPLICATION_METHODS : APPLICATION_METHODS.filter((m) => m.value !== 'CuriousBees');
  const formDefaults = {
    ...EMPTY_FORM,
    department: userDept,
    applicationMethod: isSupervisor ? 'CuriousBees' : 'Email',
    applicationEmail: isSupervisor ? '' : currentUser?.email || '',
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(CreateOpportunitySchema), defaultValues: formDefaults });
  const applicationMethod = watch('applicationMethod');

  const setDomains = (next: string[]) => {
    setDomainTags(next);
    setValue('researchDomain', next.join(', '), { shouldValidate: next.length > 0 });
  };
  const addDomain = (tag: string) => {
    const cleaned = tag.trim();
    if (cleaned && !domainTags.includes(cleaned)) setDomains([...domainTags, cleaned]);
    setCustomDomain('');
  };

  const closePublish = () => {
    setPublishOpen(false);
  };

  const onPublish = async (data: any) => {
    if (domainTags.length === 0) {
      addToast('Add at least one research domain.', 'error');
      return;
    }
    try {
      await createOpportunity({
        title: data.title,
        description: data.description,
        department: userDept,
        researchDomain: domainTags.join(', '),
        opportunityType: data.opportunityType,
        positionsCount: Number(data.positionsCount) || 1,
        funding: data.funding,
        fundingDetails: data.fundingDetails || undefined,
        eligibility,
        deadline: data.deadline || undefined,
        mode: data.mode,
        applicationMethod: data.applicationMethod,
        applicationUrl: data.applicationMethod === 'External Application Link' ? data.applicationUrl || undefined : undefined,
        applicationEmail: data.applicationMethod === 'Email' ? data.applicationEmail || undefined : undefined,
      });
      addToast('Opportunity published.', 'success');
      reset(formDefaults);
      setDomainTags([]);
      setEligibility(['PhD Scholars']);
      setPublishOpen(false);
      fetchOpportunities();
    } catch (e: any) {
      addToast(e?.message || 'The opportunity could not be published.', 'error');
    }
  };

  // ── Join requests ─────────────────────────────────────────────────────────
  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTarget) return;
    setRequesting(true);
    try {
      await createCollaborationRequest(requestTarget.id, requestMessage.trim() || undefined);
      addToast(`Request sent to ${requestTarget.author?.name || 'the author'}.`, 'success');
      setRequestTarget(null);
      setRequestMessage('');
    } catch (err: any) {
      addToast(err?.message || 'The request could not be sent.', 'error');
    } finally {
      setRequesting(false);
    }
  };

  /** What the viewer can do next with this opportunity, or why they can't. */
  const actionFor = (opp: Opportunity): { node: React.ReactNode; note?: string } => {
    if (opp.authorId === currentUser?.id) return { node: null, note: 'You posted this opportunity.' };
    if (isClosed(opp.deadline)) return { node: null, note: 'Applications closed on ' + formatDate(opp.deadline) + '.' };
    if (opp.applicationMethod === 'External Application Link' && opp.applicationUrl) {
      return {
        node: (
          <a href={externalHref(opp.applicationUrl)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: 'sm' })}>
            Apply
            <ExternalLink aria-hidden />
          </a>
        ),
      };
    }
    if (opp.applicationMethod === 'Email' && opp.applicationEmail) {
      return {
        node: (
          <a
            href={`mailto:${opp.applicationEmail}?subject=${encodeURIComponent(`Application: ${opp.title}`)}`}
            className={buttonVariants({ size: 'sm' })}
          >
            <Mail aria-hidden />
            Apply by email
          </a>
        ),
      };
    }
    // Applications through CuriousBees are join requests: scholars send them and supervisors review them.
    const authorRole = opp.author?.role as string | undefined;
    if (authorRole && authorRole !== 'RESEARCH_SUPERVISOR' && authorRole !== 'SUPERVISOR') {
      return { node: null, note: `Contact ${opp.author?.name || 'the author'} directly to apply.` };
    }
    if (!isScholar) return { node: null, note: 'Scholars request to join through CuriousBees.' };
    const existing = myRequests.get(opp.id);
    if (existing) {
      const s = REQUEST_STATUS[existing.status] || REQUEST_STATUS.PENDING;
      return {
        node: <Badge tone={s.tone}>{s.label}</Badge>,
        note: existing.status === 'PUBLISHED' ? 'A shared workspace was created for you both.' : undefined,
      };
    }
    if (!inMyDepartment(opp)) return { node: null, note: `Open to researchers in ${deptBase(opp.department) || 'another department'}.` };
    return {
      node: (
        <Button size="sm" onClick={() => setRequestTarget(opp)}>
          Request to join
        </Button>
      ),
    };
  };

  const filterPanel = (
    <div className="space-y-6">
      {facets.type.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">Type</legend>
          <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-ink-secondary hover:text-ink">
            <input type="radio" name="opp-type" checked={!filters.type} onChange={() => setFilters((f) => ({ ...f, type: '' }))} className="size-4 shrink-0 accent-[rgb(var(--brand-solid))]" />
            <span className="min-w-0 flex-1 truncate">All types</span>
            <span className="shrink-0 text-xs tabular-nums text-ink-muted">{all.length}</span>
          </label>
          {facets.type.map(([t, n]) => (
            <label key={t} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-ink-secondary hover:text-ink">
              <input type="radio" name="opp-type" checked={filters.type === t} onChange={() => setFilters((f) => ({ ...f, type: t }))} className="size-4 shrink-0 accent-[rgb(var(--brand-solid))]" />
              <span className="min-w-0 flex-1 truncate">{t}</span>
              <span className="shrink-0 text-xs tabular-nums text-ink-muted">{n}</span>
            </label>
          ))}
        </fieldset>
      )}
      {facets.domain.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">Research domain</legend>
          <div className="max-h-56 overflow-y-auto pr-1">
            {facets.domain.map(([d, n]) => (
              <CheckOption key={d} label={d} count={n} checked={filters.domain.includes(d)} onChange={() => toggle('domain', d)} />
            ))}
          </div>
        </fieldset>
      )}
      {facets.funding.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">Funding</legend>
          {facets.funding.map(([f, n]) => (
            <CheckOption key={f} label={f} count={n} checked={filters.funding.includes(f)} onChange={() => toggle('funding', f)} />
          ))}
        </fieldset>
      )}
      {facets.mode.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">Work mode</legend>
          {facets.mode.map(([m, n]) => (
            <CheckOption key={m} label={m} count={n} checked={filters.mode.includes(m)} onChange={() => toggle('mode', m)} />
          ))}
        </fieldset>
      )}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={() => setFilters(NO_FILTERS)}>
          Clear filters
        </Button>
      )}
    </div>
  );

  const selectedAction = selected ? actionFor(selected) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        meta="Discover"
        title="Research opportunities"
        description="PhD positions, assistantships, projects and fellowships posted by researchers at your institution."
        actions={
          canPublish && (
            <Button onClick={() => setPublishOpen(true)}>
              <Plus aria-hidden />
              Post opportunity
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden min-w-0 overflow-hidden lg:block" aria-label="Filters">
          <div className="sticky top-24">{filterPanel}</div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, domain or researcher"
                aria-label="Search opportunities"
                className="cb-input pl-9"
              />
            </div>
            <Button variant="secondary" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal aria-hidden />
              Filters
              {activeFilterCount > 0 && <span className="rounded-full bg-brand-100 px-1.5 text-xs tabular-nums text-brand-800">{activeFilterCount}</span>}
            </Button>
          </div>

          {!loading && all.length > 0 && (
            <p className="mb-3 text-sm text-ink-muted" aria-live="polite">
              {hasQueryOrFilters ? `${results.length} of ${all.length} opportunities` : `${all.length} ${all.length === 1 ? 'opportunity' : 'opportunities'}`}
            </p>
          )}

          {loading && all.length === 0 ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading opportunities">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="mt-3 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                  <Skeleton className="mt-4 h-10 w-full" />
                </Card>
              ))}
            </div>
          ) : all.length === 0 ? (
            <Card>
              <EmptyState
                icon={Briefcase}
                title="No opportunities posted yet"
                description="When researchers post positions, projects or fellowships, they'll appear here."
                action={
                  canPublish && (
                    <Button onClick={() => setPublishOpen(true)}>
                      <Plus aria-hidden />
                      Post an opportunity
                    </Button>
                  )
                }
              />
            </Card>
          ) : results.length === 0 ? (
            <Card>
              <EmptyState
                icon={Search}
                title="No opportunities match"
                description="Try a different search, or remove some filters."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('');
                      setFilters(NO_FILTERS);
                    }}
                  >
                    Clear search and filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <ul className="space-y-4">
              {results.map((opp) => {
                const closed = isClosed(opp.deadline);
                const domains = splitDomains(opp.researchDomain);
                const { node, note } = actionFor(opp);
                const facts = [
                  opp.funding && opp.funding !== 'Unspecified' ? opp.funding : null,
                  opp.positionsCount ? `${opp.positionsCount} ${opp.positionsCount === 1 ? 'position' : 'positions'}` : null,
                  opp.mode,
                ].filter(Boolean);
                return (
                  <li key={opp.id}>
                    <Card interactive className={cn('p-5', closed && 'bg-surface-muted')}>
                      <div className="flex flex-wrap items-center gap-2">
                        {opp.opportunityType && <Badge tone="brand">{opp.opportunityType}</Badge>}
                        {closed && <Badge>Closed</Badge>}
                        {opp.authorId === currentUser?.id && <Badge tone="plum">Your post</Badge>}
                      </div>
                      <h2 className="mt-2.5 text-base font-semibold text-ink">
                        <button type="button" onClick={() => setSelected(opp)} className="rounded text-left hover:text-brand">
                          {opp.title}
                        </button>
                      </h2>
                      <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-ink-secondary">
                        <Avatar src={opp.author?.image} className="size-6" />
                        <span className="truncate">
                          {opp.author?.name || 'Researcher'}
                          {deptBase(opp.department) && <span className="text-ink-muted"> · {deptBase(opp.department)}</span>}
                        </span>
                      </div>
                      {opp.description && <p className="mt-3 line-clamp-2 text-sm text-ink-secondary">{opp.description}</p>}
                      {domains.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {domains.slice(0, 4).map((d) => (
                            <span key={d} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-ink-secondary">
                              {d}
                            </span>
                          ))}
                          {domains.length > 4 && <span className="px-1 py-0.5 text-xs text-ink-muted">+{domains.length - 4}</span>}
                        </div>
                      )}
                      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                          {facts.length > 0 && <span>{facts.join(' · ')}</span>}
                          {opp.deadline && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="size-3.5" aria-hidden />
                              {closed ? 'Closed' : 'Apply by'} {formatDate(opp.deadline)}
                            </span>
                          )}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button variant="secondary" size="sm" onClick={() => setSelected(opp)}>
                            Details
                          </Button>
                          {node}
                        </div>
                      </div>
                      {note && !node && !closed && <p className="mt-2 text-xs text-ink-muted sm:text-right">{note}</p>}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Filters on small screens */}
      <Dialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="right"
        title="Filters"
        footer={<Button onClick={() => setFiltersOpen(false)}>Show {results.length} {results.length === 1 ? 'result' : 'results'}</Button>}
      >
        {filterPanel}
      </Dialog>

      {/* Details */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected?.title || ''}
        description={[selected?.opportunityType, deptBase(selected?.department)].filter(Boolean).join(' · ')}
        footer={
          selected && (
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
              {selectedAction?.node}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar src={selected.author?.image} className="size-10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{selected.author?.name || 'Researcher'}</p>
                {(selected.author?.department || selected.department) && (
                  <p className="truncate text-sm text-ink-muted">{selected.author?.department || selected.department}</p>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4 rounded-xl border border-line bg-surface-muted p-4 sm:grid-cols-4">
              <DetailItem label="Funding">{selected.funding && selected.funding !== 'Unspecified' ? selected.funding : 'Not stated'}</DetailItem>
              <DetailItem label="Positions">{selected.positionsCount || 1}</DetailItem>
              <DetailItem label="Work mode">{selected.mode || 'Not stated'}</DetailItem>
              <DetailItem label="Deadline">{formatDate(selected.deadline) || 'None given'}</DetailItem>
            </dl>

            {selected.fundingDetails && (
              <div>
                <h3 className="text-sm font-medium text-ink">Funding details</h3>
                <p className="mt-1 text-sm text-ink-secondary">{selected.fundingDetails}</p>
              </div>
            )}

            {selected.eligibility && selected.eligibility.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-ink">Who can apply</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.eligibility.map((el) => (
                    <Badge key={el}>{el}</Badge>
                  ))}
                </div>
              </div>
            )}

            {splitDomains(selected.researchDomain).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-ink">Research domains</h3>
                <p className="mt-1 text-sm text-ink-secondary">{splitDomains(selected.researchDomain).join(', ')}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-ink">Description and requirements</h3>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-secondary">{selected.description}</p>
            </div>

            <div className="rounded-xl border border-line p-4">
              <h3 className="text-sm font-medium text-ink">How to apply</h3>
              <p className="mt-1 text-sm text-ink-secondary">
                {selected.applicationMethod === 'External Application Link' && selected.applicationUrl ? (
                  <>
                    On the author's application page:{' '}
                    <a href={externalHref(selected.applicationUrl)} target="_blank" rel="noopener noreferrer" className="break-all text-brand underline-offset-2 hover:underline">
                      {selected.applicationUrl}
                    </a>
                  </>
                ) : selected.applicationMethod === 'Email' && selected.applicationEmail ? (
                  <>
                    By email to <a href={`mailto:${selected.applicationEmail}`} className="text-brand underline-offset-2 hover:underline">{selected.applicationEmail}</a>
                  </>
                ) : (
                  'Scholars send a request to join through CuriousBees. If the author accepts, a shared workspace is created for them both.'
                )}
              </p>
              {selectedAction?.note && <p className="mt-2 text-sm text-ink-muted">{selectedAction.note}</p>}
              {isScholar && myRequests.get(selected.id)?.status === 'PUBLISHED' && (
                <Link href="/workspace" className="mt-2 inline-block text-sm font-medium text-brand underline-offset-2 hover:underline">
                  Go to your workspaces
                </Link>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Request to join */}
      <Dialog
        open={!!requestTarget}
        onClose={() => setRequestTarget(null)}
        dismissible={!requesting}
        title="Request to join"
        description={
          requestTarget
            ? `${requestTarget.author?.name || 'The author'} will see your request for "${requestTarget.title}" and can accept or decline it. Accepting creates a shared workspace for you both.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setRequestTarget(null)} disabled={requesting}>
              Cancel
            </Button>
            <Button type="submit" form="opp-request-form" loading={requesting}>
              Send request
            </Button>
          </>
        }
      >
        <form id="opp-request-form" onSubmit={submitRequest}>
          <Field label="Message" htmlFor="opp-request-message" hint="Optional. Your background and why this fits your research.">
            <textarea
              id="opp-request-message"
              rows={5}
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              className="cb-input resize-y"
            />
          </Field>
        </form>
      </Dialog>

      {/* Publish */}
      <Dialog
        open={publishOpen}
        onClose={closePublish}
        dismissible={!isSubmitting}
        side="right"
        size="lg"
        title="Post an opportunity"
        description={
          userDept
            ? `Posted to ${deptBase(userDept)}.${isSupervisor ? ' Scholars in your department can request to join.' : ''}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={closePublish} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="opp-publish-form" loading={isSubmitting} disabled={!userDept}>
              Publish
            </Button>
          </>
        }
      >
        <form id="opp-publish-form" onSubmit={handleSubmit(onPublish)} className="space-y-5">
          {!userDept && (
            <p role="alert" className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800">
              Your account has no department yet. An institute administrator needs to assign one before you can post.
            </p>
          )}

          <Field label="Title" htmlFor="opp-title" required error={errors.title?.message as string | undefined}>
            <input id="opp-title" type="text" {...register('title')} className="cb-input" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="opp-type">
              <select id="opp-type" {...register('opportunityType')} className="cb-input">
                {OPPORTUNITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Positions" htmlFor="opp-positions" required error={errors.positionsCount?.message as string | undefined}>
              <input id="opp-positions" type="number" min={1} {...register('positionsCount')} className="cb-input" />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-ink">
              Research domains
              <span className="ml-0.5 text-danger-600" aria-hidden>
                *
              </span>
            </legend>
            {domainTags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {domainTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-2.5 pr-1 text-sm text-brand-800 ring-1 ring-inset ring-brand-200">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setDomains(domainTags.filter((t) => t !== tag))}
                      aria-label={`Remove ${tag}`}
                      className="rounded-full p-0.5 hover:bg-brand-100"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDomain(customDomain);
                  }
                }}
                aria-label="Add a research domain"
                placeholder="Type a domain and press Enter"
                className="cb-input min-w-0 flex-1"
              />
              <Button variant="secondary" onClick={() => addDomain(customDomain)} disabled={!customDomain.trim()}>
                Add
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTED_DOMAINS.filter((d) => !domainTags.includes(d)).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => addDomain(d)}
                  className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-secondary transition-colors duration-fast hover:border-line-strong hover:text-ink"
                >
                  + {d}
                </button>
              ))}
            </div>
            {errors.researchDomain && domainTags.length === 0 && (
              <p role="alert" className="mt-1.5 text-xs text-danger-700">
                {errors.researchDomain.message as string}
              </p>
            )}
          </fieldset>

          <Field label="Description and requirements" htmlFor="opp-desc" required error={errors.description?.message as string | undefined}>
            <textarea id="opp-desc" rows={6} {...register('description')} className="cb-input resize-y" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Funding" htmlFor="opp-funding">
              <select id="opp-funding" {...register('funding')} className="cb-input">
                {FUNDING_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f === 'Unspecified' ? 'Not stated' : f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Work mode" htmlFor="opp-mode">
              <select id="opp-mode" {...register('mode')} className="cb-input">
                {MODE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Funding details" htmlFor="opp-funding-details" hint="Optional, e.g. the monthly stipend and its duration.">
            <input id="opp-funding-details" type="text" {...register('fundingDetails')} className="cb-input" />
          </Field>

          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-ink">Who can apply</legend>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              {ELIGIBILITY_OPTIONS.map((option) => (
                <CheckOption
                  key={option}
                  label={option}
                  checked={eligibility.includes(option)}
                  onChange={() => {
                    const next = eligibility.includes(option) ? eligibility.filter((t) => t !== option) : [...eligibility, option];
                    setEligibility(next);
                    setValue('eligibility', next);
                  }}
                />
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Application deadline" htmlFor="opp-deadline" hint="Optional.">
              <input id="opp-deadline" type="date" min={todayISO} {...register('deadline')} className="cb-input" />
            </Field>
            <Field label="How people apply" htmlFor="opp-method">
              <select id="opp-method" {...register('applicationMethod')} className="cb-input">
                {methods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {applicationMethod === 'External Application Link' && (
            <Field label="Application link" htmlFor="opp-url" required>
              <input id="opp-url" type="url" required placeholder="https://" {...register('applicationUrl')} className="cb-input" />
            </Field>
          )}
          {applicationMethod === 'Email' && (
            <Field label="Application email" htmlFor="opp-email" required>
              <input id="opp-email" type="email" required {...register('applicationEmail')} className="cb-input" />
            </Field>
          )}
          {applicationMethod === 'CuriousBees' && (
            <p className="text-sm text-ink-muted">
              Scholars in your department send you a request. You review requests in your supervision panel, and accepting one creates a shared workspace.
            </p>
          )}
        </form>
      </Dialog>
    </div>
  );
}
