// Cheap, rule-based screening that runs before any AI call. Only emails that
// look like event announcements go on to Gemini; everything else is recorded
// as "skipped" and costs nothing. The signals are kept (names only, no email
// content) so a wrong decision can be understood later.

const DEFAULT_MIN_SCORE = 4;

const EVENT_WORDS =
  /\b(seminars?|webinars?|workshops?|conferences?|symposi(?:um|a)|colloqui(?:um|a)|guest lectures?|lectures?|expert talks?|talks?|keynotes?|hackathons?|viva(?:[- ]voce)?|defen[cs]e|orientation|training|bootcamps?|fdp|faculty development|panel discussions?|summit|contests?|competitions?|sessions?|meet-?ups?|invitations?|invited|invites?|save the date|rsvp|registration|register)\b/i;
const EVENT_WORDS_ANYWHERE = new RegExp(EVENT_WORDS.source, 'gi');

const MONTH_DATE =
  /\b(\d{1,2}(?:st|nd|rd|th)?\s*(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?(?:,?\s*\d{4})?|(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)\b/i;
const NUMERIC_DATE = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/;
const TIME = /\b(\d{1,2}[:.]\d{2}\s*(?:a\.?m\.?|p\.?m\.?|hrs?|hours)?|\d{1,2}\s*(?:a\.?m\.?|p\.?m\.?))(?![\d])/i;
const VENUE = /\b(venue|auditorium|seminar hall|conference hall|hall|room|lab(?:oratory)?|campus|block|online|virtual|hybrid)\b/i;
const MEETING_HOSTS = /(^|\.)(meet\.google\.com|zoom\.us|zoom\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com)$/i;
const REGISTRATION_LINK = /(forms\.gle|docs\.google\.com\/forms|forms\.office\.com|eventbrite\.|konfhub\.|unstop\.com|register|registration|rsvp)/i;

// Never worth an AI call, whatever else the email says.
const HARD_REJECTS = [
  { signal: 'security_code', test: (e) => /\b(one[- ]time password|otp|verification code|security code|password reset|reset your password|verify your (email|account)|sign[- ]in attempt|two[- ]factor|2fa)\b/i.test(`${e.subject}\n${e.head}`) },
  { signal: 'bounce', test: (e) => /^(mailer-daemon|postmaster)@/i.test(e.fromAddress || '') || /^(undeliverable|delivery status notification|mail delivery failed)/i.test(e.subject) },
  { signal: 'auto_reply', test: (e) => e.autoReply || /^(automatic reply|auto(?:matic)?[- ]?reply|out of (the )?office)\b/i.test(e.subject) },
  { signal: 'calendar_response', test: (e) => /^(accepted|declined|tentative(ly accepted)?|updated invitation with note)\s*:/i.test(e.subject) },
];

const NEGATIVE = [
  { signal: 'transactional', weight: -4, test: (e) => /\b(invoice|receipt|payment (received|due|successful|failed)|order (confirmed|confirmation|#)|has shipped|your order|refund|subscription (renewal|renewed)|statement is ready)\b/i.test(`${e.subject}\n${e.head}`) },
  { signal: 'promotion', weight: -3, test: (e) => /\b(\d{1,2}% off|discount|coupon|sale ends|offer ends|limited[- ]time offer|buy now|shop now|free trial)\b/i.test(`${e.subject}\n${e.head}`) },
  { signal: 'social_notification', weight: -3, test: (e) => /\b(commented on|liked your|mentioned you|new follower|sent you a message|tagged you|connection request)\b/i.test(`${e.subject}\n${e.head}`) },
  { signal: 'bulk_mail', weight: -2, test: (e) => e.bulk && !e.trusted },
  { signal: 'no_reply_sender', weight: -1, test: (e) => /^(no-?reply|do-?not-?reply|notifications?)@/i.test(e.fromAddress || '') && !e.trusted },
];

const POSITIVE = [
  { signal: 'event_word_in_subject', weight: 3, test: (e) => EVENT_WORDS.test(e.subject) },
  { signal: 'event_words_in_body', weight: 1, test: (e) => (e.head.match(EVENT_WORDS_ANYWHERE) || []).length >= 2 },
  { signal: 'mentions_a_date', weight: 2, test: (e) => MONTH_DATE.test(`${e.subject}\n${e.head}`) || NUMERIC_DATE.test(`${e.subject}\n${e.head}`) },
  { signal: 'mentions_a_time', weight: 1, test: (e) => TIME.test(e.head) },
  { signal: 'mentions_a_venue', weight: 1, test: (e) => VENUE.test(e.head) },
  { signal: 'meeting_link', weight: 2, test: (e) => e.hosts.some((h) => MEETING_HOSTS.test(h)) },
  { signal: 'registration_link', weight: 1, test: (e) => e.urls.some((u) => REGISTRATION_LINK.test(u)) },
  { signal: 'calendar_invite', weight: 3, test: (e) => e.hasCalendarInvite },
  { signal: 'trusted_sender', weight: 2, test: (e) => e.trusted },
];

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isTrustedDomain(address, domains) {
  const domain = String(address || '').split('@')[1];
  if (!domain) return false;
  return (domains || []).some((d) => {
    const entry = String(d).trim().toLowerCase().replace(/^@/, '');
    return entry && (domain === entry || domain.endsWith(`.${entry}`));
  });
}

/**
 * Scores one normalised email. Returns whether it should go to the AI step,
 * the score, the signals that fired and, when skipped, a short reason.
 */
function scoreCandidate(email, settings = {}) {
  const minScore = Number.isFinite(Number(settings.minCandidateScore)) ? Number(settings.minCandidateScore) : DEFAULT_MIN_SCORE;
  const urls = Array.isArray(email.urls) ? email.urls : [];
  const e = {
    subject: String(email.subject || ''),
    // The opening of the body carries the announcement; long footers add noise.
    head: String(email.text || '').slice(0, 4000),
    fromAddress: email.fromAddress || '',
    urls,
    hosts: urls.map(hostOf),
    bulk: Boolean(email.bulk),
    autoReply: Boolean(email.autoReply),
    hasCalendarInvite: Boolean(email.hasCalendarInvite),
    trusted: isTrustedDomain(email.fromAddress, settings.trustedSenderDomains),
  };

  const rejected = HARD_REJECTS.find((r) => r.test(e));
  if (rejected) {
    return { candidate: false, score: -100, signals: [rejected.signal], reason: `Not an event: ${rejected.signal.replace(/_/g, ' ')}` };
  }

  const signals = [];
  let score = 0;
  for (const rule of [...POSITIVE, ...NEGATIVE]) {
    if (rule.test(e)) {
      score += rule.weight;
      signals.push(rule.signal);
    }
  }
  const candidate = score >= minScore;
  return {
    candidate,
    score,
    signals,
    reason: candidate ? null : `Pre-filter score ${score} is below ${minScore}`,
  };
}

if (typeof module !== 'undefined') module.exports = { scoreCandidate, isTrustedDomain, DEFAULT_MIN_SCORE };
