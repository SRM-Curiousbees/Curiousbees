'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, CheckCircle2, FileQuestion, Mail, User, XCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiFetch, readApiError } from '@/lib/api-client';
import { handleAvatarError } from '@/lib/avatar';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Field, DetailItem } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

function formatDateTime(value?: string | Date | null) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime())
    ? d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
}

export default function SupervisorRequestReviewPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params?.id as string;
  const { currentUser, addToast } = useStore();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!requestId) return;
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await apiFetch(`/api/supervisor-requests/${requestId}`);
        if (!active) return;
        if (res.ok) {
          setRequest(await res.json());
        } else if (res.status === 401) {
          router.push(`/login?redirectTo=${encodeURIComponent(`/supervisor/requests/${requestId}`)}`);
        } else if (res.status === 403) {
          setLoadError('This request belongs to another supervisor, so you can’t open it.');
        } else if (res.status === 404) {
          setLoadError('This request no longer exists. The scholar may have withdrawn it.');
        } else {
          setLoadError('The request could not be loaded.');
        }
      } catch {
        if (active) setLoadError('The server could not be reached. Check your connection and try again.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [requestId, router]);

  const decide = async (decision: 'approve' | 'reject') => {
    setProcessing(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/supervisor-requests/${requestId}/${decision}`, {
        method: 'PUT',
        ...(decision === 'reject'
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rejectionReason: rejectionReason.trim() || undefined }) }
          : {}),
      });
      if (!res.ok) {
        throw new Error((await readApiError(res)) || `The request could not be ${decision === 'approve' ? 'accepted' : 'declined'}.`);
      }
      const updated = await res.json();
      // The response carries the request only; keep the scholar details already loaded.
      setRequest((prev: any) => ({ ...prev, ...updated, scholar: prev?.scholar, supervisor: prev?.supervisor }));
      addToast(decision === 'approve' ? 'Scholar accepted.' : 'Request declined.', decision === 'approve' ? 'success' : 'info');
      setConfirm(null);
    } catch (err: any) {
      setActionError(err?.message || 'Something went wrong.');
      setConfirm(null);
    } finally {
      setProcessing(false);
    }
  };

  const isSupervisorOfRequest = !!request && request.supervisorId === currentUser?.id;
  const backHref = isSupervisorOfRequest || currentUser?.role === 'RESEARCH_SUPERVISOR' ? '/my-scholars?tab=requests' : '/my-research';
  const backLabel = backHref === '/my-research' ? 'My research' : 'Supervision requests';

  const backLink = (
    <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-ink-muted transition-colors duration-fast hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden />
      {backLabel}
    </Link>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl" aria-busy="true" aria-label="Loading request">
        <Skeleton className="mb-6 h-4 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-48" />
        <Skeleton className="mt-8 h-48 rounded-2xl" />
        <Skeleton className="mt-6 h-40 rounded-2xl" />
      </div>
    );
  }

  if (loadError || !request) {
    return (
      <div className="mx-auto max-w-3xl">
        {backLink}
        <Card>
          <EmptyState
            icon={FileQuestion}
            title="Request unavailable"
            description={loadError || 'The request could not be loaded.'}
            action={
              <Link href={backHref} className={buttonVariants()}>
                Back to {backLabel.toLowerCase()}
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const scholar = request.scholar || {};
  const scholarName = scholar.name || scholar.email || 'Scholar';
  const status: string = request.status || 'PENDING';
  const pending = status === 'PENDING';
  const hasProposal = request.proposalTitle || request.researchDomain || request.researchTopic || request.message;

  return (
    <div className="mx-auto max-w-3xl">
      {backLink}

      <PageHeader
        meta="Supervision request"
        title={scholarName}
        description={`Asked ${formatDateTime(request.createdAt)}${request.supervisor?.name && !isSupervisorOfRequest ? ` · to ${request.supervisor.name}` : ''}`}
        actions={<StatusBadge status={status} />}
      />

      <div className="space-y-6">
        {actionError && (
          <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800">
            {actionError}
          </p>
        )}

        {/* Outcome */}
        {status === 'APPROVED' && (
          <div className="flex gap-3 rounded-2xl border border-success-200 bg-success-50 p-5">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-700" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-success-800">
                {isSupervisorOfRequest ? `You supervise ${scholarName} now.` : 'This request was accepted.'}
              </p>
              {request.respondedAt && <p className="mt-0.5 text-sm text-success-700">Accepted {formatDateTime(request.respondedAt)}</p>}
              {isSupervisorOfRequest && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/my-scholars" className={buttonVariants({ size: 'sm' })}>
                    Open supervision panel
                  </Link>
                  {scholar.id && (
                    <Link href={`/researchers/${scholar.id}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                      View profile
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {status === 'REJECTED' && (
          <div className="flex gap-3 rounded-2xl border border-line bg-surface-muted p-5">
            <XCircle className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">This request was declined.</p>
              {request.respondedAt && <p className="mt-0.5 text-sm text-ink-muted">{formatDateTime(request.respondedAt)}</p>}
              {request.rejectionReason && <p className="mt-2 whitespace-pre-line text-sm text-ink-secondary">Reason: {request.rejectionReason}</p>}
            </div>
          </div>
        )}

        <Card>
          <CardHeader
            title="Scholar"
            actions={
              scholar.id && (
                <Link href={`/researchers/${scholar.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                  View profile
                </Link>
              )
            }
          />
          <CardBody>
            <div className="flex items-center gap-4">
              {scholar.image ? (
                <img
                  src={scholar.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(e) => handleAvatarError(e, scholarName)}
                  className="size-14 shrink-0 rounded-full border border-line object-cover"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-muted">
                  <User className="size-6" aria-hidden />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-ink">{scholarName}</p>
                {scholar.email && (
                  <a href={`mailto:${scholar.email}`} className="inline-flex max-w-full items-center gap-1.5 truncate text-sm text-ink-muted hover:text-brand">
                    <Mail className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{scholar.email}</span>
                  </a>
                )}
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem label="Department">{scholar.department || 'Not set'}</DetailItem>
              <DetailItem label="Faculty">{scholar.faculty || 'Not set'}</DetailItem>
              {scholar.scholarProfile?.researchArea && <DetailItem label="Research area">{scholar.scholarProfile.researchArea}</DetailItem>}
              {scholar.employeeId && <DetailItem label="ID number">{scholar.employeeId}</DetailItem>}
            </dl>
            {scholar.bio && <p className="mt-5 whitespace-pre-line border-t border-line pt-4 text-sm text-ink-secondary">{scholar.bio}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Proposal" />
          <CardBody>
            {hasProposal ? (
              <div className="space-y-4">
                {(request.proposalTitle || request.researchDomain || request.researchTopic) && (
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {request.proposalTitle && <DetailItem label="Working title" className="sm:col-span-2">{request.proposalTitle}</DetailItem>}
                    {request.researchDomain && <DetailItem label="Domain">{request.researchDomain}</DetailItem>}
                    {request.researchTopic && <DetailItem label="Topic">{request.researchTopic}</DetailItem>}
                  </dl>
                )}
                {request.message && (
                  <div>
                    <p className="text-xs text-ink-muted">Message</p>
                    <blockquote className="mt-1 whitespace-pre-line border-l-2 border-line-strong pl-3 text-sm text-ink-secondary">{request.message}</blockquote>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">The scholar didn’t include a proposal or message.</p>
            )}
          </CardBody>
        </Card>

        {pending &&
          (isSupervisorOfRequest ? (
            <Card>
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-secondary">
                  Accepting makes you {scholarName}’s research supervisor. Declining lets them ask someone else.
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button variant="secondary" onClick={() => setConfirm('reject')} disabled={processing}>
                    Decline
                  </Button>
                  <Button onClick={() => setConfirm('approve')} disabled={processing}>
                    <Check aria-hidden />
                    Accept
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <p className="text-sm text-ink-muted">
              Waiting for {request.supervisor?.name || 'the supervisor'} to respond.
            </p>
          ))}
      </div>

      <Dialog
        open={confirm === 'approve'}
        onClose={() => setConfirm(null)}
        dismissible={!processing}
        size="sm"
        title={`Accept ${scholarName}?`}
        description="You’ll become their research supervisor and can review their progress reports. This counts towards your scholar capacity."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={() => decide('approve')} loading={processing}>
              Accept scholar
            </Button>
          </>
        }
      />

      <Dialog
        open={confirm === 'reject'}
        onClose={() => setConfirm(null)}
        dismissible={!processing}
        title="Decline this request?"
        description={`${scholarName} will be told the request was declined and can ask another supervisor.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => decide('reject')} loading={processing}>
              Decline request
            </Button>
          </>
        }
      >
        <Field label="Reason" htmlFor="reject-reason" hint="Optional. Shared with the scholar, e.g. no capacity this year or a different research focus.">
          <textarea
            id="reject-reason"
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="cb-input resize-y"
          />
        </Field>
      </Dialog>
    </div>
  );
}
