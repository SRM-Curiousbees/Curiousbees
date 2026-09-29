'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Trash2 } from 'lucide-react';
import { Thread } from '@curiousbees/types';
import { useStore } from '@/store/useStore';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: Thread;
}

export default function ConfirmDeleteModal({ isOpen, onClose, thread }: ConfirmDeleteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const deleteThread = useStore((state) => state.deleteThread);

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteThread(thread.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-surface border border-slate-200 rounded-3xl shadow-xl z-50 overflow-hidden flex flex-col text-center"
          >
            <div className="p-8 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-2">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Delete Post?</h2>
              <p className="text-sm font-bold text-slate-500">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-transparent transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-danger hover:bg-danger-strong text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
