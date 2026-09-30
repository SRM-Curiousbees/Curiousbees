'use client';

import { useState, useEffect } from 'react';
import { Thread } from '@curiousbees/types';
import { useStore } from '@/store/useStore';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: Thread;
  /** Receives the saved post, for pages that hold their own copy. */
  onSaved?: (thread: any) => void;
}

const POST_TYPES = [
  { value: 'RESEARCH_UPDATE', label: 'Research update' },
  { value: 'PUBLICATION', label: 'Publication' },
  { value: 'QUESTION', label: 'Question' },
  { value: 'COLLABORATION_REQUEST', label: 'Collaboration request' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
];

export default function EditPostModal({ isOpen, onClose, thread, onSaved }: EditPostModalProps) {
  const initialType = (thread as any).rawType || thread.type || 'RESEARCH_UPDATE';
  const [content, setContent] = useState(thread.content);
  const [type, setType] = useState<string>(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateThread = useStore((state) => state.updateThread);
  const addToast = useStore((state) => state.addToast);

  useEffect(() => {
    if (isOpen) {
      setContent(thread.content);
      setType(initialType);
    }
  }, [isOpen, thread, initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      const saved = await updateThread(thread.id, { content, type } as any);
      addToast('Post updated.', 'success');
      onSaved?.(saved);
      onClose();
    } catch (error: any) {
      addToast(error?.message || 'The post could not be updated.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      dismissible={!isSubmitting}
      size="lg"
      title="Edit post"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-post-form" loading={isSubmitting} disabled={!content.trim()}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-post-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Post type" htmlFor="edit-post-type">
          <select id="edit-post-type" value={type} onChange={(e) => setType(e.target.value)} className="cb-input">
            {POST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Post" htmlFor="edit-post-content" required>
          <textarea
            id="edit-post-content"
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="cb-input resize-y"
          />
        </Field>
      </form>
    </Dialog>
  );
}
