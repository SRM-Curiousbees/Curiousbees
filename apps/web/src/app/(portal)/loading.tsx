import { Skeleton } from '@/components/ui/skeleton';

/** Route-level loading: mirrors the page header + content rhythm to avoid layout jumps. */
export default function PortalLoading() {
  return (
    <div role="status" aria-live="polite" className="w-full">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-8 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="mt-4 h-64 rounded-2xl" />
    </div>
  );
}
