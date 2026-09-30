'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { TOAST_DURATION_MS } from '@/lib/toast';

type ToastType = 'success' | 'error' | 'info';

const TONE: Record<ToastType, { icon: React.ElementType; iconClass: string; bar: string }> = {
  success: { icon: CheckCircle2, iconClass: 'text-success-600', bar: 'bg-success' },
  error: { icon: AlertCircle, iconClass: 'text-danger-600', bar: 'bg-danger' },
  info: { icon: Info, iconClass: 'text-brand-600', bar: 'bg-brand' },
};

/** Transient confirmations and errors, bottom-right on desktop and full-width on phones. */
export function ToastContainer() {
  const toasts = useStore((state) => state.toasts);
  const removeToast = useStore((state) => state.removeToast);
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-20 z-toast flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-6 sm:w-96 md:bottom-6">
      {/* Polite for confirmations; errors interrupt. */}
      <div aria-live="polite" className="sr-only">
        {toasts.filter((t) => t.type !== 'error').map((t) => t.message).join('. ')}
      </div>
      <div aria-live="assertive" className="sr-only">
        {toasts.filter((t) => t.type === 'error').map((t) => t.message).join('. ')}
      </div>
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONE[toast.type] || TONE.info;
          const Icon = tone.icon;
          return (
            <motion.div
              key={toast.id}
              layout={!reduceMotion}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-line bg-surface p-4 pr-10 shadow-lg"
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', tone.iconClass)} aria-hidden />
              <p className="min-w-0 flex-1 text-sm text-ink">{toast.message}</p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-neutral-100 hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
              {!reduceMotion && (
                <motion.span
                  aria-hidden
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: TOAST_DURATION_MS[toast.type as ToastType] / 1000, ease: 'linear' }}
                  className={cn('absolute bottom-0 left-0 h-0.5 w-full origin-left', tone.bar)}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
