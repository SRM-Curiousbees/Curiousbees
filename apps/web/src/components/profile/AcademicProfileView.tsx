'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { ResearcherProfileHero } from './ResearcherProfileHero';
import { ResearchSummaryCard } from './ResearchSummaryCard';
import { ResearchFocusCard } from './ResearchFocusCard';
import { CurrentResearchCard } from './CurrentResearchCard';
import { ResearchExpertiseCard } from './ResearchExpertiseCard';
import { ResearchProjectsCard } from './ResearchProjectsCard';
import { PublicationsCard } from './PublicationsCard';
import { SupervisionCard } from './SupervisionCard';
import { ResearchCollaborationsCard } from './ResearchCollaborationsCard';
import { ProfessionalLinksCard } from './ProfessionalLinksCard';
import { ProfessionalLinksEditor } from './ProfessionalLinksEditor';
import { AcademicBackgroundCard } from './AcademicBackgroundCard';
import { AwardsCard } from './AwardsCard';
import { ResearchActivityTimeline } from './ResearchActivityTimeline';
import { EditResearcherProfileDrawer } from './EditResearcherProfileDrawer';
import { RequestSupervisorModal } from '@/components/supervisors/RequestSupervisorModal';
import { ResearcherExternalLink } from '@curiousbees/types';
import { apiFetch } from '@/lib/api-client';

interface AcademicProfileViewProps {
  user: any;
  isOwnProfile?: boolean;
  onEditClick?: () => void;

}

export function AcademicProfileView({
  user: initialUser,
  isOwnProfile = false,
}: AcademicProfileViewProps) {
  const router = useRouter();
  const {
    currentUser,
    collabStatuses,
    fetchCollabStatus,
    sendCollabRequest,
    fetchUserExternalLinks,
    workspaces,
    fetchWorkspaces,
  } = useStore();

  const user = isOwnProfile ? (currentUser || initialUser) : initialUser;

  const [externalLinks, setExternalLinks] = useState<ResearcherExternalLink[]>([]);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isLinksEditorOpen, setIsLinksEditorOpen] = useState(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [supervisionRequestStatus, setSupervisionRequestStatus] = useState<'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'>('NONE');

  const isViewerScholar = currentUser?.role === 'RESEARCH_SCHOLAR';
  const isTargetSupervisor = user?.role === 'RESEARCH_SUPERVISOR';

  // Fetch scholar supervisor request status
  const loadSupervisionStatus = React.useCallback(async () => {
    if (!isViewerScholar || !isTargetSupervisor || !user?.id || isOwnProfile) return;

    if (currentUser?.supervisorId === user.id && currentUser?.approved) {
      setSupervisionRequestStatus('APPROVED');
      return;
    }

    try {
      const res = await apiFetch('/api/supervisor-requests');
      if (res.ok) {
        const requests = await res.json();
        const thisReq = requests.find((r: any) => r.supervisorId === user.id || r.supervisor?.id === user.id);
        if (thisReq) {
          setSupervisionRequestStatus(thisReq.status as any);
        } else {
          setSupervisionRequestStatus('NONE');
        }
      }
    } catch {
      // Non-blocking
    }
  }, [isViewerScholar, isTargetSupervisor, user?.id, isOwnProfile, currentUser?.supervisorId, currentUser?.approved]);

  // Fetch collaboration status for relationship-aware hero action buttons
  useEffect(() => {
    if (user?.id && !isOwnProfile) {
      fetchCollabStatus(user.id);
      loadSupervisionStatus();
    }
  }, [user?.id, isOwnProfile, fetchCollabStatus, loadSupervisionStatus]);

  // Fetch external links
  const loadExternalLinks = React.useCallback(async () => {
    if (user?.id) {
      const links = await fetchUserExternalLinks(user.id);
      setExternalLinks(links || []);
    }
  }, [user?.id, fetchUserExternalLinks]);

  useEffect(() => {
    loadExternalLinks();
    fetchWorkspaces();
  }, [loadExternalLinks, fetchWorkspaces]);

  const targetUserId = user?.id;
  const collabStatusData = targetUserId ? collabStatuses[targetUserId] : undefined;
  const collabStatus = collabStatusData?.status || (user?.collaborationStatus as any) || 'NONE';
  const activeCollabId = collabStatusData?.collaborationId;

  const handleInitiateCollab = async () => {
    if (!targetUserId) return;
    try {
      await sendCollabRequest(targetUserId);
      fetchCollabStatus(targetUserId);
    } catch (err: any) {
      console.error('Failed to send collab request:', err);
    }
  };

  const handleOpenNexus = (collabId?: string) => {
    if (collabId) {
      router.push(`/nexus?collab=${collabId}`);
    } else {
      router.push('/nexus');
    }
  };

  const isAdmin = user?.role === 'INSTITUTE_ADMIN';
  const isSupervisor = user?.role === 'RESEARCH_SUPERVISOR';
  const activeCollaborations = user?.collaborationsRequested?.concat(user?.collaborationsReceived || []) || [];

  const mappedProjects = (workspaces || []).map((ws: any) => ({
    id: ws.id,
    title: ws.title || ws.name || 'Research Workspace',
    researchArea: ws.domain || ws.researchArea || 'Computer Science',
    status: ws.status || 'ACTIVE',
    role: ws.ownerId === user?.id ? 'Lead Researcher' : 'Collaborator',
    updatedAt: ws.updatedAt,
  }));

  return (
    <div className="min-h-screen bg-canvas text-slate-900 font-sans pb-32">
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 pt-6 space-y-6">
        {/* Full-Width Institutional Hero Header */}
        <ResearcherProfileHero
          user={user}
          isOwnProfile={isOwnProfile}
          onEditClick={() => setIsEditDrawerOpen(true)}
          collabStatus={collabStatus}
          activeCollabId={activeCollabId}
          onInitiateCollab={handleInitiateCollab}
          onOpenNexus={handleOpenNexus}
          supervisionStatus={supervisionRequestStatus as any}
          onRequestSupervision={() => setIsSupervisorModalOpen(true)}
        />

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Main Column (8 Cols on Desktop) */}
          <div className="lg:col-span-8 space-y-6">
            <ResearchSummaryCard
              bio={user?.bio}
              isOwnProfile={isOwnProfile}
              onEditClick={() => setIsEditDrawerOpen(true)}
            />

            {!isAdmin && (
              <CurrentResearchCard
                researchProfile={user?.researchProfile}
                isOwnProfile={isOwnProfile}
                onEditClick={() => setIsEditDrawerOpen(true)}
              />
            )}

            <ResearchProjectsCard projects={mappedProjects} isOwnProfile={isOwnProfile} />

            <PublicationsCard publications={user?.publications} isOwnProfile={isOwnProfile} />

            <ResearchCollaborationsCard
              collaborations={activeCollaborations}
              currentUserId={currentUser?.id}
            />

            {!isAdmin && (
              <ResearchActivityTimeline activities={user?.researchProfile?.activities} />
            )}
          </div>

          {/* Right / Sidebar Column (4 Cols on Desktop) */}
          <div className="lg:col-span-4 space-y-6">
            <ResearchFocusCard
              areas={user?.researchProfile?.researchArea ? [user.researchProfile.researchArea] : undefined}
              isOwnProfile={isOwnProfile}
              onEditClick={() => setIsEditDrawerOpen(true)}
            />

            <SupervisionCard user={user} isOwnProfile={isOwnProfile} />

            <ResearchExpertiseCard
              isOwnProfile={isOwnProfile}
              onEditClick={() => setIsEditDrawerOpen(true)}
            />

            <ProfessionalLinksCard
              links={externalLinks}
              isOwnProfile={isOwnProfile}
              onEditClick={() => setIsLinksEditorOpen(true)}
            />

            <AcademicBackgroundCard user={user} />

            <AwardsCard awards={user?.awards} />
          </div>
        </div>
      </div>

      {/* Edit Profile Drawer */}
      <EditResearcherProfileDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        user={user}
        onOpenLinksEditor={() => {
          setIsEditDrawerOpen(false);
          setIsLinksEditorOpen(true);
        }}
        onSuccess={() => {
          loadExternalLinks();
        }}
      />

      {/* Professional Links Manager */}
      <ProfessionalLinksEditor
        isOpen={isLinksEditorOpen}
        onClose={() => setIsLinksEditorOpen(false)}
        userId={user?.id}
        links={externalLinks}
        onRefresh={loadExternalLinks}
      />

      {/* Request Supervisor Modal */}
      {isSupervisorModalOpen && user && (
        <RequestSupervisorModal
          isOpen={isSupervisorModalOpen}
          onClose={() => setIsSupervisorModalOpen(false)}
          supervisor={user}
          onSuccess={() => {
            loadSupervisionStatus();
          }}
        />
      )}
    </div>
  );
}
