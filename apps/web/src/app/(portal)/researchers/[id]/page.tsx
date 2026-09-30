'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, UserX } from 'lucide-react';
import { useResearcherProfile } from '@/hooks/useResearchers';
import { useStore } from '@/store/useStore';
import { AcademicProfileView } from '@/components/profile/AcademicProfileView';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export default function ResearcherProfilePage() {
  const params = useParams();
  const { currentUser } = useStore();
  const id = params.id as string;
  const { data: researcher, isLoading, isError, refetch } = useResearcherProfile(id);

  const back = (
    <Link href="/researchers" className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-ml-2 mb-4' })}>
      <ArrowLeft aria-hidden />
      Researchers
    </Link>
  );

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading profile">
        {back}
        <Card className="flex items-start gap-5 p-7">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-4 w-56" />
          </div>
        </Card>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !researcher) {
    return (
      <div>
        {back}
        <Card>
          <EmptyState
            icon={UserX}
            title={isError ? "This profile didn't load" : 'Researcher not found'}
            description={isError ? 'Check your connection and try again.' : 'The profile may have been removed, or the link is out of date.'}
            action={
              isError ? (
                <Button variant="secondary" onClick={() => refetch()}>
                  Try again
                </Button>
              ) : (
                <Link href="/researchers" className={buttonVariants({ variant: 'secondary' })}>
                  Browse researchers
                </Link>
              )
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      {back}
      <AcademicProfileView user={researcher} isOwnProfile={currentUser?.id === id} />
    </div>
  );
}
