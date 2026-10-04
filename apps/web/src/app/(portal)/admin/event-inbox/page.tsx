'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, RefreshCw } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiGet, apiMutate } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { EVENT_TYPE_OPTIONS } from '@/lib/event-categories';
import { meetingProvider, safeExternalUrl } from '@/lib/event-links';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, type Tone } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { DetailItem, Field } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

type Status = 'REVIEW_REQUIRED' | 'CREATED' | 'DUPLICATE' | 'NOT_EVENT' | 'SKIPPED' | 'AI_FAILED' | 'DISMISSED';
type Tab = Status | 'ALL';

interface Extracted {
  title?: string | null;
  description?: string | null;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  timezone?: string | null;
  location?: string | null;
  organizer?: string | null;
  category?: string | null;
  eventUrl?: string | null;
  registrationUrl?: string | null;
  meetingUrl?: string | null;
}

interface Ingestion {
  id: string;
  status: Status;
  reason: string | null;
  confidence: number | null;
  extracted: Extracted | null;
  senderEmail: string | null;
  subject: string | null;
  receivedAt: string | null;
  createdAt: string;
  trustedSender: boolean;
  aiModel: string | null;
  aiInputTokens: number | null;
  aiOutputTokens: number | null;
  attempts: number;
  event: { id: string; title: string; date: string; time: string; status: string } | null;
  reviewedBy: { id: string; name: string | null } | null;
  reviewedAt: string | null;
}

interface Stats {
  days: number;
  incoming: number;
  skippedByFilter: number;
  sentToAi: number;
  aiFailed: number;
  notEvents: number;
  created: number;
  awaitingReview: number;
  duplicates: number;
  aiInputTokens: number;
  aiOutputTokens: number;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'REVIEW_REQUIRED', label: 'Needs review' },
  { id: 'CREATED', label: 'Published' },
  { id: 'DUPLICATE', label: 'Duplicates' },
  { id: 'NOT_EVENT', label: 'Not events' },
  { id: 'SKIPPED', label: 'Filtered out' },
  { id: 'AI_FAILED', label: 'AI failed' },
  { id: 'DISMISSED', label: 'Dismissed' },
  { id: 'ALL', label: 'All' },
];

const STATUS: Record<Status, { tone: Tone; label: string }> = {
  REVIEW_REQUIRED: { tone: 'warning', label: 'Needs review' },
  CREATED: { tone: 'success', label: 'Published' },
  DUPLICATE: { tone: 'neutral', label: 'Duplicate' },
  NOT_EVENT: { tone: 'neutral', label: 'Not an event' },
  SKIPPED: { tone: 'neutral', label: 'Filtered out' },
  AI_FAILED: { tone: 'danger', label: 'AI failed' },
  DISMISSED: { tone: 'neutral', label: 'Dismissed' },
};

const PAGE_SIZE = 25;

function formatDateTime(value?: string | null) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';
}

function formatDay(value?: string | null) {
  if (!value) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

const reasonsOf = (item: Ingestion) => (item.reason ? item.reason.split('; ').filter(Boolean) : []);

/** Form state for the review drawer: every field is a string so inputs stay controlled. */
type FormState = Record<keyof Extracted, string>;
const FIELDS: (keyof Extracted)[] = ['title', 'description', 'startDate', 'startTime', 'endDate', 'endTime', 'timezone', 'location', 'organizer', 'category', 'eventUrl', 'registrationUrl', 'meetingUrl'];

function formFrom(extracted: Extracted | null): FormState {
  const form = {} as FormState;
  for (const key of FIELDS) form[key] = (extracted?.[key] as string | null | undefined) ?? '';
  if (!form.timezone) form.timezone = 'Asia/Kolkata';
  return form;
}

function LinkLine({ label, url }: { label: string; url?: string | null }) {
  const safe = safeExternalUrl(url);
  if (!safe) return null;
  return (
    <DetailItem label={label} className="sm:col-span-2">
      <a href={safe} target="_blank" rel="noopener noreferrer" className="break-all font-normal text-brand underline-offset-4 hover:underline">
        {safe}
      </a>
    </DetailItem>
  );
}

/**
 * Institutional emails the n8n workflow turned into events, and the ones it
 * wasn't sure about. Admins complete and publish, or dismiss, the uncertain ones.
 * The API decides what may be published; this page only collects the decision.
 */
export default function AdminEventInboxPage() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const addToast = useStore((s) => s.addToast);
  const isAdmin = currentUser?.role === 'INSTITUTE_ADMIN';

  const [tab, setTab] = useState<Tab>('REVIEW_REQUIRED');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Ingestion[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<Ingestion | null>(null);
  const [form, setForm] = useState<FormState>(formFrom(null));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dismissing, setDismissing] = useState<Ingestion | null>(null);
  const [dismissNote, setDismissNote] = useState('');

  useEffect(() => {
    if (currentUser && !isAdmin) router.replace('/dashboard');
  }, [currentUser, isAdmin, router]);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const status = tab === 'ALL' ? '' : `&status=${tab}`;
      const [list, s] = await Promise.all([
        apiGet<{ items: Ingestion[]; pagination: { total: number } }>(`/api/admin/event-ingestion?page=${page}&limit=${PAGE_SIZE}${status}`),
        apiGet<Stats>('/api/admin/event-ingestion/stats?days=30'),
      ]);
      setItems(list.items || []);
      setTotal(list.pagination?.total ?? 0);
      setStats(s);
      setState('ready');
    } catch (e: any) {
      setError(e?.message || 'The event inbox could not be loaded.');
      setState('error');
    }
  }, [tab, page]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) return null;

  const open = (item: Ingestion) => {
    setSelected(item);
    setForm(formFrom(item.extracted));
    setFormError('');
  };
  const set = (key: keyof Extracted) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const publish = async () => {
    if (!selected) return;
    setSaving(true);
    setFormError('');
    try {
      const body = Object.fromEntries(FIELDS.map((k) => [k, form[k].trim() || null]));
      await apiMutate(`/api/admin/event-ingestion/${selected.id}/approve`, 'POST', body);
      addToast('Event published to the calendar', 'success');
      setSelected(null);
      load();
    } catch (e: any) {
      setFormError(e?.message || 'The event could not be published.');
    } finally {
      setSaving(false);
    }
  };

  const dismiss = async () => {
    if (!dismissing) return;
    setSaving(true);
    try {
      await apiMutate(`/api/admin/event-ingestion/${dismissing.id}/dismiss`, 'POST', { note: dismissNote.trim() || null });
      addToast('Email dismissed', 'success');
      setDismissing(null);
      setSelected(null);
      load();
    } catch (e: any) {
      addToast(e?.message || 'The email could not be dismissed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const figures = stats
    ? [
        { label: 'Emails received', value: stats.incoming },
        { label: 'Filtered out (no AI)', value: stats.skippedByFilter },
        { label: 'Read by AI', value: stats.sentToAi },
        { label: 'Published', value: stats.created },
        { label: 'Awaiting review', value: stats.awaitingReview, warn: stats.awaitingReview > 0 },
        { label: 'AI tokens', value: (stats.aiInputTokens + stats.aiOutputTokens).toLocaleString() },
      ]
    : [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const reviewing = selected?.status === 'REVIEW_REQUIRED';

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        meta="Communication"
        title="Event inbox"
        description="Institutional emails the n8n workflow turned into calendar events. Emails it wasn’t sure about wait here until you complete and publish, or dismiss, them."
        actions={
          <Button variant="secondary" onClick={load} disabled={state === 'loading'}>
            <RefreshCw className={cn(state === 'loading' && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
        }
      />

      {stats && (
        <Card className="mb-6">
          <dl className="grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
            {figures.map((f) => (
              <div key={f.label} className="px-5 py-4">
                <dt className="text-sm text-ink-muted">{f.label}</dt>
                <dd className={cn('mt-1 text-2xl font-semibold tabular-nums', f.warn ? 'text-warning-700' : 'text-ink')}>{f.value}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-line px-5 py-3 text-sm text-ink-muted">
            Last {stats.days} days. {stats.aiFailed > 0 ? `${stats.aiFailed} AI call${stats.aiFailed === 1 ? '' : 's'} failed and can be retried from n8n.` : 'No failed AI calls.'}
          </p>
        </Card>
      )}

      <div className="-mx-4 mb-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div role="tablist" aria-label="Status" className="inline-flex min-w-max rounded-lg border border-line bg-surface-muted p-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setPage(1);
              }}
              className={cn(
                'h-8 rounded-md px-3 text-sm transition-colors duration-fast',
                tab === t.id ? 'bg-surface font-medium text-ink shadow-xs' : 'text-ink-muted hover:text-ink',
              )}
            >
              {t.label}
              {t.id === 'REVIEW_REQUIRED' && stats ? <span className="ml-1 tabular-nums text-ink-muted">{stats.awaitingReview}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {state === 'loading' && items.length === 0 ? (
          <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading emails">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : state === 'error' ? (
          <EmptyState
            icon={Inbox}
            title="The event inbox could not be loaded"
            description={error}
            action={
              <Button variant="secondary" onClick={load}>
                Try again
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={tab === 'REVIEW_REQUIRED' ? 'Nothing waiting for review' : 'No emails here'}
            description={
              tab === 'REVIEW_REQUIRED'
                ? 'Emails the workflow is unsure about appear here. Confident events from trusted senders are published automatically.'
                : 'Emails appear here once the n8n workflow is running.'
            }
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Emails processed by the event workflow</caption>
              <thead>
                <tr className="border-b border-line bg-surface-muted text-xs text-ink-secondary">
                  <th scope="col" className="px-4 py-2.5 font-medium">Email</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Status</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">Why</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Received</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((item) => (
                  <tr key={item.id} className="transition-colors duration-fast hover:bg-surface-muted">
                    <td className="max-w-[22rem] px-4 py-3">
                      <p className="truncate font-medium text-ink">{item.extracted?.title || item.subject || '(no subject)'}</p>
                      <p className="truncate text-xs text-ink-muted">{item.senderEmail || 'Unknown sender'}</p>
                      <div className="mt-1 sm:hidden">
                        <Badge tone={STATUS[item.status]?.tone ?? 'neutral'}>{STATUS[item.status]?.label ?? item.status}</Badge>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Badge tone={STATUS[item.status]?.tone ?? 'neutral'}>{STATUS[item.status]?.label ?? item.status}</Badge>
                    </td>
                    <td className="hidden max-w-[18rem] px-4 py-3 text-ink-secondary lg:table-cell">
                      <p className="truncate" title={item.reason || undefined}>{reasonsOf(item)[0] || '—'}</p>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-ink-muted md:table-cell">{formatDateTime(item.receivedAt || item.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant={item.status === 'REVIEW_REQUIRED' ? 'secondary' : 'ghost'} size="sm" onClick={() => open(item)}>
                        {item.status === 'REVIEW_REQUIRED' ? 'Review' : 'Details'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-muted">
            <span>
              Page {page} of {totalPages} · {total} emails
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1 || state === 'loading'} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages || state === 'loading'} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog
        open={!!selected}
        onClose={() => !saving && setSelected(null)}
        dismissible={!saving}
        side="right"
        title={reviewing ? 'Review email' : 'Email details'}
        description={selected?.subject || undefined}
        footer={
          reviewing ? (
            <>
              <Button variant="ghost" className="mr-auto text-danger-700 hover:bg-danger-50 hover:text-danger-800" onClick={() => { setDismissNote(''); setDismissing(selected); }} disabled={saving}>
                Dismiss
              </Button>
              <Button variant="secondary" onClick={() => setSelected(null)} disabled={saving}>
                Cancel
              </Button>
              <Button form="event-inbox-form" type="submit" loading={saving}>
                Publish event
              </Button>
            </>
          ) : (
            <Button onClick={() => setSelected(null)}>Close</Button>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem label="From">{selected.senderEmail || 'Unknown'}</DetailItem>
              <DetailItem label="Received">{formatDateTime(selected.receivedAt || selected.createdAt)}</DetailItem>
              <DetailItem label="Status">
                <Badge tone={STATUS[selected.status]?.tone ?? 'neutral'}>{STATUS[selected.status]?.label ?? selected.status}</Badge>
              </DetailItem>
              <DetailItem label="Trusted sender">{selected.trustedSender ? 'Yes' : 'No'}</DetailItem>
              {selected.confidence !== null && <DetailItem label="AI confidence">{Math.round(selected.confidence * 100)}%</DetailItem>}
              {selected.aiModel && (
                <DetailItem label="AI usage">
                  {selected.aiModel} · {(selected.aiInputTokens ?? 0) + (selected.aiOutputTokens ?? 0)} tokens
                </DetailItem>
              )}
              {selected.reviewedAt && (
                <DetailItem label="Reviewed">
                  {selected.reviewedBy?.name || 'An administrator'}, {formatDateTime(selected.reviewedAt)}
                </DetailItem>
              )}
              {selected.event && (
                <DetailItem label="Calendar event" className="sm:col-span-2">
                  {selected.event.title} · {formatDay(selected.event.date)} {selected.event.time}
                </DetailItem>
              )}
            </dl>

            {reasonsOf(selected).length > 0 && (
              <div className={cn('rounded-xl border px-4 py-3 text-sm', reviewing ? 'border-warning-200 bg-warning-50 text-warning-800' : 'border-line bg-surface-muted text-ink-secondary')}>
                <p className="font-medium">{reviewing ? 'Why this needs a review' : 'Notes'}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {reasonsOf(selected).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {reviewing ? (
              <form
                id="event-inbox-form"
                className="space-y-4"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  publish();
                }}
              >
                <p className="text-sm text-ink-muted">
                  Check the details against the original email. Fill in only what the email states; leave unknown fields empty.
                </p>
                <Field label="Title" htmlFor="ei-title" required>
                  <input id="ei-title" className="cb-input" value={form.title} onChange={set('title')} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Date" htmlFor="ei-date" required>
                    <input id="ei-date" type="date" className="cb-input" value={form.startDate} onChange={set('startDate')} />
                  </Field>
                  <Field label="Ends on" htmlFor="ei-end-date" hint="For events over several days">
                    <input id="ei-end-date" type="date" className="cb-input" value={form.endDate} onChange={set('endDate')} />
                  </Field>
                  <Field label="Starts" htmlFor="ei-start" required>
                    <input id="ei-start" type="time" className="cb-input" value={form.startTime} onChange={set('startTime')} />
                  </Field>
                  <Field label="Ends" htmlFor="ei-end">
                    <input id="ei-end" type="time" className="cb-input" value={form.endTime} onChange={set('endTime')} />
                  </Field>
                </div>
                <Field label="Timezone" htmlFor="ei-tz" hint="IANA name, e.g. Asia/Kolkata">
                  <input id="ei-tz" className="cb-input" value={form.timezone} onChange={set('timezone')} />
                </Field>
                <Field label="Venue" htmlFor="ei-venue" hint="Leave empty if the email doesn’t name one">
                  <input id="ei-venue" className="cb-input" value={form.location} onChange={set('location')} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Organiser" htmlFor="ei-org">
                    <input id="ei-org" className="cb-input" value={form.organizer} onChange={set('organizer')} />
                  </Field>
                  <Field label="Category" htmlFor="ei-cat">
                    <select id="ei-cat" className="cb-input" value={form.category} onChange={set('category')}>
                      <option value="">Not set</option>
                      {EVENT_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Registration link" htmlFor="ei-reg">
                  <input id="ei-reg" type="url" className="cb-input" value={form.registrationUrl} onChange={set('registrationUrl')} placeholder="https://" />
                </Field>
                <Field
                  label="Meeting link"
                  htmlFor="ei-meet"
                  hint={form.meetingUrl && safeExternalUrl(form.meetingUrl) ? meetingProvider(form.meetingUrl) : 'Google Meet, Zoom, Microsoft Teams…'}
                >
                  <input id="ei-meet" type="url" className="cb-input" value={form.meetingUrl} onChange={set('meetingUrl')} placeholder="https://" />
                </Field>
                <Field label="Event page" htmlFor="ei-page">
                  <input id="ei-page" type="url" className="cb-input" value={form.eventUrl} onChange={set('eventUrl')} placeholder="https://" />
                </Field>
                <Field label="Details" htmlFor="ei-desc">
                  <textarea id="ei-desc" rows={4} className="cb-input resize-y" value={form.description} onChange={set('description')} />
                </Field>
                {formError && (
                  <p role="alert" className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800">
                    {formError}
                  </p>
                )}
              </form>
            ) : (
              selected.extracted && (
                <dl className="grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-2">
                  <DetailItem label="Title" className="sm:col-span-2">{selected.extracted.title || '—'}</DetailItem>
                  <DetailItem label="Date">{formatDay(selected.extracted.startDate) || '—'}</DetailItem>
                  <DetailItem label="Time">
                    {[selected.extracted.startTime, selected.extracted.endTime].filter(Boolean).join(' – ') || '—'}
                  </DetailItem>
                  <DetailItem label="Venue">{selected.extracted.location || '—'}</DetailItem>
                  <DetailItem label="Organiser">{selected.extracted.organizer || '—'}</DetailItem>
                  <LinkLine label="Registration link" url={selected.extracted.registrationUrl} />
                  <LinkLine label={`Meeting link (${meetingProvider(selected.extracted.meetingUrl)})`} url={selected.extracted.meetingUrl} />
                  <LinkLine label="Event page" url={selected.extracted.eventUrl} />
                </dl>
              )
            )}
          </div>
        )}
      </Dialog>

      <Dialog
        open={!!dismissing}
        onClose={() => !saving && setDismissing(null)}
        dismissible={!saving}
        size="sm"
        title="Dismiss this email?"
        description="It won’t become an event. The decision is recorded in the audit log."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDismissing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="danger" loading={saving} onClick={dismiss}>
              Dismiss email
            </Button>
          </>
        }
      >
        <Field label="Note" htmlFor="ei-note" hint="Optional, e.g. “Internal meeting”">
          <textarea id="ei-note" rows={2} maxLength={500} className="cb-input resize-y" value={dismissNote} onChange={(e) => setDismissNote(e.target.value)} />
        </Field>
      </Dialog>
    </div>
  );
}
