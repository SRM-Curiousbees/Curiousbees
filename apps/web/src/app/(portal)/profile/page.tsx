'use client';

import React, { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { AcademicProfileView } from '@/components/profile/AcademicProfileView';
import { UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { currentUser, fetchProfile } = useStore();
  const [loading, setLoading] = React.useState(!currentUser);
  const [error, setError] = React.useState<string | null>(null);

  const loadProfile = React.useCallback(async () => {
    if (!currentUser) setLoading(true);
    setError(null);
    try {
      await fetchProfile();
    } catch (e: any) {
      console.error('Failed to load profile:', e);
      setError('Unable to retrieve profile metadata.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading && !currentUser) {
    return (
      <div role="status" aria-label="Loading profile" className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && !currentUser) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="Your profile didn't load"
          description="Check your connection and try again."
          action={
            <Button variant="secondary" onClick={loadProfile}>
              Try again
            </Button>
          }
        />
      </Card>
    );
  }

  if (!currentUser) return null;

  return (
    <AcademicProfileView
      user={currentUser}
      isOwnProfile={true}
    />
  );
}
