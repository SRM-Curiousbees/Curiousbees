/**
 * Event categories shown as calendar filters. `eventType` is free text on the
 * API (the form offers more options than the filters), so matching is by keyword.
 */
export type EventTone = 'brand' | 'sea' | 'plum' | 'warning' | 'success' | 'neutral';

export const EVENT_CATEGORIES: { label: string; keyword: string; tone: EventTone }[] = [
  { label: 'Conferences', keyword: 'conference', tone: 'brand' },
  { label: 'Workshops', keyword: 'workshop', tone: 'sea' },
  { label: 'Seminars & talks', keyword: 'seminar|talk|webinar', tone: 'plum' },
  { label: 'Thesis & PhD', keyword: 'thesis|phd|doctoral|defen', tone: 'warning' },
  { label: 'Competitions', keyword: 'competition|hackathon', tone: 'success' },
];

export function eventCategory(eventType?: string | null) {
  const t = (eventType || '').toLowerCase();
  return EVENT_CATEGORIES.find((c) => new RegExp(c.keyword).test(t));
}

export function eventMatchesCategory(eventType: string | null | undefined, label: string) {
  if (label === 'All') return true;
  return eventCategory(eventType)?.label === label;
}

/** Chip classes per tone (full class names so Tailwind can see them). */
export const EVENT_CHIP: Record<EventTone, string> = {
  brand: 'bg-brand-50 text-brand-800 border-l-brand-600',
  sea: 'bg-sea-50 text-sea-800 border-l-sea-500',
  plum: 'bg-plum-50 text-plum-800 border-l-plum-500',
  warning: 'bg-warning-50 text-warning-800 border-l-warning-500',
  success: 'bg-success-50 text-success-800 border-l-success-500',
  neutral: 'bg-neutral-100 text-ink border-l-neutral-400',
};
