'use client';

import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getDashboardRoute } from '@/lib/auth/route-protection';
import { StatusScreen } from '@/components/ui/status-screen';
import { Button } from '@/components/ui/button';
import { ROLE_LABEL } from '@/lib/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);

  return (
    <StatusScreen
      icon={Lock}
      tone="neutral"
      title="You don't have access to this page"
      actions={
        <Button className="flex-1" onClick={() => router.push(currentUser ? getDashboardRoute(currentUser) : '/')}>
          {currentUser ? 'Go to my dashboard' : 'Back to home'}
        </Button>
      }
    >
      <p>
        {currentUser
          ? `This area isn't available to your role${ROLE_LABEL[currentUser.role] ? ` (${ROLE_LABEL[currentUser.role]})` : ''}.`
          : 'This area is only available to signed-in members with the right role.'}{' '}
        If you believe this is a mistake, contact your institutional administrator.
      </p>
    </StatusScreen>
  );
}
