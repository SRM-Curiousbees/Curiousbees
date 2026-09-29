'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyScholarMyResearchRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/my-research');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center font-sans">
      <div className="space-y-2">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">Redirecting to My Research Command Center...</p>
      </div>
    </div>
  );
}
