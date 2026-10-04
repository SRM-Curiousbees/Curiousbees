/**
 * Display helpers for event links and times. Pure functions, no React, so they
 * can be tested on their own (tests/event-links.test.mts).
 */

/** The link as a URL only if it is http(s); anything else is not rendered. */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

const MEETING_PROVIDERS: [RegExp, string][] = [
  [/(^|\.)meet\.google\.com$/, 'Google Meet'],
  [/(^|\.)zoom\.(us|com)$/, 'Zoom'],
  [/(^|\.)teams\.(microsoft|live)\.com$/, 'Microsoft Teams'],
  [/(^|\.)webex\.com$/, 'Webex'],
];

/** "Google Meet", "Zoom", "Microsoft Teams", "Webex", or a neutral label for any other host. */
export function meetingProvider(value: string | null | undefined): string {
  const url = safeExternalUrl(value);
  if (!url) return 'Online meeting';
  const host = new URL(url).hostname.toLowerCase();
  return MEETING_PROVIDERS.find(([pattern]) => pattern.test(host))?.[1] ?? 'Online meeting';
}

/** Short name for a timezone on a date, e.g. "IST" for Asia/Kolkata; the IANA name if none exists. */
export function timeZoneLabel(timeZone: string | null | undefined, at: Date = new Date()): string | null {
  if (!timeZone) return null;
  try {
    const name = new Intl.DateTimeFormat('en-IN', { timeZone, timeZoneName: 'short' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value;
    return name && !/^GMT[+-]/.test(name) ? name : timeZone;
  } catch {
    return null;
  }
}
