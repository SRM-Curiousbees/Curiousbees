'use client';

import { LogOut, UserX } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { StatusScreen } from '@/components/ui/status-screen';
import { Button } from '@/components/ui/button';

export default function NotProvisionedPage() {
  const { logout } = useStore();
  return (
    <StatusScreen
      icon={UserX}
      tone="warning"
      title="Your account hasn't been added yet"
      actions={
        <Button className="flex-1" onClick={() => logout()}>
          <LogOut aria-hidden />
          Use another account
        </Button>
      }
      footnote={<>Need access? <Link href="/contact" className="font-medium text-brand hover:underline">Contact the CuriousBees team</Link></>}
    >
      <p>You signed in with Google, but this email address isn&apos;t registered in CuriousBees.</p>
      <p>Ask your department coordinator or the research office to add it with your role, then sign in again.</p>
    </StatusScreen>
  );
}
