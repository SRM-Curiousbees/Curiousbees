'use client';

import { useState } from 'react';
import { Thread } from '@curiousbees/types';
import { useStore } from '@/store/useStore';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { cn } from '@/lib/utils';

interface ReportPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: Thread;
}

const REPORT_REASONS = ['Spam', 'Harassment', 'False Information', 'Copyright Violation', 'Inappropriate Content', 'Other'];

export default function ReportPostModal({ isOpen, onClose, thread }: ReportPostModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reportThread = useStore((state) => state.reportThread);
  const addToast = useStore((state) => state.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await reportThread(thread.id, reason, description);
      addToast('Report sent. The post is now flagged for institute administrators.', 'success');
      setReason(REPORT_REASONS[0]);
      setDescription('');
      onClose();
    } catch (error: any) {
      addToast(error?.message || 'The report could not be sent.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      dismissible={!isSubmitting}
      title="Report this post"
      description="Reported posts are flagged for institute administrators, who can hide them. The author isn't told who reported it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="report-post-form" variant="danger" loading={isSubmitting}>
            Send report
          </Button>
        </>
      }
    >
      <form id="report-post-form" onSubmit={handleSubmit} className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Reason</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REPORT_REASONS.map((r) => (
              <label
                key={r}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors duration-fast',
                  reason === r ? 'border-danger-300 bg-danger-50 text-danger-800' : 'border-line text-ink-secondary hover:border-line-strong',
                )}
              >
                <input
                  type="radio"
                  name="report_reason"
                  value={r}
                  checked={reason === r}
                  onChange={(e) => setReason(e.target.value)}
                  className="size-4 accent-[rgb(var(--danger-solid))]"
                />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Details" htmlFor="report-details" hint="Optional. Anything that helps a reviewer understand the problem.">
          <textarea id="report-details" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="cb-input resize-y" />
        </Field>
      </form>
    </Dialog>
  );
}
