'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SupervisorApprovalRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params?.id as string;

  useEffect(() => {
    if (requestId) {
      router.replace(`/supervisor/requests/${requestId}`);
    }
  }, [requestId, router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-brand animate-spin" />
      <p className="text-xs font-medium text-slate-500 capitalize">Redirecting to Supervision Request...</p>
    </div>
  );
}
