'use client';

import { LogOut, UserCheck } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { StatusScreen } from '@/components/ui/status-screen';
import { Button } from '@/components/ui/button';

export default function AwaitingSupervisorApprovalPage() {
  const { logout } = useStore();
  return (
    <StatusScreen
      icon={UserCheck}
      tone="warning"
      title="Waiting for your supervisor"
      actions={
        <Button variant="secondary" className="flex-1" onClick={() => logout()}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      }
    >
      <p>Your scholar profile is saved and your request has been sent to your research supervisor.</p>
      <p>You&apos;ll get full access to CuriousBees as soon as they confirm.</p>
    </StatusScreen>
  );
}
