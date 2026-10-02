/**
 * Pure helpers that turn the AI's extraction into values CuriousBees can store.
 * They never guess: anything ambiguous or malformed comes back as null, and the
 * caller sends the email for review instead of inventing a value.
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

function isoDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Accepts ISO dates (2026-10-15) and dates with a written month (15 October 2026,
 * Oct 15, 2026, 15-Oct-2026). Purely numeric forms like 05/10/2026 are rejected
 * because day/month order can't be known.
 */
export function normalizeDate(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.trim().replace(/(\d)(st|nd|rd|th)\b/gi, '$1').replace(/,/g, ' ').replace(/\s+/g, ' ');
  if (!s) return null;

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return isoDate(+m[1], +m[2], +m[3]);

  // 15 October 2026 / 15-Oct-2026 / 15.Oct.2026
  m = /^(\d{1,2})[\s.-]+([A-Za-z]+)[\s.-]+(\d{4})$/.exec(s);
  if (m && MONTHS[m[2].toLowerCase()]) return isoDate(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);

  // October 15 2026 / Oct-15-2026
  m = /^([A-Za-z]+)[\s.-]+(\d{1,2})[\s.-]+(\d{4})$/.exec(s);
  if (m && MONTHS[m[1].toLowerCase()]) return isoDate(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);

  return null;
}

/** Accepts 24-hour (14:30, 9.30) and 12-hour (2:30 pm, 2 PM, 10.30 a.m.) times. Returns HH:mm. */
export function normalizeTime(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\b([ap])\.?\s?m\.?/, '$1m');
  if (!s) return null;

  let m = /^(\d{1,2})(?:[:.](\d{2}))?\s?(am|pm)$/.exec(s);
  if (m) {
    let h = +m[1];
    const min = m[2] ? +m[2] : 0;
    if (h < 1 || h > 12 || min > 59) return null;
    if (m[3] === 'pm' && h !== 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  m = /^(\d{1,2})[:.](\d{2})(?::\d{2})?(?:\s?hrs?)?$/.exec(s);
  if (m) {
    const h = +m[1];
    const min = +m[2];
    if (h > 23 || min > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  return null;
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz.trim() || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Keeps http(s) links only, trimming punctuation that email text often wraps around them. */
export function normalizeUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.trim().replace(/^[<("'[]+/, '').replace(/[>)"'\].,;:!?]+$/, '');
  if (!s || s.length > 2048) return null;
  try {
    const url = new URL(s);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Trimmed single-line-friendly text, or null when empty. Long values are cut at `max`. */
export function cleanText(input: unknown, max: number): string | null {
  if (typeof input !== 'string') return null;
  const s = input.replace(/\u0000/g, '').trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** Title key for duplicate detection: ignores case, punctuation, Re:/Fwd: prefixes and extra spaces. */
export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/^((re|fw|fwd)\s*:\s*)+/i, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function emailDomain(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const m = /@([^@\s>]+)>?\s*$/.exec(email.trim());
  return m ? m[1].toLowerCase() : null;
}

/** Bare address from "Name <user@domain>" or "user@domain". */
export function emailAddress(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const m = /<([^<>\s]+@[^<>\s]+)>/.exec(input) || /([^\s<>"]+@[^\s<>"]+)/.exec(input);
  return m ? m[1].toLowerCase().slice(0, 254) : null;
}

/**
 * Whether a sender is on the configured trusted list. Entries are domains
 * ("srmist.edu.in", which also covers subdomains) or full addresses.
 */
export function isTrustedSender(sender: string | null, trusted: string[]): boolean {
  if (!sender) return false;
  const address = sender.toLowerCase();
  const domain = emailDomain(address);
  return trusted.some((entry) => {
    const e = entry.trim().toLowerCase();
    if (!e) return false;
    if (e.includes('@')) return e === address;
    return domain === e || (domain?.endsWith(`.${e}`) ?? false);
  });
}

export function parseList(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}
