'use client';

import { LogOut, ShieldX } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { StatusScreen } from '@/components/ui/status-screen';
import { Button } from '@/components/ui/button';

export default function AccessDeniedPage() {
  const { logout } = useStore();
  return (
    <StatusScreen
      icon={ShieldX}
      tone="danger"
      title="This email can't be used with CuriousBees"
      actions={
        <Button className="flex-1" onClick={() => logout()}>
          <LogOut aria-hidden />
          Use another account
        </Button>
      }
      footnote={<>Think this is a mistake? <Link href="/contact" className="font-medium text-brand hover:underline">Contact the CuriousBees team</Link></>}
    >
      <p>Sign-in is limited to the email domains your institution has approved. Please sign in with your registered account.</p>
    </StatusScreen>
  );
}
