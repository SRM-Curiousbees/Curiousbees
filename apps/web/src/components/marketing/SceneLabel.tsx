import * as React from 'react';
import { cn } from '@/lib/utils';

/** Editorial scene index used by every public-site section ("02 · The platform"). */
export function SceneLabel({ index, children, className }: { index: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-center gap-3 font-mono text-xs text-ink-muted', className)}>
      <span className="text-ink">{index}</span>
      <span aria-hidden className="h-px w-8 bg-line-strong" />
      {children}
    </p>
  );
}
