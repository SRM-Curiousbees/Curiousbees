'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Loader2 } from 'lucide-react';

export default function ScholarPortalRoot() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);

  useEffect(() => {
    if (currentUser?.role === 'RESEARCH_SCHOLAR') {
      router.replace('/my-research');
    } else if (currentUser?.role === 'RESEARCH_SUPERVISOR') {
      router.replace('/supervisor');
    } else if (currentUser?.role === 'INSTITUTE_ADMIN') {
      router.replace('/admin/dashboard');
    }
  }, [currentUser, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-brand animate-spin" />
      <p className="text-xs font-medium text-slate-500">Opening Scholar Portal...</p>
    </div>
  );
}
