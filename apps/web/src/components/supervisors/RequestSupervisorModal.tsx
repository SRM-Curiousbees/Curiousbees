'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiFetch } from '@/lib/api-client';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

interface RequestSupervisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  supervisor: {
    id: string;
    name?: string | null;
    department?: string | null;
    faculty?: string | null;
    supervisorProfile?: {
      researchArea?: string | null;
      institution?: string | null;
      campus?: string | null;
    } | null;
  };
  onSuccess?: () => void;
}

/** A scholar asks a supervisor to supervise their research. The supervisor approves or declines it. */
export function RequestSupervisorModal({ isOpen, onClose, supervisor, onSuccess }: RequestSupervisorModalProps) {
  const { requestSupervisor } = useStore();
  const [message, setMessage] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [researchDomain, setResearchDomain] = useState('');
  const [researchTopic, setResearchTopic] = useState('');
  const [availableDomains, setAvailableDomains] = useState<{ id: string; name: string; topics: { id: string; name: string }[] }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    apiFetch('/api/research-domains')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableDomains(data);
          setResearchDomain(data[0].name);
          if (data[0].topics && data[0].topics.length > 0) setResearchTopic(data[0].topics[0].name);
        }
      })
      .catch(() => {});
  }, []);

  const handleDomainChange = (domainName: string) => {
    setResearchDomain(domainName);
    const domainObj = availableDomains.find((d) => d.name === domainName);
    setResearchTopic(domainObj?.topics?.[0]?.name ?? '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await requestSupervisor(supervisor.id, message, {
        proposalTitle: proposalTitle.trim() || undefined,
        researchDomain: researchDomain.trim() || undefined,
        researchTopic: researchTopic.trim() || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'The request could not be sent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const topics = availableDomains.find((d) => d.name === researchDomain)?.topics ?? [];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      dismissible={!isSubmitting}
      size="lg"
      title={`Request supervision${supervisor.name ? ` from ${supervisor.name}` : ''}`}
      description={
        [supervisor.department, supervisor.faculty].filter(Boolean).join(' · ') ||
        'They will see your proposal and message, and can approve or decline the request.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="supervision-request-form" loading={isSubmitting}>
            <Send aria-hidden />
            Send request
          </Button>
        </>
      }
    >
      <form id="supervision-request-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {errorMessage}
          </p>
        )}
        {supervisor.supervisorProfile?.researchArea && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-800 block">Supervisor&apos;s Guided Domains & Lab Focus</span>
            <span className="font-medium text-brand-900 mt-0.5 block">{supervisor.supervisorProfile.researchArea}</span>
          </div>
        )}

        <Field label="Proposed research title" htmlFor="sr-title" hint="A working title for your thesis proposal.">
          <input id="sr-title" type="text" value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} placeholder="e.g. Robust Edge Architectures for Distributed AI" className="cb-input" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Research domain" htmlFor="sr-domain">
            <select id="sr-domain" value={researchDomain} onChange={(e) => handleDomainChange(e.target.value)} className="cb-input">
              {availableDomains.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Specific thesis topic" htmlFor="sr-topic" hint="Your distinct research topic under this domain.">
            <input
              id="sr-topic"
              type="text"
              value={researchTopic}
              onChange={(e) => setResearchTopic(e.target.value)}
              placeholder="e.g. Low-Bit Quantization for Edge Vision Transformers"
              list="common-topics"
              className="cb-input"
              required
            />
            <datalist id="common-topics">
              {topics.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label="Message" htmlFor="sr-message" hint="Why you'd like to work with this supervisor, and your research background.">
          <textarea id="sr-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="cb-input resize-y" />
        </Field>
      </form>
    </Dialog>
  );
}
