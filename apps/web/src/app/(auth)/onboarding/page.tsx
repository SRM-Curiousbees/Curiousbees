'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2, LogOut, Search, User, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiFetch, readApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { RESEARCH_DOMAINS } from '@/lib/research-domains';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Field, DetailItem } from '@/components/ui/field';

type Option = { id: string; name: string; facultyId?: string };
type SupervisorOption = {
  id: string;
  name: string;
  designation?: string;
  researchArea?: string;
  currentScholars: number;
  maxScholars: number;
  isAtCapacity?: boolean;
};

/**
 * First sign-in for administrator-created accounts: research areas, then
 * department (unless an administrator already set it) and, for scholars, a supervisor.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { currentUser, syncUserSession, logout } = useStore();

  const isSupervisor = String(currentUser?.role || '').includes('SUPERVISOR');
  const assignedDepartmentId = currentUser?.departmentId || '';

  const [step, setStep] = useState<1 | 2>(1);
  const [domains, setDomains] = useState<string[]>([]);
  const [domainQuery, setDomainQuery] = useState('');
  const [scholarTopic, setScholarTopic] = useState('');
  const [scholarProposalTitle, setScholarProposalTitle] = useState('');

  const [faculties, setFaculties] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [facultyId, setFacultyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assignedDept, setAssignedDept] = useState<Option | null>(null);

  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [supervisorId, setSupervisorId] = useState('');
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // People who have finished onboarding go to where their account status sends them.
  useEffect(() => {
    if (!currentUser?.onboardingCompleted) return;
    if (isSupervisor && !currentUser.departmentId) return;
    if (currentUser.role === 'INSTITUTE_ADMIN') router.replace('/admin/dashboard');
    else if (currentUser.role === 'RESEARCH_SCHOLAR')
      router.replace(currentUser.approved && currentUser.supervisorId && currentUser.status === 'ACTIVE' ? '/feed' : '/verification-pending');
    else if (currentUser.role === 'RESEARCH_SUPERVISOR')
      router.replace(currentUser.approved && currentUser.status === 'ACTIVE' ? '/supervisor' : '/verification-pending');
    else router.replace('/verification-pending');
  }, [currentUser, isSupervisor, router]);

  // The department an administrator assigned, with its faculty.
  useEffect(() => {
    if (!assignedDepartmentId) return;
    apiFetch(`/api/departments/${assignedDepartmentId}`, { skipAuth: true })
      .then((res) => (res.ok ? res.json() : null))
      .then((dept) => {
        if (dept?.id) {
          setAssignedDept({ id: dept.id, name: dept.name, facultyId: dept.facultyId });
          setDepartmentId(dept.id);
          setFacultyId(dept.facultyId || '');
        }
      })
      .catch(() => {});
  }, [assignedDepartmentId]);

  // Otherwise the person chooses faculty, then department.
  useEffect(() => {
    if (assignedDepartmentId) return;
    apiFetch('/api/faculties', { skipAuth: true })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setFaculties(Array.isArray(data) ? data : []))
      .catch(() => setError('Faculties could not be loaded. Refresh the page to try again.'));
  }, [assignedDepartmentId]);

  useEffect(() => {
    if (assignedDepartmentId) return;
    setDepartments([]);
    setDepartmentId('');
    if (!facultyId) return;
    apiFetch(`/api/departments?facultyId=${encodeURIComponent(facultyId)}`, { skipAuth: true })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => setError('Departments could not be loaded. Refresh the page to try again.'));
  }, [facultyId, assignedDepartmentId]);

  // Scholars pick a supervisor from their department.
  useEffect(() => {
    setSupervisors([]);
    setSupervisorId('');
    if (isSupervisor || !facultyId || !departmentId) return;
    setLoadingSupervisors(true);
    apiFetch(`/api/supervisors?facultyId=${encodeURIComponent(facultyId)}&departmentId=${encodeURIComponent(departmentId)}`, { skipAuth: true })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setSupervisors(Array.isArray(data) ? data : []))
      .catch(() => setSupervisors([]))
      .finally(() => setLoadingSupervisors(false));
  }, [isSupervisor, facultyId, departmentId]);

  const filteredDomains = useMemo(() => {
    const q = domainQuery.trim().toLowerCase();
    return q ? RESEARCH_DOMAINS.filter((d) => d.toLowerCase().includes(q)) : RESEARCH_DOMAINS;
  }, [domainQuery]);

  const toggleDomain = (d: string) => setDomains((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const canSubmit =
    domains.length > 0 &&
    (isSupervisor || scholarTopic.trim().length > 0) &&
    !!facultyId &&
    !!departmentId &&
    (isSupervisor || !!supervisorId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const researchArea = domains.join(', ');
      const payload = isSupervisor
        ? { facultyId, departmentId, researchArea }
        : {
            facultyId,
            departmentId,
            researchArea: domains[0] || researchArea,
            researchDomain: domains[0] || researchArea,
            researchTopic: scholarTopic.trim(),
            proposalTitle: scholarProposalTitle.trim() || scholarTopic.trim(),
            supervisorId,
          };
      const res = await apiFetch(isSupervisor ? '/api/users/onboarding/supervisor' : '/api/users/onboarding/scholar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await readApiError(res)) || 'Your profile could not be saved.');
      await syncUserSession({ force: true });
      router.replace(isSupervisor ? '/supervisor' : '/verification-pending');
    } catch (err: any) {
      setError(err?.message || 'Your profile could not be saved.');
      setSubmitting(false);
    }
  };

  const facultyName = faculties.find((f) => f.id === facultyId)?.name || currentUser?.faculty || '';

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
        <Logo size={30} showText />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            logout();
            router.push('/login');
          }}
        >
          <LogOut aria-hidden />
          Sign out
        </Button>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-ink-muted">Step {step} of 2</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {currentUser?.name ? `Welcome, ${currentUser.name.trim()}` : 'Set up your profile'}
        </h1>
        <p className="mt-2 text-base text-ink-secondary">
          {isSupervisor
            ? 'Tell us what you research so scholars and colleagues can find you.'
            : 'Tell us what you research and who you’d like to supervise you.'}
        </p>

        <ol className="mt-6 grid grid-cols-2 gap-2" aria-label="Progress">
          {[
            { n: 1, label: isSupervisor ? 'Supervisory domains' : 'Domain & thesis topic' },
            { n: 2, label: isSupervisor ? 'Department' : 'Department & supervisor' },
          ].map((s) => (
            <li key={s.n} aria-current={step === s.n ? 'step' : undefined}>
              <div className={cn('h-1 rounded-full', step >= s.n ? 'bg-brand' : 'bg-neutral-200')} />
              <p className={cn('mt-2 text-sm', step === s.n ? 'font-medium text-ink' : 'text-ink-muted')}>{s.label}</p>
            </li>
          ))}
        </ol>

        {error && (
          <p role="alert" className="mt-6 flex items-start gap-2.5 rounded-xl border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-xs sm:p-6">
          {step === 1 ? (
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    {isSupervisor ? 'Choose your supervisory research domains' : 'Select your research domain & thesis topic'}
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {isSupervisor
                      ? 'Pick the broad research domains, laboratory themes, and fields in which you supervise scholars.'
                      : 'Supervisors guide scholars on different topics. Select your broader research domain, then specify your distinct thesis topic.'}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-ink-muted" aria-live="polite">
                  {domains.length} selected
                </span>
              </div>

              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
                <input
                  type="search"
                  value={domainQuery}
                  onChange={(e) => setDomainQuery(e.target.value)}
                  placeholder={`Search ${RESEARCH_DOMAINS.length} research domains`}
                  aria-label="Search research domains"
                  className="cb-input pl-9"
                />
              </div>

              {domains.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Selected research domains">
                  {domains.map((d) => (
                    <li key={d}>
                      <button
                        type="button"
                        onClick={() => toggleDomain(d)}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-2.5 pr-1.5 text-sm text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-100"
                        aria-label={`Remove ${d}`}
                      >
                        {d}
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-line p-1.5">
                {filteredDomains.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-ink-muted">No research domains match “{domainQuery}”.</p>
                ) : (
                  <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {filteredDomains.map((d) => {
                      const on = domains.includes(d);
                      return (
                        <li key={d}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              if (!isSupervisor) {
                                // Scholars select their primary domain
                                setDomains([d]);
                              } else {
                                toggleDomain(d);
                              }
                            }}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-fast',
                              on ? 'bg-brand-50 text-brand-800' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
                            )}
                          >
                            <span
                              className={cn(
                                'flex size-4 shrink-0 items-center justify-center rounded border',
                                on ? 'border-brand-600 bg-brand text-white' : 'border-line-strong bg-surface',
                              )}
                              aria-hidden
                            >
                              {on && <Check className="size-3" />}
                            </span>
                            {d}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {!isSupervisor && (
                <div className="mt-6 space-y-4 border-t border-line pt-5">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Your Specific Research Topic</h3>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Every scholar conducts research on a specialized topic under their supervisor. Enter your thesis focus below.
                    </p>
                  </div>
                  <Field
                    label="Doctoral Thesis / Research Topic"
                    htmlFor="ob-scholar-topic"
                    required
                    hint="e.g. Low-Bit Quantization for Edge Vision Transformers, or Fault-Tolerant Consensus in Geo-Distributed Clusters"
                  >
                    <input
                      id="ob-scholar-topic"
                      type="text"
                      value={scholarTopic}
                      onChange={(e) => setScholarTopic(e.target.value)}
                      placeholder="e.g. Fault-Tolerant Consensus in Geo-Distributed Clusters"
                      className="cb-input"
                      required
                    />
                  </Field>
                  <Field
                    label="Working Dissertation Title"
                    htmlFor="ob-scholar-title"
                    hint="Optional. A working or tentative title for your thesis proposal."
                  >
                    <input
                      id="ob-scholar-title"
                      type="text"
                      value={scholarProposalTitle}
                      onChange={(e) => setScholarProposalTitle(e.target.value)}
                      placeholder="e.g. Energy-Efficient and Fault-Tolerant Distributed Architectures for Edge AI"
                      className="cb-input"
                    />
                  </Field>
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <Button onClick={() => setStep(2)} disabled={domains.length === 0 || (!isSupervisor && !scholarTopic.trim())}>
                  Continue
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="text-base font-semibold text-ink">{isSupervisor ? 'Your department' : 'Department and supervisor'}</h2>

              {assignedDepartmentId ? (
                <dl className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-line bg-surface-muted p-4 sm:grid-cols-2">
                  <DetailItem label="Faculty">{currentUser?.faculty || facultyName || '…'}</DetailItem>
                  <DetailItem label="Department">{assignedDept?.name || currentUser?.department || '…'}</DetailItem>
                  <p className="text-xs text-ink-muted sm:col-span-2">Set by your institute administrator.</p>
                </dl>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Faculty" htmlFor="ob-faculty" required>
                    <select id="ob-faculty" value={facultyId} onChange={(e) => setFacultyId(e.target.value)} className="cb-input">
                      <option value="">Choose a faculty</option>
                      {faculties.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Department" htmlFor="ob-department" required>
                    <select
                      id="ob-department"
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      disabled={!facultyId}
                      className="cb-input"
                    >
                      <option value="">{facultyId ? 'Choose a department' : 'Choose a faculty first'}</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {!isSupervisor && (
                <fieldset className="mt-6">
                  <legend className="text-sm font-medium text-ink">
                    Supervisor
                    <span className="ml-0.5 text-danger-600" aria-hidden>
                      *
                    </span>
                  </legend>
                  <p className="mt-0.5 text-sm text-ink-muted">They’ll get your request and approve it before you can use the portal.</p>
                  <div className="mt-3">
                    {!departmentId ? (
                      <p className="rounded-xl border border-line bg-surface-muted px-4 py-6 text-center text-sm text-ink-muted">
                        Choose your department to see its supervisors.
                      </p>
                    ) : loadingSupervisors ? (
                      <p className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-ink-muted">
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Loading supervisors…
                      </p>
                    ) : supervisors.length === 0 ? (
                      <p className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800">
                        No supervisors are registered in this department yet. Ask your institute administrator to add one.
                      </p>
                    ) : (
                      <ul role="radiogroup" aria-label="Supervisor" className="max-h-72 space-y-1.5 overflow-y-auto">
                        {supervisors.map((sup) => {
                          const full = sup.isAtCapacity ?? sup.currentScholars >= sup.maxScholars;
                          const selected = supervisorId === sup.id;
                          return (
                            <li key={sup.id}>
                              <button
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                disabled={full}
                                onClick={() => setSupervisorId(sup.id)}
                                className={cn(
                                  'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-60',
                                  selected ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-line hover:border-line-strong',
                                )}
                              >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-muted">
                                  <User className="size-4" aria-hidden />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-ink">{sup.name}</span>
                                  <span className="block truncate text-xs text-ink-muted">
                                    {[sup.designation, `${sup.currentScholars} of ${sup.maxScholars} places taken`].filter(Boolean).join(' · ')}
                                  </span>
                                  {sup.researchArea && (
                                    <span className="mt-0.5 block truncate text-xs font-medium text-brand">
                                      Guides in: {sup.researchArea}
                                    </span>
                                  )}
                                </span>
                                {full ? (
                                  <span className="shrink-0 text-xs text-ink-muted">Full</span>
                                ) : (
                                  selected && <Check className="size-4 shrink-0 text-brand" aria-hidden />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </fieldset>
              )}

              <div className="mt-6 rounded-xl border border-line bg-surface-muted p-3 text-sm text-ink-muted">
                {isSupervisor ? (
                  <p>
                    Supervisory domains: <span className="font-medium text-ink-secondary">{domains.join(', ')}</span>
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p>
                      Domain: <span className="font-medium text-ink-secondary">{domains[0] || domains.join(', ')}</span>
                    </p>
                    {scholarTopic && (
                      <p>
                        Your thesis topic: <span className="font-medium text-brand">{scholarTopic}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button variant="secondary" onClick={() => setStep(1)} disabled={submitting}>
                  <ArrowLeft aria-hidden />
                  Back
                </Button>
                <Button type="submit" loading={submitting} disabled={!canSubmit}>
                  {isSupervisor ? 'Finish setup' : 'Send request and finish'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
