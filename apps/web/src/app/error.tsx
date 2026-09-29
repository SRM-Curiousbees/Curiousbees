'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { StatusScreen } from '@/components/ui/status-screen';
import { Button, buttonVariants } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Full details stay in the console for debugging; users see a calm summary.
    console.error('Route error:', error);
  }, [error]);

  return (
    <StatusScreen
      icon={AlertTriangle}
      tone="warning"
      title="This page ran into a problem"
      actions={
        <>
          <Button className="flex-1" onClick={() => reset()}>
            <RotateCcw aria-hidden />
            Try again
          </Button>
          <Link href="/" className={buttonVariants({ variant: 'secondary', className: 'flex-1' })}>Back to home</Link>
        </>
      }
      footnote={error.digest ? <>Reference: <span className="font-mono">{error.digest}</span></> : undefined}
    >
      <p>Something unexpected happened while loading this view. Trying again usually fixes it. If it keeps happening, let the CuriousBees team know.</p>
    </StatusScreen>
  );
}
