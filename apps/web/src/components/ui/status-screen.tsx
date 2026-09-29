import * as React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'warning' | 'danger' | 'brand';

const TONE: Record<Tone, string> = {
  neutral: 'border-line bg-surface-muted text-ink-secondary',
  warning: 'border-warning-200 bg-warning-50 text-warning-700',
  danger: 'border-danger-200 bg-danger-50 text-danger-700',
  brand: 'border-brand-200 bg-brand-50 text-brand-700',
};

/**
 * Full-page state for access, approval and error situations.
 * Explains what happened, why, and the next step, with at most two actions.
 */
export function StatusScreen({
  icon: Icon,
  tone = 'neutral',
  title,
  children,
  actions,
  footnote,
}: {
  icon: React.ElementType;
  tone?: Tone;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  return (
    <div className="honeycomb-bg flex min-h-dvh flex-col bg-canvas px-4 py-8 sm:px-6">
      <Link href="/" className="mx-auto w-fit rounded-lg sm:mx-0" aria-label="CuriousBees home">
        <Logo showText size={30} />
      </Link>
      <main id="main-content" className="mx-auto my-auto w-full max-w-md py-10">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <div className={cn('flex size-11 items-center justify-center rounded-xl border', TONE[tone])}>
            <Icon className="size-5" aria-hidden />
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">{title}</h1>
          <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-ink-secondary">{children}</div>
          {actions && <div className="mt-6 flex flex-col gap-2 sm:flex-row">{actions}</div>}
        </div>
        {footnote && <p className="mt-4 text-center text-sm text-ink-muted">{footnote}</p>}
      </main>
    </div>
  );
}
