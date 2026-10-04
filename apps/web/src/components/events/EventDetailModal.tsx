'use client';

import React from 'react';
import { Calendar, Edit2, ExternalLink, Link2, Mail, MapPin, Share2, Trash2, User, Video } from 'lucide-react';
import { Event } from '@curiousbees/types';
import { useStore } from '@/store/useStore';
import { formatVenueDisplay } from '@/constants/srmVenues';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROLE_LABEL } from '@/lib/navigation';
import { eventCategory } from '@/lib/event-categories';
import { meetingProvider, safeExternalUrl, timeZoneLabel } from '@/lib/event-links';

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
  const formatDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const endDateObj = parseSafeDate(event.endDate);
  const formattedEventDate = eventDateObj
    ? endDateObj && endDateObj.toDateString() !== eventDateObj.toDateString()
      ? `${formatDay(eventDateObj)} – ${formatDay(endDateObj)}`
      : formatDay(eventDateObj)
    : 'Date TBD';
  const zoneLabel = event.time ? timeZoneLabel(event.timezone, eventDateObj ?? undefined) : null;

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

  // Organiser: the organising body when known (events from email), otherwise the author.
  const authorName = event.organizer || event.author?.name || event.speaker || null;
  const authorRole = !event.organizer && event.author?.role ? ROLE_LABEL[event.author.role] || null : null;
  const authorDept = !event.organizer ? event.author?.department || event.department || null : null;
  const meetingUrl = safeExternalUrl(event.meetingUrl);
  const detailsUrl = safeExternalUrl(event.eventUrl);

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

  const linkClass = 'inline-flex items-center gap-1 text-brand underline-offset-4 hover:underline';

  const rows: { label: string; icon: React.ElementType; value: React.ReactNode }[] = [
    {
      label: 'When',
      icon: Calendar,
      value: (
        <>
          {formattedEventDate}
          {event.time && <span className="block text-ink-secondary">{event.time}{zoneLabel && ` (${zoneLabel})`}</span>}
        </>
      ),
    },
    {
      label: 'Where',
      icon: MapPin,
      value: venueInfo.title ? (
        <>
          {venueInfo.title}
          {venueInfo.subtitle && <span className="block text-ink-secondary">{venueInfo.subtitle}</span>}
          {venueInfo.details && <span className="block text-ink-muted">{venueInfo.details}</span>}
        </>
      ) : meetingUrl ? 'Online' : 'Venue to be announced',
    },
    ...(meetingUrl
      ? [{
          label: 'Join',
          icon: Video,
          value: (
            <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Join on {meetingProvider(meetingUrl)}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ),
        }]
      : []),
    ...(detailsUrl
      ? [{
          label: 'Details',
          icon: Link2,
          value: (
            <a href={detailsUrl} target="_blank" rel="noopener noreferrer" className={`${linkClass} break-all`}>
              Event page
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            </a>
          ),
        }]
      : []),
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
      {event.source === 'email' && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
          <Mail className="size-3.5" aria-hidden />
          Added from an institutional email announcement.
        </p>
      )}
      {event.description && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-ink">About this event</h3>
          <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-secondary">{event.description}</p>
        </div>
      )}
    </Dialog>
  );
}
