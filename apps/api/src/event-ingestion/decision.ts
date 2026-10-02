import { z } from 'zod';
import {
  DEFAULT_TIMEZONE,
  cleanText,
  isValidTimeZone,
  normalizeDate,
  normalizeTime,
  normalizeUrl,
} from './normalize';

/** At or above: eligible for automatic creation. */
export const AUTO_CREATE_CONFIDENCE = 0.9;
/** At or above (and below AUTO_CREATE_CONFIDENCE): an administrator reviews it. Below: not used. */
export const REVIEW_CONFIDENCE = 0.7;
/** Events further ahead than this are unusual enough to check by hand. */
const MAX_DAYS_AHEAD = 730;

const optionalText = z.union([z.string(), z.null()]).optional();

/** What the workflow sends after the AI step. Unknown keys are dropped. */
export const extractionSchema = z.object({
  isEvent: z.boolean(),
  confidence: z.number().min(0).max(1),
  title: optionalText,
  description: optionalText,
  startDate: optionalText,
  startTime: optionalText,
  endDate: optionalText,
  endTime: optionalText,
  timezone: optionalText,
  location: optionalText,
  organizer: optionalText,
  category: optionalText,
  eventUrl: optionalText,
  registrationUrl: optionalText,
  meetingUrl: optionalText,
});

export type Extraction = z.infer<typeof extractionSchema>;

export interface NormalizedEvent {
  title: string | null;
  description: string | null;
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  timezone: string;
  location: string | null;
  organizer: string | null;
  category: string | null;
  eventUrl: string | null;
  registrationUrl: string | null;
  meetingUrl: string | null;
}

export type Outcome = 'create' | 'review' | 'not_event';

export interface Decision {
  outcome: Outcome;
  reasons: string[];
  event: NormalizedEvent;
}

function todayIn(timeZone: string, now: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

/** Cleans every field. Values that can't be read reliably become null; nothing is filled in. */
export function normalizeExtraction(x: Extraction): { event: NormalizedEvent; problems: string[] } {
  const problems: string[] = [];

  const tzRaw = cleanText(x.timezone, 64);
  let timezone = DEFAULT_TIMEZONE;
  if (tzRaw) {
    if (isValidTimeZone(tzRaw)) timezone = tzRaw;
    else problems.push(`Unrecognised timezone "${tzRaw}"`);
  }

  const startDate = normalizeDate(x.startDate);
  if (x.startDate && !startDate) problems.push('The start date could not be read reliably');
  const startTime = normalizeTime(x.startTime);
  if (x.startTime && !startTime) problems.push('The start time could not be read reliably');
  const endDate = normalizeDate(x.endDate);
  const endTime = normalizeTime(x.endTime);

  const event: NormalizedEvent = {
    title: cleanText(x.title, 200),
    description: cleanText(x.description, 5000),
    startDate,
    startTime,
    endDate,
    endTime,
    timezone,
    location: cleanText(x.location, 300),
    organizer: cleanText(x.organizer, 200),
    category: cleanText(x.category, 100),
    eventUrl: normalizeUrl(x.eventUrl),
    registrationUrl: normalizeUrl(x.registrationUrl),
    meetingUrl: normalizeUrl(x.meetingUrl),
  };
  return { event, problems };
}

/**
 * Decides what happens to one extraction. Automatic creation needs high
 * confidence, a trusted sender and a complete, plausible date and start time;
 * anything less goes to review, and weak or negative classifications are dropped.
 */
export function decide(x: Extraction, ctx: { trustedSender: boolean; now?: Date }): Decision {
  const now = ctx.now ?? new Date();
  const { event, problems } = normalizeExtraction(x);

  if (!x.isEvent) return { outcome: 'not_event', reasons: ['The email does not describe an event'], event };
  if (x.confidence < REVIEW_CONFIDENCE) {
    return { outcome: 'not_event', reasons: [`Confidence ${x.confidence.toFixed(2)} is below ${REVIEW_CONFIDENCE}`], event };
  }

  const reasons = [...problems];
  if (!event.title) reasons.push('Missing title');
  if (!event.startDate) {
    if (!x.startDate) reasons.push('Missing a reliable date');
  }
  if (!event.startTime) {
    if (!x.startTime) reasons.push('Missing a reliable start time');
  }

  if (event.startDate) {
    const today = todayIn(event.timezone, now);
    const ahead = daysBetween(today, event.startDate);
    if (ahead < 0) reasons.push('The event date has already passed');
    if (ahead > MAX_DAYS_AHEAD) reasons.push('The event is more than two years away');
  }
  if (event.startDate && event.endDate && event.endDate < event.startDate) reasons.push('The end date is before the start date');
  if (
    event.startDate &&
    event.startTime &&
    event.endTime &&
    (event.endDate ?? event.startDate) === event.startDate &&
    event.endTime <= event.startTime
  ) {
    reasons.push('The end time is not after the start time');
  }

  if (x.confidence < AUTO_CREATE_CONFIDENCE) reasons.push(`Confidence ${x.confidence.toFixed(2)} needs a review`);
  if (!ctx.trustedSender) reasons.push('The sender is not on the trusted list');

  return { outcome: reasons.length === 0 ? 'create' : 'review', reasons, event };
}

/** Whether the normalized event has what's needed to create it (used for duplicate checks and approval). */
export function hasRequiredFields(e: NormalizedEvent): e is NormalizedEvent & { title: string; startDate: string; startTime: string } {
  return Boolean(e.title && e.startDate && e.startTime);
}
