'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Open dialogs, innermost last: only the top one reacts to Escape and Tab.
const openStack: string[] = [];

/**
 * Accessible modal dialog: labelled, closes on Escape or backdrop click,
 * moves focus into the panel and restores it on close, locks page scroll.
 * Dialogs can stack (e.g. a confirmation over a side panel).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  side = 'center',
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** `right` renders a full-height side panel (for longer forms). */
  side?: 'center' | 'right';
  /** When false (e.g. while saving), Escape and backdrop clicks are ignored. */
  dismissible?: boolean;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  // Latest callbacks in refs so parent re-renders (e.g. typing in a field whose
  // state lives in the parent) never re-run the open/close effect and move focus.
  const onCloseRef = React.useRef(onClose);
  const dismissibleRef = React.useRef(dismissible);
  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;

  // Rendered into <body> so no ancestor stacking context (page animations,
  // sticky headers) can place the sidebar or top bar above the dialog.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    openStack.push(titleId);
    const isTop = () => openStack[openStack.length - 1] === titleId;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus an explicit [autofocus], else the first form field, else the panel
    // itself (confirmations: nothing destructive is focused by default).
    const focusFirst = () => {
      const panel = panelRef.current;
      const el =
        panel?.querySelector<HTMLElement>('[autofocus]') ??
        panel?.querySelector<HTMLElement>(
          '[data-dialog-body] :is(input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]))',
        );
      (el ?? panel)?.focus();
    };
    const t = setTimeout(focusFirst, 30);

    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape' && dismissibleRef.current) onCloseRef.current();
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      const i = openStack.lastIndexOf(titleId);
      if (i !== -1) openStack.splice(i, 1);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, titleId]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-modal flex', side === 'right' ? 'justify-end' : 'items-end justify-center p-0 sm:items-center sm:p-4')}>
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dismissible && onClose()}
            className="absolute inset-0 bg-black/45"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={side === 'right' ? { x: '100%' } : { opacity: 0, y: 12 }}
            animate={side === 'right' ? { x: 0 } : { opacity: 1, y: 0 }}
            exit={side === 'right' ? { x: '100%' } : { opacity: 0, y: 12 }}
            transition={{ duration: side === 'right' ? 0.26 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative flex w-full flex-col overflow-hidden border-line bg-surface shadow-2xl outline-none',
              side === 'right'
                ? 'h-dvh border-l sm:max-w-lg'
                : 'max-h-[92dvh] rounded-t-2xl border sm:rounded-3xl',
              side === 'center' && size === 'sm' && 'sm:max-w-sm',
              side === 'center' && size === 'md' && 'sm:max-w-md',
              side === 'center' && size === 'lg' && 'sm:max-w-2xl',
            )}
          >
            <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
                {description && <p id={descId} className="mt-1 text-sm text-ink-secondary">{description}</p>}
              </div>
              {dismissible && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-1.5 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-neutral-100 hover:text-ink"
                >
                  <X className="size-[18px]" />
                </button>
              )}
            </div>
            {children && <div data-dialog-body className={cn('overflow-y-auto px-5 pb-5 sm:px-6', side === 'right' && 'flex-1 border-t border-line pt-5')}>{children}</div>}
            {footer && (
              <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-muted px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
