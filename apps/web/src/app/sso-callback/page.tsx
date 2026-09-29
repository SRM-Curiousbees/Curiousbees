'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SsoCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/feed');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center font-sans">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-slate-600 font-medium">Completing secure authentication...</p>
      </div>
    </div>
  );
}
