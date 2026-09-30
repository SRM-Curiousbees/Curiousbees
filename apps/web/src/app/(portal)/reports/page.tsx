'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';

export default function RedirectToSupervisionReports() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);

  useEffect(() => {
    if (currentUser?.role === 'RESEARCH_SUPERVISOR') {
      router.replace('/my-scholars?tab=reports');
    } else if (currentUser?.role === 'RESEARCH_SCHOLAR') {
      router.replace('/my-research');
    } else if (currentUser?.role === 'INSTITUTE_ADMIN') {
      router.replace('/admin/moderation');
    }
  }, [currentUser, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-xs font-bold text-slate-400">
      Loading Supervision Workspace...
    </div>
  );
}
