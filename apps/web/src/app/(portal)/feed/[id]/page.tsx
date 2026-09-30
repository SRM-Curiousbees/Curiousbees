'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileQuestion, RefreshCw } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiFetch } from '@/lib/api-client';
import { toFeedPost } from '@/lib/feed-post';
import ResearchPostCard from '@/components/feed/ResearchPostCard';
import ShareModal from '@/components/feed/ShareModal';
import ReportPostModal from '@/components/feed/ReportPostModal';
import EditPostModal from '@/components/feed/EditPostModal';
import ConfirmDeleteModal from '@/components/feed/ConfirmDeleteModal';
import ResearcherProfileModal from '@/components/feed/ResearcherProfileModal';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export default function ThreadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const storeThread = useStore((s) => s.threads.find((t) => t.id === id));

  const [fetched, setFetched] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>(storeThread ? 'ready' : 'loading');

  const [sharing, setSharing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [author, setAuthor] = useState<any>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await apiFetch(`/api/threads/${id}`);
      if (res.status === 404 || res.status === 403) {
        setState('missing');
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data?.id) {
        setState('missing');
        return;
      }
      setFetched(data);
      // Comments, likes and saves read and update the store's copy of the post,
      // so make sure it's there even when the page was opened from a link.
      useStore.setState((st) => ({
        threads: st.threads.some((t) => t.id === data.id) ? st.threads.map((t) => (t.id === data.id ? data : t)) : [...st.threads, data],
      }));
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);

  // Always fetch: the feed's copy may be stale, and this is the page people land on from a link.
  useEffect(() => {
    load();
  }, [load]);

  // Prefer the store's copy once it exists, so likes, saves and edits made here show immediately.
  const raw = storeThread || fetched;
  const post = raw ? toFeedPost(raw) : null;

  const backLink = (
    <Link href="/feed" className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-ink-muted transition-colors duration-fast hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden />
      Research feed
    </Link>
  );

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl">
        {backLink}
        {state === 'loading' ? (
          <Card className="p-5" aria-busy="true" aria-label="Loading post">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <Skeleton className="mt-5 h-5 w-3/4" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={FileQuestion}
              title={state === 'missing' ? 'This post isn’t available' : 'The post could not be loaded'}
              description={
                state === 'missing'
                  ? 'It may have been deleted by its author or hidden by an administrator.'
                  : 'Check your connection and try again.'
              }
              action={
                <>
                  {state === 'error' && (
                    <Button variant="secondary" onClick={load}>
                      <RefreshCw aria-hidden />
                      Try again
                    </Button>
                  )}
                  <Link href="/feed" className={buttonVariants()}>
                    Back to the feed
                  </Link>
                </>
              }
            />
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {backLink}
      <h1 className="sr-only">{post.title || `Post by ${post.author?.name || 'a researcher'}`}</h1>

      <ResearchPostCard
        post={post}
        isFeedView={false}
        defaultShowComments
        onAuthorClick={(a) => setAuthor(a)}
        onShareClick={() => setSharing(true)}
        onReportClick={() => setReporting(true)}
        onEditClick={() => setEditing(true)}
        onDeleteClick={() => setDeleting(true)}
      />

      {sharing && <ShareModal isOpen={sharing} onClose={() => setSharing(false)} thread={post as any} />}
      {reporting && <ReportPostModal isOpen={reporting} onClose={() => setReporting(false)} thread={post as any} />}
      {editing && (
        <EditPostModal
          isOpen={editing}
          onClose={() => setEditing(false)}
          thread={post as any}
          onSaved={(saved) => saved && setFetched((prev: any) => ({ ...prev, ...saved }))}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal isOpen={deleting} onClose={() => setDeleting(false)} thread={post as any} onDeleted={() => router.push('/feed')} />
      )}
      <ResearcherProfileModal isOpen={!!author} onClose={() => setAuthor(null)} researcher={author} />
    </div>
  );
}
