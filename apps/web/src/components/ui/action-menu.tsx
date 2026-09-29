'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from '@/components/ui/button';

export type ActionMenuItem =
  | {
      label: string;
      onSelect: () => void;
      icon?: React.ElementType;
      tone?: 'danger';
      disabled?: boolean;
      /** Shown as the item's tooltip, e.g. why it is disabled. */
      hint?: string;
    }
  | 'separator';

/**
 * "More actions" menu for table rows and cards. Rendered in a portal with fixed
 * positioning so it is never clipped by scrolling table containers.
 * Keyboard: Enter/Space opens, arrows move, Escape closes and returns focus.
 */
export function ActionMenu({ label, items, className }: { label: string; items: ActionMenuItem[]; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<React.CSSProperties>({});
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();

  const place = () => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const right = Math.max(8, window.innerWidth - r.right);
    const openUp = window.innerHeight - r.bottom < 240 && r.top > 240;
    setPos(openUp ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
  };

  const close = React.useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const itemsOf = () =>
      Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? []);
    const raf = requestAnimationFrame(() => itemsOf()[0]?.focus());

    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      const list = itemsOf();
      const i = list.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab') {
        close(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        list[(i + 1) % list.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        list[(i - 1 + list.length) % list.length]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        list[list.length - 1]?.focus();
      }
    };
    const onViewportChange = () => close(false);

    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, close]);

  return (
    <>
      <IconButton
        ref={buttonRef}
        label={label}
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (!open) place();
          setOpen((o) => !o);
        }}
        className={className}
      >
        <MoreHorizontal />
      </IconButton>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            style={pos}
            className="fixed z-dropdown min-w-48 animate-fade-in rounded-xl border border-line bg-surface p-1 shadow-lg"
          >
            {items.map((item, idx) =>
              item === 'separator' ? (
                <div key={`sep-${idx}`} role="separator" className="my-1 h-px bg-line" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  title={item.hint}
                  onClick={() => {
                    close(false);
                    item.onSelect();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-fast focus:outline-none disabled:cursor-not-allowed disabled:opacity-45',
                    item.tone === 'danger'
                      ? 'text-danger-700 hover:bg-danger-50 focus-visible:bg-danger-50'
                      : 'text-ink hover:bg-neutral-100 focus-visible:bg-neutral-100',
                  )}
                >
                  {item.icon && (
                    <item.icon
                      className={cn('size-4 shrink-0', item.tone === 'danger' ? 'text-danger-600' : 'text-ink-muted')}
                      aria-hidden
                    />
                  )}
                  {item.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
