'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldOff } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { StatusScreen } from '@/components/ui/status-screen';
import { Button } from '@/components/ui/button';

export default function AccountRejectedPage() {
  const router = useRouter();
  const { currentUser, logout } = useStore();

  return (
    <StatusScreen
      icon={ShieldOff}
      tone="danger"
      title="Your account wasn’t approved"
      actions={
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            logout();
            router.push('/login');
          }}
        >
          <LogOut aria-hidden />
          Sign out
        </Button>
      }
      footnote={
        <>
          Think this is a mistake?{' '}
          <Link href="/contact" className="font-medium text-brand hover:underline">
            Contact the Directorate of Research
          </Link>
          .
        </>
      }
    >
      <p>
        {currentUser?.email ? (
          <>
            Access for <span className="font-medium text-ink">{currentUser.email}</span> was reviewed and not approved.
          </>
        ) : (
          'Access for this account was reviewed and not approved.'
        )}
      </p>
      <p>Accounts are managed by your institute administrator, who can tell you why and restore access if appropriate.</p>
    </StatusScreen>
  );
}
