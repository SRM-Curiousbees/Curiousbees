'use client';

import { useState } from 'react';
import { Thread } from '@curiousbees/types';
import { useStore } from '@/store/useStore';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: Thread;
  /** Called after the post is deleted (e.g. to leave a page that showed it). */
  onDeleted?: () => void;
}

export default function ConfirmDeleteModal({ isOpen, onClose, thread, onDeleted }: ConfirmDeleteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const deleteThread = useStore((state) => state.deleteThread);
  const addToast = useStore((state) => state.addToast);

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteThread(thread.id);
      addToast('Post deleted.', 'info');
      onClose();
      onDeleted?.();
    } catch (error: any) {
      addToast(error?.message || 'The post could not be deleted.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      dismissible={!isSubmitting}
      size="sm"
      title="Delete this post?"
      description="It will be removed from the feed along with its comments. This can't be undone."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={isSubmitting}>
            Delete post
          </Button>
        </>
      }
    />
  );
}
