'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Edit3, UserPlus, ArrowRight, CheckCircle2, Mail, Hash, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProfileImageUrl } from '@/lib/avatar';

interface ResearcherProfileHeroProps {
  user: any;
  isOwnProfile?: boolean;
  onEditClick?: () => void;
  collabStatus?: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACTIVE';
  activeCollabId?: string | null;
  onInitiateCollab?: () => void;
  onOpenNexus?: (collabId?: string) => void;
  supervisionStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'DECLINED';
  onRequestSupervision?: () => void;
}

export function ResearcherProfileHero({
  user,
  isOwnProfile = false,
  onEditClick,
  collabStatus = 'NONE',
  activeCollabId,
  onInitiateCollab,
  onOpenNexus,
  supervisionStatus = 'NONE',
  onRequestSupervision,
}: ResearcherProfileHeroProps) {
  const router = useRouter();

  const isAdmin = user?.role === 'INSTITUTE_ADMIN';
  const isSupervisor = user?.role === 'RESEARCH_SUPERVISOR';
  const name = user?.name || (isAdmin ? 'Institute Administrator' : 'Academic Scholar');
  const roleLabel = isAdmin ? 'Institute Administrator' : isSupervisor ? 'Research Supervisor' : 'Research Scholar';
  const department =
    user?.departmentRef?.name ||
    user?.department ||
    (isAdmin ? 'Research & Academic Governance' : 'Institutional Department Not Specified');
  const faculty = user?.departmentRef?.faculty?.name || user?.faculty;
  const institution = 'SRM Institute of Science and Technology';

  // Email and ID details
  const email = user?.email || '';
  const registrationId = user?.employeeId || (isAdmin ? 'ADMIN-SRM' : user?.scholarProfile?.registrationNo || user?.id?.substring(0, 8));
  const designation = isAdmin ? 'Institute Administrator' : isSupervisor ? (user?.supervisorProfile?.designation || 'Professor') : 'Ph.D. Scholar';

  // Interests tags
  const rawInterests = Array.isArray(user?.interests) && user.interests.length > 0
    ? user.interests.map((i: any) => i.interest?.name || i.name || i)
    : user?.scholarProfile?.researchArea
    ? user.scholarProfile.researchArea.split(',').map((s: string) => s.trim()).filter(Boolean)
    : user?.supervisorProfile?.researchArea
    ? user.supervisorProfile.researchArea.split(',').map((s: string) => s.trim()).filter(Boolean)
    : user?.researchInterests || [];

  const interests: string[] = Array.isArray(rawInterests) ? rawInterests : [];

  return (
    <div className="bg-white border border-[#E4E9F2] rounded-2xl overflow-hidden shadow-xs relative">
      {/* Institutional Top Header Accent Strip */}
      <div className="h-32 md:h-36 w-full bg-[#001E4C] relative overflow-hidden flex items-center justify-between px-6 md:px-8">
        {/* Etched Honeycomb Graphic Texture */}
        <svg
          className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          width="100"
          height="100"
          viewBox="0 0 100 100"
        >
          <path d="M50 0 L93.3 25 L93.3 75 L50 100 L6.7 75 L6.7 25 Z" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M0 50 L43.3 75 L43.3 125 L0 150 L-43.3 125 L-43.3 75 Z" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M100 50 L143.3 75 L143.3 125 L100 150 L56.7 125 L56.7 75 Z" fill="none" stroke="#FFFFFF" strokeWidth="1" />
        </svg>

        <div className="relative z-10 flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-xs border border-white/20 rounded-full text-white text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-[#FEC727]" />
          <span>SRMIST Institutional Verified</span>
        </div>

        <div className="relative z-10 text-right hidden sm:block">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active Account
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 md:p-8 pt-0 relative z-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          {/* Avatar + Info */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            {/* Circular Profile Photo */}
            <div className="relative -mt-14 md:-mt-16 shrink-0">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100 ring-2 ring-[#0C4DA2]/20">
                <img src={getProfileImageUrl(user)} alt={name} className="w-full h-full object-cover" />
              </div>
              <div
                className="absolute bottom-1 right-1 p-1 bg-[#FEC727] text-[#17233D] rounded-full border-2 border-white shadow-xs"
                title="Verified Institutional Researcher"
              >
                <CheckCircle2 className="w-4 h-4 fill-[#17233D] text-[#FEC727]" />
              </div>
            </div>

            {/* Researcher Info */}
            <div className="space-y-1.5 pt-1 sm:pt-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#17233D] tracking-tight">{name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0C4DA2] border border-blue-100">
                  {designation}
                </span>
              </div>

              <p className="text-sm font-bold text-[#0C4DA2]">
                {roleLabel} · {department}
              </p>

              <p className="text-xs text-slate-500 font-semibold">
                {faculty ? `${faculty} · ` : ''}{institution}
              </p>

              {/* Email & ID Metadata */}
              <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap font-medium">
                {email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {email}
                  </span>
                )}
                {registrationId && (
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    ID: {registrationId}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Hero Actions Bar */}
          <div className="flex items-center gap-3 pt-2 md:pt-0 shrink-0">
            {isOwnProfile ? (
              <button
                onClick={onEditClick}
                className="px-5 py-2.5 bg-[#0C4DA2] hover:bg-[#042654] text-white font-extrabold text-xs md:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                {/* Controlled Collaboration Button States */}
                {collabStatus === 'ACTIVE' ? (
                  <button
                    onClick={() => onOpenNexus && onOpenNexus(activeCollabId || undefined)}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs md:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Open Nexus</span>
                  </button>
                ) : collabStatus === 'PENDING_SENT' ? (
                  <button
                    disabled
                    className="px-5 py-2.5 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs md:text-sm rounded-xl cursor-not-allowed flex items-center justify-center gap-2 opacity-90"
                  >
                    <span>Collaboration Pending</span>
                  </button>
                ) : collabStatus === 'PENDING_RECEIVED' ? (
                  <button
                    onClick={() => router.push('/nexus')}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs md:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Review Request</span>
                  </button>
                ) : (
                  <button
                    onClick={onInitiateCollab}
                    className="px-5 py-2.5 bg-[#0C4DA2] hover:bg-[#042654] text-white font-extrabold text-xs md:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Collaborate</span>
                  </button>
                )}

                {/* Supervision Request Action & Statuses */}
                {isSupervisor && !isOwnProfile && (
                  <>
                    {supervisionStatus === 'APPROVED' ? (
                      <div className="px-4 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs md:text-sm rounded-xl flex items-center gap-1.5 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Supervisor Assigned</span>
                      </div>
                    ) : supervisionStatus === 'PENDING' ? (
                      <div className="px-4 py-2.5 bg-[#FFC828]/20 text-[#855D00] border border-[#FFC828]/40 font-bold text-xs md:text-sm rounded-xl flex items-center gap-1.5 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-[#B88608] animate-pulse" />
                        <span>Request Pending</span>
                      </div>
                    ) : onRequestSupervision ? (
                      <button
                        onClick={onRequestSupervision}
                        className="px-4 py-2.5 bg-[#0C4DA2] hover:bg-[#003370] text-white font-bold text-xs md:text-sm rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#FFC828]" />
                        <span>Request Supervisor</span>
                      </button>
                    ) : null}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Research Interests Tags */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Interests:</span>
          {interests.map((interest, idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
