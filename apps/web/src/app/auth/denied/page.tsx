import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { StatusScreen } from '@/components/ui/status-screen';
import { buttonVariants } from '@/components/ui/button';

export default function AuthDeniedPage() {
  return (
    <StatusScreen
      icon={ShieldX}
      tone="danger"
      title="This email can't be used with CuriousBees"
      actions={
        <>
          <Link href="/login" className={buttonVariants({ className: 'flex-1' })}>Use another account</Link>
          <Link href="/" className={buttonVariants({ variant: 'secondary', className: 'flex-1' })}>Back to home</Link>
        </>
      }
    >
      <p>Only email domains approved by SRMIST can sign in, and the account must have been added by an administrator.</p>
    </StatusScreen>
  );
}
