'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CuriousNexusHub } from '@/components/nexus/CuriousNexusHub';

function NexusContent() {
  const searchParams = useSearchParams();
  const view = searchParams?.get('view') === 'workspaces' ? 'workspaces' : 'messages';
  // ?collab=<collaborationId> (profile, My Research) or ?userId=<researcherId> (Supervision Panel)
  return <CuriousNexusHub initialView={view} initialCollabId={searchParams?.get('collab')} initialUserId={searchParams?.get('userId')} />;
}

export default function NexusPage() {
  return (
    <Suspense fallback={null}>
      <NexusContent />
    </Suspense>
  );
}
