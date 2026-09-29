import { cn } from '@/lib/utils';

/** Placeholder that matches the shape of the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('cb-skeleton', className)} />;
}
