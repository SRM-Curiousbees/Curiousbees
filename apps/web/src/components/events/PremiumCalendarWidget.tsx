'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Calendar as CalendarIcon, 
  ExternalLink,
  X
} from 'lucide-react';
import { Event } from '@curiousbees/types';
import { formatVenueDisplay } from '@/constants/srmVenues';
import { EVENT_CHIP, eventCategory } from '@/lib/event-categories';
import { Badge } from '@/components/ui/badge';

interface PremiumCalendarWidgetProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  view: 'month' | 'week' | 'day' | 'agenda';
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const HOURS = [
  { label: '6:00 AM', hour: 6 },
  { label: '7:00 AM', hour: 7 },
  { label: '8:00 AM', hour: 8 },
  { label: '9:00 AM', hour: 9 },
  { label: '10:00 AM', hour: 10 },
  { label: '11:00 AM', hour: 11 },
  { label: '12:00 PM', hour: 12 },
  { label: '1:00 PM', hour: 13 },
  { label: '2:00 PM', hour: 14 },
  { label: '3:00 PM', hour: 15 },
  { label: '4:00 PM', hour: 16 },
  { label: '5:00 PM', hour: 17 },
  { label: '6:00 PM', hour: 18 },
  { label: '7:00 PM', hour: 19 },
  { label: '8:00 PM', hour: 20 },
  { label: '9:00 PM', hour: 21 },
];

const HOUR_HEIGHT = 64; // px per hour slot

/**
 * Safely parses any date string (ISO '2026-08-15T00:00:00.000Z', '2026-08-15', or Date object)
 * into a consistent local YYYY-M-D key for calendar cell indexing.
 */
function getEventDateKey(dateInput: string | Date | null | undefined): string | null {
  if (!dateInput) return null;
  try {
    let d: Date;
    if (typeof dateInput === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        const [y, m, day] = dateInput.split('-').map(Number);
        return `${y}-${m - 1}-${day}`;
      }
      d = new Date(dateInput);
    } else {
      d = dateInput;
    }
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  } catch {
    return null;
  }
}

function parseEventTimeRange(timeStr: string | undefined) {
  if (!timeStr) return { startHour: 9, startMinute: 0, durationMinutes: 60, displayTime: '10:00 AM' };
  try {
    const parts = timeStr.split(' - ');
    const parseTime = (t: string) => {
      const match = t.trim().match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
      if (!match) return { h: 9, m: 0 };
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      const period = match[3]?.toUpperCase();
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return { h, m };
    };

    const start = parseTime(parts[0]);
    const clampedStartHour = Math.max(6, Math.min(21, start.h));

    if (parts.length > 1) {
      const end = parseTime(parts[1]);
      let duration = (end.h - start.h) * 60 + (end.m - start.m);
      if (duration <= 0) duration = 60;
      return { 
        startHour: clampedStartHour, 
        startMinute: start.m, 
        durationMinutes: Math.min(duration, 300),
        displayTime: timeStr
      };
    }
    return { startHour: clampedStartHour, startMinute: start.m, durationMinutes: 60, displayTime: timeStr };
  } catch (e) {
    return { startHour: 9, startMinute: 0, durationMinutes: 60, displayTime: timeStr || '10:00 AM' };
  }
}

export function PremiumCalendarWidget({ 
  events = [], 
  onEventClick, 
  view, 
  selectedDate, 
  onDateChange 
}: PremiumCalendarWidgetProps) {
  
  // Group events by date string (YYYY-M-D)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    (events || []).forEach(e => {
      if (!e || !e.date) return;
      const key = getEventDateKey(e.date);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(e);
    });
    return map;
  }, [events]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // --- MONTH VIEW DATA ---
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthDays = useMemo(() => {
    const arr = [];
    for (let i = 0; i < startOffset; i++) {
      arr.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i));
    }
    const remainingCells = (7 - (arr.length % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
      arr.push(null);
    }
    return arr;
  }, [selectedDate, daysInMonth, startOffset]);

  // --- WEEK VIEW DATA ---
  const weekDays = useMemo(() => {
    const arr = [];
    const dayOfWeek = selectedDate.getDay();
    const startOfWeek = new Date(selectedDate);
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(selectedDate.getDate() - distanceToMonday);

    for (let i = 0; i < 7; i++) {
      arr.push(new Date(startOfWeek));
      startOfWeek.setDate(startOfWeek.getDate() + 1);
    }
    return arr;
  }, [selectedDate]);

  // Agenda Filter State
  const [agendaFilter, setAgendaFilter] = useState<'all' | 'today' | 'upcoming' | 'this_week'>('upcoming');
  const [miniCalDate, setMiniCalDate] = useState<Date>(selectedDate);
  // No date pre-selected: the agenda opens on the Upcoming filter.
  const [agendaSelectedDate, setAgendaSelectedDate] = useState<Date | null>(null);

  const miniDaysInMonth = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth() + 1, 0).getDate();
  const miniFirstDay = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), 1).getDay();
  const miniStartOffset = miniFirstDay === 0 ? 6 : miniFirstDay - 1;

  const miniMonthDays = useMemo(() => {
    const arr = [];
    for (let i = 0; i < miniStartOffset; i++) arr.push(null);
    for (let i = 1; i <= miniDaysInMonth; i++) {
      arr.push(new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), i));
    }
    return arr;
  }, [miniCalDate, miniDaysInMonth, miniStartOffset]);

  return (
    <div className="w-full text-left">
      
      {/* ─── 1. DAY VIEW (Google Calendar Standard Positioned Grid) ─── */}
      {view === 'day' && (
        <div className="w-full">
          {/* Day Header Bar */}
          <div className="border-b border-line bg-surface-muted py-2.5 text-center text-sm font-medium text-ink">
            {selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>

          {/* Timetable Vertical Grid Container */}
          <div className="flex relative overflow-y-auto max-h-[700px]">
            {/* Time Column */}
            <div className="w-20 shrink-0 border-r border-line bg-surface-muted/60">
              {HOURS.map(hObj => (
                <div key={hObj.label} style={{ height: `${HOUR_HEIGHT}px` }} className="flex items-start justify-end border-b border-line p-2 text-right text-xs tabular-nums text-ink-muted">
                  {hObj.label}
                </div>
              ))}
            </div>

            {/* Event Canvas Grid Area */}
            <div className="flex-1 relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
              {/* Background Grid Lines */}
              {HOURS.map(hObj => (
                <div
                  key={hObj.label}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className="w-full border-b border-line/70"
                />
              ))}

              {/* Render Positioned Event Cards */}
              {(() => {
                const key = getEventDateKey(selectedDate);
                const dayEvents = key ? (eventsByDate.get(key) || []) : [];

                if (dayEvents.length === 0) {
                  return (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">
                      No events on this day
                    </div>
                  );
                }

                return dayEvents.map(event => {
                  const { startHour, startMinute, durationMinutes, displayTime } = parseEventTimeRange(event.time);
                  const topOffset = (startHour - 6 + startMinute / 60) * HOUR_HEIGHT;
                  const cardHeight = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 48);
                  const venueInfo = formatVenueDisplay(event.venue);

                  return (
                    <button
                      type="button"
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      style={{
                        top: `${Math.max(0, topOffset)}px`,
                        height: `${cardHeight}px`,
                        left: '12px',
                        right: '12px'
                      }}
                      className={`absolute z-raised overflow-hidden rounded-lg border-l-[3px] px-3 py-2 text-left transition-[filter] hover:brightness-95 ${EVENT_CHIP[eventCategory(event.eventType)?.tone ?? 'neutral']}`}
                    >
                      <span className="block truncate text-sm font-medium">{event.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs opacity-80">
                        <span className="inline-flex items-center gap-1"><Clock className="size-3" aria-hidden />{displayTime}</span>
                        {venueInfo.title && <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden />{venueInfo.title}</span>}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. WEEK VIEW (Positioned 7-Day Vertical Columns) ─── */}
      {view === 'week' && (
        <div className="w-full overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Week Days Header Bar */}
            <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-line bg-surface-muted">
              <div className="border-r border-line" />
              {weekDays.map(date => {
                const isSelected = selectedDate.toDateString() === date.toDateString();
                const isToday = new Date().toDateString() === date.toDateString();
                const dayLabel = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(date.getDay() + 6) % 7];
                const dateNum = date.getDate();

                return (
                  <button
                    type="button"
                    key={date.toISOString()}
                    onClick={() => onDateChange(date)}
                    aria-pressed={isSelected}
                    aria-current={isToday ? 'date' : undefined}
                    className={`border-r border-line py-2 text-center transition-colors last:border-r-0 ${isSelected ? 'bg-brand-50/60' : 'hover:bg-neutral-100/70'}`}
                  >
                    <span className="block text-xs text-ink-muted">{dayLabel}</span>
                    <span className={`mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-sm tabular-nums ${
                      isToday ? 'bg-brand font-semibold text-white' : isSelected ? 'font-semibold text-brand-800' : 'text-ink'
                    }`}>
                      {dateNum}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Timetable Grid Canvas */}
            <div className="flex relative overflow-y-auto max-h-[700px]">
              {/* Time Column */}
              <div className="w-16 shrink-0 border-r border-line bg-surface-muted/60">
                {HOURS.map(hObj => (
                  <div key={hObj.label} style={{ height: `${HOUR_HEIGHT}px` }} className="flex items-start justify-end border-b border-line p-1.5 text-right text-xs tabular-nums text-ink-muted">
                    {hObj.label}
                  </div>
                ))}
              </div>

              {/* 7 Columns for Days */}
              <div className="grid grid-cols-7 flex-1 relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                {/* Vertical Grid Dividers */}
                {weekDays.map((date, dayIdx) => {
                  const key = getEventDateKey(date);
                  const dayEvents = key ? (eventsByDate.get(key) || []) : [];

                  return (
                    <div key={date.toISOString()} className="relative h-full border-r border-line last:border-r-0">
                      {HOURS.map(hObj => (
                        <div key={hObj.label} style={{ height: `${HOUR_HEIGHT}px` }} className="w-full border-b border-line/70" />
                      ))}

                      {/* Positioned Events for Day */}
                      {dayEvents.map(event => {
                        const { startHour, startMinute, durationMinutes, displayTime } = parseEventTimeRange(event.time);
                        const topOffset = (startHour - 6 + startMinute / 60) * HOUR_HEIGHT;
                        const cardHeight = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 40);

                        return (
                          <button
                            type="button"
                            key={event.id}
                            onClick={() => onEventClick(event)}
                            style={{
                              top: `${Math.max(0, topOffset)}px`,
                              height: `${cardHeight}px`,
                              left: '4px',
                              right: '4px'
                            }}
                            className={`absolute z-raised overflow-hidden rounded-md border-l-2 p-1.5 text-left transition-[filter] hover:brightness-95 ${EVENT_CHIP[eventCategory(event.eventType)?.tone ?? 'neutral']}`}
                            title={`${event.title} (${displayTime})`}
                          >
                            <span className="block truncate text-xs font-medium leading-tight">{event.title}</span>
                            <span className="mt-0.5 block truncate text-2xs opacity-80">{displayTime}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. MONTH VIEW ─── */}
      {view === 'month' && (
        <div className="w-full">
          <div className="grid grid-cols-7 border-b border-line bg-surface-muted" aria-hidden>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-ink-muted">
                <span className="sm:hidden">{day.charAt(0)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 [&>*]:border-b [&>*]:border-r [&>*]:border-line [&>*:nth-child(7n)]:border-r-0">
            {monthDays.map((date, i) => {
              if (!date) {
                return <div key={`empty-${i}`} className="min-h-[72px] bg-surface-muted/60 sm:min-h-[112px]" />;
              }

              const key = getEventDateKey(date);
              const dayEvents = key ? (eventsByDate.get(key) || []) : [];
              const isToday = new Date().toDateString() === date.toDateString();
              const isSelected = selectedDate.toDateString() === date.toDateString();
              const maxVisible = 2;
              const visibleEvents = dayEvents.slice(0, maxVisible);
              const extraCount = dayEvents.length - maxVisible;
              const label = date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

              return (
                <div
                  key={i}
                  className={`group flex min-h-[72px] flex-col p-1 transition-colors sm:min-h-[112px] sm:p-1.5 ${isSelected ? 'bg-brand-50/50' : 'bg-surface hover:bg-surface-muted/70'}`}
                >
                  <button
                    type="button"
                    onClick={() => onDateChange(date)}
                    aria-label={`${label}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}` : ''}`}
                    aria-current={isToday ? 'date' : undefined}
                    aria-pressed={isSelected}
                    className={`flex size-7 items-center justify-center rounded-full text-sm tabular-nums transition-colors ${
                      isToday ? 'bg-brand font-semibold text-white' : isSelected ? 'bg-brand-100 font-semibold text-brand-800' : 'text-ink-secondary hover:bg-neutral-100'
                    }`}
                  >
                    {date.getDate()}
                  </button>

                  <div className="mt-1 space-y-1">
                    {visibleEvents.map((event) => {
                      const tone = eventCategory(event.eventType)?.tone ?? 'neutral';
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => onEventClick(event)}
                          title={event.title}
                          className={`block w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-2xs font-medium leading-tight transition-[filter] hover:brightness-95 sm:text-xs ${EVENT_CHIP[tone]}`}
                        >
                          <span className="hidden sm:inline">{event.title}</span>
                          <span className="sm:hidden" aria-label={event.title}>•</span>
                        </button>
                      );
                    })}
                    {extraCount > 0 && (
                      <button type="button" onClick={() => onDateChange(date)} className="px-1 text-2xs font-medium text-brand hover:underline sm:text-xs">
                        +{extraCount} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 4. AGENDA VIEW ─── */}
      {view === 'agenda' && (
        <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-start">
          <div className="hidden w-64 shrink-0 rounded-xl border border-line p-4 lg:block">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setMiniCalDate(new Date(miniCalDate.getFullYear(), miniCalDate.getMonth() - 1, 1))}
                className="flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-100 hover:text-ink"
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-sm font-medium text-ink">{monthNames[miniCalDate.getMonth()]} {miniCalDate.getFullYear()}</p>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setMiniCalDate(new Date(miniCalDate.getFullYear(), miniCalDate.getMonth() + 1, 1))}
                className="flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-100 hover:text-ink"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 text-center text-xs text-ink-muted" aria-hidden>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {miniMonthDays.map((d, idx) => {
                if (!d) return <div key={idx} />;
                const isSelected = agendaSelectedDate?.toDateString() === d.toDateString();
                const isToday = new Date().toDateString() === d.toDateString();
                const hasEvents = (eventsByDate.get(getEventDateKey(d) || '') || []).length > 0;
                return (
                  <button
                    key={idx}
                    type="button"
                    aria-label={d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setAgendaSelectedDate(d);
                      onDateChange(d);
                    }}
                    className={`relative mx-auto flex size-8 items-center justify-center rounded-md text-sm tabular-nums transition-colors ${
                      isSelected ? 'bg-brand font-semibold text-white' : isToday ? 'font-semibold text-brand' : 'text-ink-secondary hover:bg-neutral-100'
                    }`}
                  >
                    {d.getDate()}
                    {hasEvents && !isSelected && <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-brand-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div role="tablist" aria-label="Agenda range" className="inline-flex rounded-lg border border-line bg-surface-muted p-0.5">
                {[
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'this_week', label: 'Next 7 days' },
                  { id: 'today', label: 'Today' },
                  { id: 'all', label: 'All' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={!agendaSelectedDate && agendaFilter === f.id}
                    onClick={() => {
                      setAgendaFilter(f.id as any);
                      setAgendaSelectedDate(null);
                    }}
                    className={`h-8 rounded-md px-3 text-sm font-medium transition-colors ${
                      !agendaSelectedDate && agendaFilter === f.id ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {agendaSelectedDate && (
                <button
                  type="button"
                  onClick={() => setAgendaSelectedDate(null)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 text-sm font-medium text-brand-800"
                >
                  {agendaSelectedDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  <X className="size-3.5" aria-label="Clear date" />
                </button>
              )}
            </div>

            {(() => {
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const list = (events || []).filter((e) => {
                if (!e || !e.date) return false;
                if (agendaSelectedDate) return getEventDateKey(e.date) === getEventDateKey(agendaSelectedDate);
                const eDate = new Date(e.date);
                if (isNaN(eDate.getTime())) return false;
                eDate.setHours(0, 0, 0, 0);
                if (agendaFilter === 'today') return getEventDateKey(e.date) === getEventDateKey(now);
                if (agendaFilter === 'upcoming') return eDate.getTime() >= now.getTime();
                if (agendaFilter === 'this_week') {
                  const weekEnd = new Date(now);
                  weekEnd.setDate(now.getDate() + 7);
                  return eDate.getTime() >= now.getTime() && eDate.getTime() <= weekEnd.getTime();
                }
                return true;
              }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

              if (list.length === 0) {
                return (
                  <div className="mt-4 rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
                    <p className="text-sm font-medium text-ink">No events in this range</p>
                    <p className="mt-1 text-sm text-ink-muted">Try another range or date, or clear the category filter.</p>
                  </div>
                );
              }

              const groups: { key: string; date: Date; items: Event[] }[] = [];
              list.forEach((e) => {
                const key = getEventDateKey(e.date) || '';
                const last = groups[groups.length - 1];
                if (last && last.key === key) last.items.push(e);
                else groups.push({ key, date: new Date(e.date), items: [e] });
              });

              return (
                <div className="mt-4 space-y-5">
                  {groups.map((g) => (
                    <section key={g.key} aria-label={g.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}>
                      <h3 className="mb-2 text-sm font-semibold text-ink">
                        {g.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                        {new Date().toDateString() === g.date.toDateString() && <span className="ml-2 font-normal text-brand">Today</span>}
                      </h3>
                      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                        {g.items.map((event) => {
                          const venueInfo = formatVenueDisplay(event.venue);
                          const cat = eventCategory(event.eventType);
                          return (
                            <li key={event.id}>
                              <button
                                type="button"
                                onClick={() => onEventClick(event)}
                                className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-surface-muted sm:flex-row sm:items-start sm:gap-4"
                              >
                                <span className="w-24 shrink-0 text-sm tabular-nums text-ink-secondary">{event.time || 'Time TBA'}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[15px] font-medium text-ink">{event.title}</span>
                                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                                    {venueInfo.title && (
                                      <span className="inline-flex items-center gap-1">
                                        <MapPin className="size-3.5" aria-hidden />
                                        {venueInfo.title}
                                      </span>
                                    )}
                                    {(event as any).registrationLink && (
                                      <span className="inline-flex items-center gap-1 text-success-700">
                                        <ExternalLink className="size-3.5" aria-hidden />
                                        Registration open
                                      </span>
                                    )}
                                  </span>
                                </span>
                                {cat && <Badge tone={cat.tone} className="self-start">{cat.label}</Badge>}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
