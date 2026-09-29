import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { StatusScreen } from '@/components/ui/status-screen';
import { buttonVariants } from '@/components/ui/button';

export default function ErrorPage() {
  return (
    <StatusScreen
      icon={AlertTriangle}
      tone="warning"
      title="We couldn't load CuriousBees"
      actions={
        <>
          <Link href="/login" className={buttonVariants({ className: 'flex-1' })}>Sign in again</Link>
          <Link href="/" className={buttonVariants({ variant: 'secondary', className: 'flex-1' })}>Back to home</Link>
        </>
      }
    >
      <p>Something went wrong while checking your session. This is usually temporary; please try again in a moment.</p>
    </StatusScreen>
  );
}
