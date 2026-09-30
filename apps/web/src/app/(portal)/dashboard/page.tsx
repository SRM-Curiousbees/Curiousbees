'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { getDashboardRoute } from '@/lib/auth/route-protection';
import { Loader2 } from 'lucide-react';

export default function GenericDashboardRedirect() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    if (currentUser.role === 'INSTITUTE_ADMIN') {
      router.replace('/admin/dashboard');
    } else if (currentUser.role === 'RESEARCH_SUPERVISOR') {
      router.replace('/supervisor');
    } else if (currentUser.role === 'RESEARCH_SCHOLAR') {
      router.replace('/my-research');
    } else {
      router.replace(getDashboardRoute(currentUser));
    }
  }, [currentUser, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-brand animate-spin" />
      <p className="text-xs font-medium text-slate-500">Redirecting to your dashboard...</p>
    </div>
  );
}
