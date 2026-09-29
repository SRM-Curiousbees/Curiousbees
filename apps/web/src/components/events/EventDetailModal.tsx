'use client';

import React from 'react';
import { Calendar, Edit2, ExternalLink, MapPin, Share2, Trash2, User } from 'lucide-react';
import { Event } from '@curiousbees/types';
import { useStore } from '@/store/useStore';
import { formatVenueDisplay } from '@/constants/srmVenues';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROLE_LABEL } from '@/lib/navigation';
import { eventCategory } from '@/lib/event-categories';

type PrismaEvent = Event & {
  status: 'DRAFT' | 'PUBLISHED' | 'REVIEW_REQUIRED' | 'FAILED';
  confidence?: number;
  aiModel?: string;
  aiProvider?: string;
  rawEmail?: string;
  topic?: string;
  speaker?: string;
  organizerEmail?: string;
  eventType?: string;
  registrationLink?: string;
  authorId?: string;
  author?: {
    id: string;
    name: string;
    role: string;
    department?: string;
    image?: string;
  };
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: PrismaEvent | null;
  onEdit?: (event: PrismaEvent) => void;
  onDelete?: (id: string) => void;
}

export default function EventDetailModal({ 
  isOpen, 
  onClose, 
  event, 
  onEdit, 
  onDelete 
}: EventDetailModalProps) {
  const { currentUser, addToast } = useStore();
  
  if (!event) return null;

  const canEdit = 
    (currentUser?.role as string) === 'INSTITUTE_ADMIN' || 
    (currentUser?.role as string) === 'ADMIN' || 
    (currentUser?.role === 'RESEARCH_SUPERVISOR' && event.authorId === currentUser?.id);

  const parseSafeDate = (d: any) => {
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const eventDateObj = parseSafeDate(event.date);
  const formattedEventDate = eventDateObj 
    ? eventDateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : 'Date TBD';

  const postedDateObj = parseSafeDate(event.createdAt);
  const formattedPostedDate = postedDateObj 
    ? postedDateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  // Author details
  const authorName = event.author?.name || event.speaker || null;
  const authorRole = event.author?.role ? ROLE_LABEL[event.author.role] || null : null;
  const authorDept = event.author?.department || event.department || null;

  const registrationUrl = event.registrationLink 
    ? (event.registrationLink.startsWith('http://') || event.registrationLink.startsWith('https://') 
        ? event.registrationLink 
        : `https://${event.registrationLink}`)
    : null;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      addToast('Event link copied to clipboard!', 'success');
    }
  };

  const handleOpenRegistration = () => {
    if (registrationUrl) {
      window.open(registrationUrl, '_blank', 'noopener,noreferrer');
      addToast('Opening official registration link...', 'info');
    }
  };

  const venueInfo = formatVenueDisplay(event.venue);

  const category = eventCategory(event.eventType);

  const rows: { label: string; icon: React.ElementType; value: React.ReactNode }[] = [
    { label: 'When', icon: Calendar, value: <>{formattedEventDate}{event.time && <span className="block text-ink-secondary">{event.time}</span>}</> },
    {
      label: 'Where',
      icon: MapPin,
      value: venueInfo.title ? (
        <>
          {venueInfo.title}
          {venueInfo.subtitle && <span className="block text-ink-secondary">{venueInfo.subtitle}</span>}
          {venueInfo.details && <span className="block text-ink-muted">{venueInfo.details}</span>}
        </>
      ) : 'Venue to be announced',
    },
    {
      label: 'Organiser',
      icon: User,
      value: authorName ? (
        <>
          {authorName}
          {(authorRole || authorDept) && <span className="block text-ink-secondary">{[authorRole, authorDept].filter(Boolean).join(' · ')}</span>}
        </>
      ) : 'Not specified',
    },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      size="lg"
      title={event.title}
      description={
        <span className="flex flex-wrap items-center gap-2">
          {category ? <Badge tone={category.tone}>{category.label}</Badge> : event.eventType && <Badge>{event.eventType}</Badge>}
          {formattedPostedDate && <span className="text-ink-muted">Posted {formattedPostedDate}</span>}
        </span>
      }
      footer={
        <>
          <div className="mr-auto flex gap-2">
            {canEdit && onEdit && (
              <Button variant="secondary" onClick={() => onEdit(event)}>
                <Edit2 aria-hidden />
                Edit
              </Button>
            )}
            {canEdit && onDelete && (
              <Button variant="ghost" onClick={() => onDelete(event.id)} className="text-danger-700 hover:bg-danger-50 hover:text-danger-800">
                <Trash2 aria-hidden />
                Delete
              </Button>
            )}
          </div>
          <Button variant="secondary" onClick={handleShare}>
            <Share2 aria-hidden />
            Copy link
          </Button>
          {registrationUrl && (
            <Button onClick={handleOpenRegistration}>
              Register
              <ExternalLink aria-hidden />
            </Button>
          )}
        </>
      }
    >
      <dl className="divide-y divide-line rounded-xl border border-line">
        {rows.map(({ label, icon: Icon, value }) => (
          <div key={label} className="flex gap-3 px-4 py-3 text-sm">
            <dt className="flex w-24 shrink-0 items-center gap-2 self-start text-ink-muted">
              <Icon className="size-4" aria-hidden />
              {label}
            </dt>
            <dd className="min-w-0 font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {event.description && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-ink">About this event</h3>
          <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-secondary">{event.description}</p>
        </div>
      )}
    </Dialog>
  );
}
