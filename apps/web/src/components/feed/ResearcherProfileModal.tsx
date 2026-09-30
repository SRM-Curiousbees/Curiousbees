'use client';

import React from 'react';
import Link from 'next/link';
import { Check, UserPlus, Users } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getProfileImageUrl, handleAvatarError } from '@/lib/avatar';
import { ROLE_LABEL } from '@/lib/navigation';
import { Dialog } from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { CollabRequestDialog } from '@/components/collaboration/CollabRequestDialog';

interface ResearcherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  researcher: any | null;
}

/** A quick look at a researcher from the feed, with follow and collaborate actions. */
export default function ResearcherProfileModal({ isOpen, onClose, researcher }: ResearcherProfileModalProps) {
  const { followedUserIds, toggleFollowUser, collabStatuses, fetchCollabStatus, currentUser } = useStore();
  const [collabOpen, setCollabOpen] = React.useState(false);

  const id: string | undefined = researcher?.id;
  const isSelf = !!id && currentUser?.id === id;

  React.useEffect(() => {
    if (isOpen && id && !isSelf) fetchCollabStatus(id);
  }, [isOpen, id, isSelf, fetchCollabStatus]);

  const name = researcher?.name || 'Researcher';
  const roleLabel = researcher?.role ? ROLE_LABEL[researcher.role] || String(researcher.role).replace(/_/g, ' ').toLowerCase() : null;
  const isFollowing = id ? !!followedUserIds[id] : false;
  const collabState = (id && collabStatuses[id]?.status) || 'NONE';
  const collabId = id ? collabStatuses[id]?.collaborationId : undefined;

  const collabAction =
    collabState === 'ACTIVE' && collabId ? (
      <Link href={`/nexus?collab=${collabId}`} className={buttonVariants({ variant: 'secondary' })} onClick={onClose}>
        <Users aria-hidden />
        Open collaboration
      </Link>
    ) : collabState === 'PENDING_SENT' || collabState === 'PENDING_RECEIVED' ? (
      <Link href="/nexus?view=requests" className={buttonVariants({ variant: 'secondary' })} onClick={onClose}>
        <Users aria-hidden />
        {collabState === 'PENDING_SENT' ? 'Request sent' : 'Review request'}
      </Link>
    ) : (
      <Button variant="secondary" onClick={() => setCollabOpen(true)}>
        <Users aria-hidden />
        Collaborate
      </Button>
    );

  return (
    <>
      <Dialog
        open={isOpen && !!researcher}
        onClose={onClose}
        title={name}
        description={[roleLabel, researcher?.department].filter(Boolean).join(' · ') || undefined}
        footer={
          id && !isSelf ? (
            <>
              {collabAction}
              <Button variant={isFollowing ? 'secondary' : 'primary'} onClick={() => toggleFollowUser(id)} aria-pressed={isFollowing}>
                {isFollowing ? <Check aria-hidden /> : <UserPlus aria-hidden />}
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="flex items-start gap-4">
          <img
            src={getProfileImageUrl(researcher)}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => handleAvatarError(e, name)}
            className="size-16 shrink-0 rounded-full border border-line bg-surface-muted object-cover"
          />
          <div className="min-w-0 flex-1">
            {researcher?.bio ? (
              <p className="whitespace-pre-line text-sm text-ink-secondary">{researcher.bio}</p>
            ) : researcher && 'bio' in researcher ? (
              // Only claim there's no bio when the bio was actually loaded.
              <p className="text-sm text-ink-muted">{isSelf ? 'You haven’t added a bio yet.' : `${name} hasn’t added a bio yet.`}</p>
            ) : null}
            {id && (
              <Link
                href={isSelf ? '/profile' : `/researchers/${id}`}
                onClick={onClose}
                className="mt-3 inline-block text-sm font-medium text-brand underline-offset-2 hover:underline"
              >
                {isSelf ? 'Open your profile' : 'View full profile'}
              </Link>
            )}
          </div>
        </div>
      </Dialog>

      {id && !isSelf && (
        <CollabRequestDialog
          open={collabOpen}
          onClose={() => setCollabOpen(false)}
          recipientId={id}
          recipientName={name}
          defaultMessage="I would like to explore a research collaboration with you."
        />
      )}
    </>
  );
}
