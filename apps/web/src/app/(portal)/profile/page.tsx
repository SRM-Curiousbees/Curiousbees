'use client';

import React, { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { AcademicProfileView } from '@/components/profile/AcademicProfileView';
import { Loader2 } from 'lucide-react';

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <span className="text-sm font-bold">Loading profile...</span>
      </div>
    );
  }

  if (error && !currentUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Failed to load profile</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <button
          onClick={loadProfile}
          className="px-6 py-2.5 bg-brand hover:bg-brand-strong text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
        >
          Retry
        </button>
      </div>
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
