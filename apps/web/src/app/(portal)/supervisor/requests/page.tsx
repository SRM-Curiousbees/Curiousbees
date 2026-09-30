'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RedirectSupervisorRequests() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/my-scholars?tab=requests');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-brand animate-spin" />
      <p className="text-xs font-medium text-slate-500">Opening supervision requests...</p>
    </div>
  );
}
