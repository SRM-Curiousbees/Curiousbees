'use client';

import { Ban, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { StatusScreen } from '@/components/ui/status-screen';
import { Button } from '@/components/ui/button';

export default function AccountSuspendedPage() {
  const { logout } = useStore();
  return (
    <StatusScreen
      icon={Ban}
      tone="danger"
      title="Your account is suspended"
      actions={
        <Button variant="secondary" className="flex-1" onClick={() => logout()}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      }
      footnote={<>If you believe this is an error, <Link href="/contact" className="font-medium text-brand hover:underline">contact the Directorate of Research</Link>.</>}
    >
      <p>An administrator has suspended access to your CuriousBees account. Your data has not been deleted.</p>
    </StatusScreen>
  );
}
