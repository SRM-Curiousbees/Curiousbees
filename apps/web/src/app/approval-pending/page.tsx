'use client';

import { Clock, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { StatusScreen } from '@/components/ui/status-screen';
import { Button } from '@/components/ui/button';

export default function ApprovalPendingPage() {
  const { logout } = useStore();
  return (
    <StatusScreen
      icon={Clock}
      tone="warning"
      title="Waiting for institutional approval"
      actions={
        <Button variant="secondary" className="flex-1" onClick={() => logout()}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      }
    >
      <p>An administrator is reviewing your account. You&apos;ll be notified as soon as your access is approved.</p>
    </StatusScreen>
  );
}
