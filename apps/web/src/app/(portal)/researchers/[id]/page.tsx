'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useResearcherProfile } from '@/hooks/useResearchers';

import { useStore } from '@/store/useStore';
import { 
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { AcademicProfileView } from '@/components/profile/AcademicProfileView';

export default function ResearcherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useStore();
  const id = params.id as string;

  const { data: researcher, isLoading: isLoadingProfile, isError: isProfileError, refetch: refetchProfile } = useResearcherProfile(id);
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-slate-500">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <span className="text-sm font-bold">Loading profile...</span>
      </div>
    );
  }

  if (isProfileError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Unable to load researcher profile</h2>
        <button 
          onClick={() => refetchProfile()} 
          className="px-6 py-2.5 bg-brand text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!researcher) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Researcher Not Found</h2>
        <button onClick={() => router.push('/researchers')} className="text-brand font-bold hover:underline cursor-pointer">
          Return to Researchers
        </button>
      </div>
    );
  }



  return (
    <div className="space-y-4">
      {/* Back Button */}
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 pt-4">
        <button 
          onClick={() => router.push('/researchers')}
          className="flex items-center gap-2 text-slate-500 hover:text-brand transition-colors text-xs font-medium capitalize cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Researchers
        </button>
      </div>

      <AcademicProfileView
        user={researcher}
        isOwnProfile={currentUser?.id === id}
      />
    </div>
  );
}
