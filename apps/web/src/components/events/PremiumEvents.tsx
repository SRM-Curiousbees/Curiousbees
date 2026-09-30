'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, Search } from 'lucide-react';
import { Event } from '@curiousbees/types';
import { PremiumCalendarWidget } from './PremiumCalendarWidget';
import EventDetailModal from '@/components/events/EventDetailModal';
import { SRMVenueSelector } from '@/components/events/SRMVenueSelector';
import { PageHeader } from '@/components/ui/page-header';
import { Button, IconButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { EVENT_CATEGORIES, eventCategory, eventMatchesCategory } from '@/lib/event-categories';

type PrismaEvent = Event & {
  status: 'DRAFT' | 'PUBLISHED' | 'REVIEW_REQUIRED' | 'FAILED';
  confidence: number;
  aiModel: string;
  aiProvider: string;
};

const EventFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  venue: z.string().min(1, 'Venue/Location is required'),
  description: z.string().optional(),
  eventType: z.string().min(1, 'Category/Type is required'),
  registrationLink: z.string().optional()
}).refine((data) => {
  const start = new Date(`1970-01-01T${data.startTime}`);
  const end = new Date(`1970-01-01T${data.endTime}`);
  return end > start;
}, {
  message: "End time must be after the start time.",
  path: ["endTime"],
});

type EventFormValues = z.infer<typeof EventFormSchema>;

export function PremiumEvents() {
  const { events, fetchEvents, createEvent, updateEvent, deleteEvent, currentUser, addToast } = useStore();
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(events.length === 0);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<PrismaEvent | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  // Views & Filter states
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month' | 'agenda'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rsvpList, setRsvpList] = useState<string[]>([]);

  // A month grid is too dense on phones; start small screens in the agenda view.
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setCalendarView('agenda');
  }, []);

  // Fetch events reliably
  const loadEvents = React.useCallback(async (showLoading = true) => {
    if (showLoading && events.length === 0) setLoading(true);
    setError(null);
    try {
      await fetchEvents();
    } catch (e: any) {
      console.error('Failed to load events:', e);
      setError('Unable to retrieve academic events.');
    } finally {
      setLoading(false);
    }
  }, [fetchEvents, events.length]);

  useEffect(() => {
    loadEvents(events.length === 0);
  }, [loadEvents]);

  // Form handling
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<EventFormValues>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: {
      title: '',
      date: '',
      startTime: '',
      endTime: '',
      venue: '',
      description: '',
      eventType: 'Conferences',
      registrationLink: ''
    }
  });

  const onSubmit = async (data: EventFormValues) => {
    try {
      const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const d = new Date();
        d.setHours(parseInt(h, 10), parseInt(m, 10));
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      };
      const timeStr = `${formatTime(data.startTime)} - ${formatTime(data.endTime)}`;

      if (editingEventId) {
        await updateEvent(editingEventId, data.title, data.date, timeStr, data.venue, data.description, data.eventType, data.registrationLink);
      } else {
        await createEvent(data.title, data.date, timeStr, data.venue, data.description, data.eventType, data.registrationLink);
      }
      setIsDrawerOpen(false);
      setEditingEventId(null);
      reset();
      fetchEvents(); // Refresh items
      addToast(editingEventId ? 'Event updated' : 'Event published', 'success');
    } catch (e: any) {
      addToast(e?.message || 'The event could not be saved', 'error');
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Filtered Events for calendar view
  const filteredEvents = useMemo(() => {
    return (events || []).filter((e) => {
      if (!e || !e.title) return false;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || e.title.toLowerCase().includes(q) || (e.venue || '').toLowerCase().includes(q);
      const matchesCategory = eventMatchesCategory(e.eventType, activeCategory);
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, searchQuery, activeCategory]);

  const handlePrevDate = () => {
    const nextD = new Date(selectedDate);
    if (calendarView === 'month' || calendarView === 'agenda') {
      nextD.setMonth(nextD.getMonth() - 1);
    } else if (calendarView === 'week') {
      nextD.setDate(nextD.getDate() - 7);
    } else {
      nextD.setDate(nextD.getDate() - 1);
    }
    setSelectedDate(nextD);
  };

  const handleNextDate = () => {
    const nextD = new Date(selectedDate);
    if (calendarView === 'month' || calendarView === 'agenda') {
      nextD.setMonth(nextD.getMonth() + 1);
    } else if (calendarView === 'week') {
      nextD.setDate(nextD.getDate() + 7);
    } else {
      nextD.setDate(nextD.getDate() + 1);
    }
    setSelectedDate(nextD);
  };

  const canPostEvents =
    currentUser?.role === 'RESEARCH_SUPERVISOR' || (currentUser?.role as string) === 'INSTITUTE_ADMIN' || (currentUser?.role as string) === 'ADMIN';

  const openCreate = () => {
    setEditingEventId(null);
    reset({ title: '', date: '', startTime: '', endTime: '', venue: '', description: '', eventType: 'Conferences', registrationLink: '' });
    setIsDrawerOpen(true);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = filteredEvents.filter((e) => new Date(e.date).getTime() >= today.getTime()).slice(0, 6);

  const periodLabel =
    calendarView === 'day'
      ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  const fieldError = (msg?: string) =>
    msg ? <p role="alert" className="text-sm text-danger-700">{msg}</p> : null;

  return (
    <div className="text-left">
      <PageHeader
        title="Events"
        description="Conferences, seminars, workshops and doctoral reviews across SRMIST."
        actions={
          canPostEvents && (
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              Post event
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSelectedDate(new Date())}>Today</Button>
          <div className="flex items-center">
            <IconButton label={calendarView === 'day' ? 'Previous day' : calendarView === 'week' ? 'Previous week' : 'Previous month'} size="sm" onClick={handlePrevDate}>
              <ChevronLeft />
            </IconButton>
            <IconButton label={calendarView === 'day' ? 'Next day' : calendarView === 'week' ? 'Next week' : 'Next month'} size="sm" onClick={handleNextDate}>
              <ChevronRight />
            </IconButton>
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-ink" aria-live="polite">{periodLabel}</h2>
        </div>

        <div role="tablist" aria-label="Calendar view" className="inline-flex w-fit rounded-lg border border-line bg-surface-muted p-0.5">
          {(['day', 'week', 'month', 'agenda'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={calendarView === mode}
              onClick={() => setCalendarView(mode)}
              className={`h-8 rounded-md px-3 text-sm font-medium capitalize transition-colors ${
                calendarView === mode ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-72">
          <label htmlFor="event-search" className="sr-only">Search events</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            id="event-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or venue"
            className="cb-input h-9 pl-9"
          />
        </div>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Filter by category">
          <div className="flex min-w-max gap-1.5">
            {['All', ...EVENT_CATEGORIES.map((c) => c.label)].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
                className={`h-8 rounded-full border px-3 text-sm transition-colors ${
                  activeCategory === cat ? 'border-ink bg-ink font-medium text-ink-inverse' : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {/* ── Full-width calendar ── */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
          {loading && events.length === 0 ? (
            <div className="p-4" role="status" aria-label="Loading events">
              <div className="grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
              </div>
            </div>
          ) : error && events.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Events didn't load"
              description="This is usually a temporary connection problem."
              action={<Button variant="secondary" onClick={() => loadEvents(true)}>Try again</Button>}
            />
          ) : (
            <PremiumCalendarWidget
              events={filteredEvents}
              onEventClick={(evt) => setSelectedEvent(evt as PrismaEvent)}
              view={calendarView}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          )}
        </div>

        {/* ── Upcoming events strip ── */}
        {upcoming.length > 0 && (
          <section aria-labelledby="upcoming-title">
            <h2 id="upcoming-title" className="mb-3 text-sm font-semibold text-ink">Upcoming events</h2>
            <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
              <div className="flex min-w-max gap-3 pb-1">
                {upcoming.map((event) => {
                  const d = new Date(event.date);
                  const cat = eventCategory(event.eventType);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEvent(event as PrismaEvent)}
                      className="group flex w-64 shrink-0 gap-3 rounded-xl border border-line bg-surface p-3 text-left shadow-xs transition-all duration-base hover:border-brand/40 hover:shadow-md"
                    >
                      <span className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-line bg-surface-muted py-1 text-center">
                        <span className="text-2xs font-medium uppercase text-danger-700">{d.toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="text-base font-semibold leading-tight tabular-nums text-ink">{d.getDate()}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-medium text-ink group-hover:text-brand">{event.title}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                          <Clock className="size-3" aria-hidden />
                          {event.time}
                        </span>
                        {cat && <Badge tone={cat.tone} className="mt-1.5">{cat.label}</Badge>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>

      <EventDetailModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        onEdit={(event) => {
          setSelectedEvent(null);
          setEditingEventId(event.id);

          let st = '';
          let et = '';
          try {
            const parts = (event.time || '').split(' - ');
            const to24h = (t: string) => {
              const match = t.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
              if (!match) return '';
              let hr = parseInt(match[1], 10);
              const m = match[2];
              const period = match[3].toUpperCase();
              if (period === 'PM' && hr < 12) hr += 12;
              if (period === 'AM' && hr === 12) hr = 0;
              return `${hr.toString().padStart(2, '0')}:${m}`;
            };
            if (parts.length === 2) {
              st = to24h(parts[0]);
              et = to24h(parts[1]);
            }
          } catch (e) {}

          reset({
            title: event.title,
            date: new Date(event.date).toISOString().split('T')[0],
            startTime: st,
            endTime: et,
            venue: event.venue,
            description: event.description || '',
            eventType: event.eventType || 'Conferences',
            registrationLink: event.registrationLink || ''
          });
          setIsDrawerOpen(true);
        }}
        onDelete={(id) => setDeletingEventId(id)}
      />

      <Dialog
        open={!!deletingEventId}
        onClose={() => setDeletingEventId(null)}
        dismissible={!isDeleting}
        size="sm"
        title="Delete this event?"
        description="It will be removed from the calendar for everyone. This can't be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingEventId(null)} disabled={isDeleting}>Cancel</Button>
            <Button
              variant="danger"
              loading={isDeleting}
              onClick={async () => {
                if (!deletingEventId) return;
                setIsDeleting(true);
                try {
                  await deleteEvent(deletingEventId);
                  setSelectedEvent(null);
                  fetchEvents();
                  addToast('Event deleted', 'success');
                } catch (e: any) {
                  addToast(e?.message || 'The event could not be deleted', 'error');
                } finally {
                  setIsDeleting(false);
                  setDeletingEventId(null);
                }
              }}
            >
              Delete event
            </Button>
          </>
        }
      />

      <Dialog
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        side="right"
        title={editingEventId ? 'Edit event' : 'Post an event'}
        description="Published events appear on the calendar for everyone at SRMIST."
      >
        <form id="event-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="ev-title" className="block text-sm font-medium text-ink">Title</label>
            <input id="ev-title" type="text" {...register('title')} aria-invalid={!!errors.title} placeholder="e.g. Doctoral committee review: Neural fields" className="cb-input" />
            {fieldError(errors.title?.message)}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ev-type" className="block text-sm font-medium text-ink">Category</label>
            <select id="ev-type" {...register('eventType')} className="cb-input">
              <option value="Conferences">Conference</option>
              <option value="Seminars">Seminar</option>
              <option value="Workshops">Workshop</option>
              <option value="Webinars">Webinar</option>
              <option value="Research Talks">Research talk</option>
              <option value="Faculty Development">Faculty development</option>
              <option value="PhD / Research Scholar Events">PhD / research scholar event</option>
              <option value="Other">Other</option>
            </select>
            {fieldError(errors.eventType?.message)}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-3">
              <label htmlFor="ev-date" className="block text-sm font-medium text-ink">Date</label>
              <input id="ev-date" type="date" {...register('date')} aria-invalid={!!errors.date} className="cb-input" />
              {fieldError(errors.date?.message)}
            </div>
            <div className="space-y-1.5 sm:col-span-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
              <div className="space-y-1.5">
                <label htmlFor="ev-start" className="block text-sm font-medium text-ink">Starts</label>
                <input id="ev-start" type="time" {...register('startTime')} aria-invalid={!!errors.startTime} className="cb-input" />
                {fieldError(errors.startTime?.message)}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ev-end" className="block text-sm font-medium text-ink">Ends</label>
                <input id="ev-end" type="time" {...register('endTime')} aria-invalid={!!errors.endTime} className="cb-input" />
                {fieldError(errors.endTime?.message)}
              </div>
            </div>
          </div>

          <SRMVenueSelector
            value={watch('venue')}
            onChange={(val) => setValue('venue', val, { shouldValidate: true })}
            error={errors.venue?.message}
          />

          <div className="space-y-1.5">
            <label htmlFor="ev-link" className="block text-sm font-medium text-ink">Registration link <span className="font-normal text-ink-muted">(optional)</span></label>
            <input id="ev-link" type="url" {...register('registrationLink')} placeholder="https://forms.gle/…" className="cb-input" aria-describedby="ev-link-help" />
            <p id="ev-link-help" className="text-sm text-ink-muted">A Google Form or other page where people can register.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ev-desc" className="block text-sm font-medium text-ink">Details <span className="font-normal text-ink-muted">(optional)</span></label>
            <textarea id="ev-desc" rows={4} {...register('description')} placeholder="Speakers, agenda or deadlines" className="cb-input resize-y" />
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-5">
            <Button variant="secondary" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{editingEventId ? 'Save changes' : 'Publish event'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
