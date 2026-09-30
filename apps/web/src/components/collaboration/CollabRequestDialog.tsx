'use client';

import { useEffect, useId, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

/**
 * Asks a researcher to collaborate, with an editable message. Used from posts
 * (with the post as context) and from researcher profiles.
 */
export function CollabRequestDialog({
  open,
  onClose,
  recipientId,
  recipientName,
  threadId,
  defaultMessage,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  threadId?: string;
  defaultMessage: string;
  onSent?: () => void;
}) {
  const sendCollabRequest = useStore((s) => s.sendCollabRequest);
  const addToast = useStore((s) => s.addToast);
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const formId = useId();

  useEffect(() => {
    if (open) setMessage(defaultMessage);
  }, [open, defaultMessage]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await sendCollabRequest(recipientId, threadId, message.trim());
      addToast(`Collaboration request sent to ${recipientName}.`, 'success');
      onClose();
      onSent?.();
    } catch (err: any) {
      addToast(err?.message || 'The collaboration request could not be sent.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!sending}
      title={`Collaborate with ${recipientName}`}
      description="They'll see your message and can accept or decline. Accepting opens a shared conversation in Curious Nexus."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={sending} disabled={!message.trim()}>
            Send request
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit}>
        <Field label="Message" htmlFor={`${formId}-msg`} required>
          <textarea id={`${formId}-msg`} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="cb-input resize-y" />
        </Field>
      </form>
    </Dialog>
  );
}
