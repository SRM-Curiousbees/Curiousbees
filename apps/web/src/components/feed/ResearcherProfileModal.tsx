'use client';

import React from 'react';
import { 
  X, 
  UserPlus, 
  Check, 
  Sparkles, 
  Building,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { getProfileImageUrl } from '@/lib/avatar';

interface ResearcherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  researcher: any | null;
}

export default function ResearcherProfileModal({
  isOpen,
  onClose,
  researcher
}: ResearcherProfileModalProps) {
  const { followedUserIds, toggleFollowUser, addToast, collabStatuses, fetchCollabStatus, sendCollabRequest, currentUser } = useStore();
  const [isCollaborating, setIsCollaborating] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && researcher?.id && currentUser?.id !== researcher.id) {
      fetchCollabStatus(researcher.id);
    }
  }, [isOpen, researcher?.id, currentUser?.id, fetchCollabStatus]);

  if (!researcher) return null;

  const name = researcher.name || 'Academic Researcher';
  const department = researcher.department || 'Research Division';
  const role = researcher.role === 'RESEARCH_SUPERVISOR' || researcher.role === 'SUPERVISOR' 
    ? 'Research Supervisor' 
    : 'Research Scholar';
  const avatarUrl = getProfileImageUrl(researcher);

  const isFollowing = researcher.id ? !!followedUserIds[researcher.id] : false;

  const handleFollow = () => {
    if (researcher.id) {
      toggleFollowUser(researcher.id);
    }
  };

  const collabState = collabStatuses[researcher.id]?.status || 'NONE';
  const collabId = collabStatuses[researcher.id]?.collaborationId;

  const handleCollabRequest = async () => {
    if (!researcher.id || currentUser?.id === researcher.id) return;

    if (collabState === 'ACTIVE' && collabId) {
      window.location.href = `/nexus?collab=${collabId}`;
      return;
    }

    if (collabState === 'PENDING_SENT' || collabState === 'PENDING_RECEIVED') {
      window.location.href = `/nexus?view=requests`;
      return;
    }

    const defaultMsg = `I would like to explore potential research collaborations with you.`;
    const customMessage = window.prompt(`Send a collaboration request to ${name}`, defaultMsg);
    if (customMessage === null) return;

    setIsCollaborating(true);
    try {
      await sendCollabRequest(researcher.id, undefined, customMessage);
      addToast(`Collaboration request sent to ${name}`, 'success');
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Collaboration request failed', 'error');
    } finally {
      setIsCollaborating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-surface rounded-3xl border border-slate-200 shadow-xl overflow-hidden z-10 text-left p-6"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex flex-col items-center text-center pt-2 pb-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-brand shadow-md mb-3 bg-slate-100">
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              </div>

              <h3 className="text-lg font-semibold text-slate-900 leading-tight">{name}</h3>
              <p className="text-xs font-semibold text-brand mt-1">{role}</p>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mt-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{department} · SRMIST</span>
              </div>
            </div>

            {/* Academic Bio / Focus */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 mb-5 text-xs text-slate-700 leading-relaxed font-medium">
              <p className="font-bold text-slate-900 mb-1">Research Focus & Profile</p>
              {researcher.bio || `${name} is actively conducting research in ${department} at SRMIST, focusing on advanced methodology and interdisciplinary collaboration.`}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleFollow}
                className={`py-2.5 px-4 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isFollowing
                    ? 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                    : 'bg-brand hover:bg-brand-strong text-white shadow-md  active:scale-95'
                }`}
              >
                {isFollowing ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-slate-600" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCollabRequest}
                disabled={isCollaborating || currentUser?.id === researcher.id}
                className={`py-2.5 px-4 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  currentUser?.id === researcher.id
                    ? 'bg-slate-200 cursor-not-allowed text-slate-500'
                    : collabState === 'ACTIVE'
                    ? 'bg-brand text-white hover:bg-brand-strong'
                    : collabState === 'PENDING_SENT'
                    ? 'bg-warning text-white hover:bg-warning-strong'
                    : collabState === 'PENDING_RECEIVED'
                    ? 'bg-success text-white hover:bg-success-strong'
                    : 'bg-ink text-ink-inverse hover:bg-ink/90 active:scale-95'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${collabState === 'ACTIVE' || collabState === 'PENDING_SENT' || collabState === 'PENDING_RECEIVED' ? 'text-white' : 'text-gold'}`} />
                <span>
                  {collabState === 'ACTIVE' ? 'Open Collab' : 
                   collabState === 'PENDING_SENT' ? 'Request Sent' :
                   collabState === 'PENDING_RECEIVED' ? 'Review Request' :
                   'Collaborate'}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
