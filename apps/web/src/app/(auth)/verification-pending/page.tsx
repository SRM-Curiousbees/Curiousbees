'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Check, Copy, FileText, Hourglass, Lock, LogOut, UserPlus } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';

export default function VerificationPendingPage() {
  const router = useRouter();
  const { 
    currentUser, 
    syncUserSession, 
    logout 
  } = useStore();

  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  // Set only in the browser (after the first status check) to avoid a hydration mismatch.
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  // Polling periodically for approval status changes
  useEffect(() => {
    const checkStatus = async () => {
      setLastCheckedAt(new Date());
      const user = await syncUserSession({ force: true });
      if (user) {
        if (user.role === 'INSTITUTE_ADMIN') {
          router.replace('/admin/dashboard');
          return;
        }

        if ((user.role as string) === 'RESEARCH_SUPERVISOR' || (user.role as string) === 'SUPERVISOR') {
          router.replace('/feed');
          return;
        }

        if (user.role === 'RESEARCH_SCHOLAR' && user.status === 'ACTIVE' && user.approved && user.supervisorId) {
          router.replace('/feed');
          return;
        }
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, [syncUserSession, router]);

  const isSupervisorPending = currentUser?.role === 'RESEARCH_SUPERVISOR';
  const latestRequest = requests[0];
  const isRejected = currentUser?.status === 'REJECTED' || latestRequest?.status === 'REJECTED';
  const isNoSupervisorAssigned = !isSupervisorPending && !latestRequest && currentUser?.role === 'RESEARCH_SCHOLAR' && !currentUser?.supervisorId;

  // Fetch current scholar supervision request details
  useEffect(() => {
    if (currentUser?.role === 'RESEARCH_SCHOLAR') {
      const fetchRequest = async () => {
        setLoadingRequests(true);
        try {
          const { apiFetch } = await import('@/lib/api-client');
          const res = await apiFetch('/api/supervisor-requests');
          if (res.ok) {
            const data = await res.json();
            setRequests(data);
          }
        } catch (e) {
          console.error('Failed to load supervisor requests:', e);
        } finally {
          setLoadingRequests(false);
        }
      };
      fetchRequest();
    }
  }, [currentUser]);

  const handleCancelRequest = async () => {
    if (!latestRequest?.id) return;
    setCancelling(true);
    try {
      const { apiFetch } = await import('@/lib/api-client');
      const res = await apiFetch(`/api/supervisor-requests/${latestRequest.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await apiFetch('/api/users/onboarding/reset', { method: 'POST' }).catch(() => {});
        await syncUserSession({ force: true });
        setShowCancelModal(false);
        router.replace('/onboarding');
      }
    } catch (e) {
      console.error('Failed to cancel request:', e);
    } finally {
      setCancelling(false);
    }
  };

  const handleSelectAnotherSupervisor = async () => {
    try {
      const { apiFetch } = await import('@/lib/api-client');
      await apiFetch('/api/users/onboarding/reset', { method: 'POST' }).catch(() => {});
      await syncUserSession({ force: true });
      router.replace('/onboarding');
    } catch (e) {
      console.error('Failed to reset onboarding:', e);
      router.replace('/onboarding');
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const state = isRejected ? 'rejected' : isNoSupervisorAssigned ? 'choose' : isSupervisorPending ? 'admin' : 'supervisor';
  const COPY = {
    rejected: {
      badge: { tone: 'danger' as const, label: 'Request declined or withdrawn' },
      title: 'Choose another supervisor',
      body: 'Your supervision request was not approved or was withdrawn. Select another supervisor from your faculty to send a new request.',
    },
    choose: {
      badge: { tone: 'brand' as const, label: 'Supervisor not selected' },
      title: 'Select your research supervisor',
      body: 'Pick a supervisor from your department. Your CuriousBees workspace opens as soon as they approve your request.',
    },
    admin: {
      badge: { tone: 'warning' as const, label: 'Under review' },
      title: 'Your account is being reviewed',
      body: 'The research office is confirming your supervisor account. You will get access as soon as it is approved.',
    },
    supervisor: {
      badge: { tone: 'warning' as const, label: 'Awaiting supervisor' },
      title: 'Waiting for your supervisor',
      body: 'Your request has been sent. You will be taken into CuriousBees automatically once your supervisor approves it.',
    },
  }[state];

  const steps = [
    { label: 'Request sent', done: true },
    { label: state === 'admin' ? 'Research office review' : 'Supervisor review', current: true },
    { label: 'Access to CuriousBees', done: false },
  ];

  return (
    <div className="honeycomb-bg flex min-h-dvh flex-col bg-canvas px-4 py-6 sm:px-6">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Logo showText size={30} />
        <Button variant="ghost" size="sm" onClick={() => { logout(); router.push('/login'); }}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      </header>

      <main id="main-content" className="mx-auto my-auto w-full max-w-lg py-10">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <Badge tone={COPY.badge.tone}>{COPY.badge.label}</Badge>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">{COPY.title}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">{COPY.body}</p>

          {state === 'supervisor' && latestRequest?.supervisor && (
            <section aria-label="Your supervisor" className="mt-6 rounded-xl border border-line p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-800 ring-1 ring-brand-100">
                  {latestRequest.supervisor.name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{latestRequest.supervisor.name}</p>
                  <p className="truncate text-sm text-ink-muted">{latestRequest.supervisor.department || 'Faculty supervisor'}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <a href={`mailto:${latestRequest.supervisor.email}`} className="truncate text-sm font-medium text-brand hover:underline">
                      {latestRequest.supervisor.email}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyEmail(latestRequest.supervisor.email)}
                      aria-label={copiedEmail ? 'Email copied' : 'Copy email address'}
                      className="flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-100 hover:text-ink"
                    >
                      {copiedEmail ? <Check className="size-3.5 text-success-600" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="shrink-0 text-xs text-ink-muted">
                  Sent {new Date(latestRequest.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-3">
                <Button variant="secondary" size="sm" onClick={() => setShowDetailsModal(true)}>
                  <FileText aria-hidden />
                  View request
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowCancelModal(true)} disabled={cancelling} className="text-danger-700 hover:bg-danger-50 hover:text-danger-800">
                  Withdraw request
                </Button>
              </div>
            </section>
          )}

          {(state === 'supervisor' || state === 'admin') && (
            <ol className="mt-6 space-y-3" aria-label="Progress">
              {steps.map((step) => (
                <li key={step.label} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                      step.done ? 'border-success-600 bg-success text-white' : step.current ? 'border-warning-400 bg-warning-50 text-warning-700' : 'border-line-strong bg-surface text-ink-muted'
                    }`}
                  >
                    {step.done ? <Check className="size-3.5" aria-hidden /> : step.current ? <Hourglass className="size-3.5" aria-hidden /> : <Lock className="size-3" aria-hidden />}
                  </span>
                  <span className={step.done || step.current ? 'font-medium text-ink' : 'text-ink-muted'}>
                    {step.label}
                    {step.current && <span className="sr-only"> (in progress)</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {(state === 'rejected' || state === 'choose') && (
            <Button size="lg" className="mt-6 w-full" onClick={handleSelectAnotherSupervisor}>
              <UserPlus aria-hidden />
              Select a supervisor
            </Button>
          )}

          {(state === 'supervisor' || state === 'admin') && (
            <p className="mt-6 border-t border-line pt-4 text-xs text-ink-muted" aria-live="polite">
              This page checks for updates automatically.
              {lastCheckedAt && <> Last checked {lastCheckedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</>}
            </p>
          )}
        </div>
      </main>

      <Dialog
        open={showDetailsModal && !!latestRequest}
        onClose={() => setShowDetailsModal(false)}
        title="Supervision request"
        footer={<Button onClick={() => setShowDetailsModal(false)}>Close</Button>}
      >
        <dl className="divide-y divide-line rounded-xl border border-line text-sm">
          {[
            ['Supervisor', <>{latestRequest?.supervisor?.name}<span className="block text-ink-muted">{latestRequest?.supervisor?.email}</span></>],
            ['Department', latestRequest?.supervisor?.department || 'Not specified'],
            ['Status', <StatusBadge key="s" status={latestRequest?.status} />],
            ['Sent', latestRequest ? new Date(latestRequest.createdAt).toLocaleString() : ''],
            ['Reference', <span key="r" className="font-mono text-xs">{latestRequest?.id}</span>],
          ].map(([label, value], i) => (
            <div key={i} className="grid grid-cols-[110px_1fr] gap-3 px-4 py-3">
              <dt className="text-ink-muted">{label}</dt>
              <dd className="min-w-0 break-words font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Dialog>

      <Dialog
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        dismissible={!cancelling}
        size="sm"
        title="Withdraw this request?"
        description={<>Your request to {latestRequest?.supervisor?.name || 'this supervisor'} will be withdrawn and you can choose another supervisor.</>}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCancelModal(false)} disabled={cancelling}>Keep request</Button>
            <Button variant="danger" onClick={handleCancelRequest} loading={cancelling}>Withdraw request</Button>
          </>
        }
      />
    </div>
  );
}
