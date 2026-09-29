'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getDashboardRoute } from '@/lib/auth/route-protection';
import { ROLE_LABEL } from '@/lib/navigation';
import { StatusScreen } from '@/components/ui/status-screen';
import { buttonVariants } from '@/components/ui/button';

export default function AuthUnauthorizedPage() {
  const { currentUser } = useStore();
  const [attemptedPath, setAttemptedPath] = useState<string | null>(null);

  useEffect(() => {
    setAttemptedPath(new URLSearchParams(window.location.search).get('from'));
  }, []);

  return (
    <StatusScreen
      icon={Lock}
      tone="neutral"
      title="You don't have access to this page"
      actions={
        <>
          <Link href={currentUser ? getDashboardRoute(currentUser) : '/login'} className={buttonVariants({ className: 'flex-1' })}>
            Go to my dashboard
          </Link>
          <Link href="/login" className={buttonVariants({ variant: 'secondary', className: 'flex-1' })}>
            Switch account
          </Link>
        </>
      }
    >
      <p>This area isn&apos;t available to your role. If you believe this is a mistake, contact your institutional administrator.</p>
      {(currentUser?.role || attemptedPath) && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border border-line bg-surface-muted p-3 text-sm">
          {currentUser?.role && (
            <>
              <dt className="text-ink-muted">Your role</dt>
              <dd className="font-medium text-ink">{ROLE_LABEL[currentUser.role] || currentUser.role}</dd>
            </>
          )}
          {attemptedPath && (
            <>
              <dt className="text-ink-muted">Page</dt>
              <dd className="truncate font-mono text-xs leading-5 text-ink">{attemptedPath}</dd>
            </>
          )}
        </dl>
      )}
    </StatusScreen>
  );
}
