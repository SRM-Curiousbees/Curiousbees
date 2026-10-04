// Turns one Gmail Trigger item into the small, predictable shape the rest of
// the workflow uses: plain text with links kept beside their labels, the list of
// every link in the email, and a few headers that help the cheap pre-filter.
//
// Runs inside an n8n Code node (no require/import available) and under Node's
// test runner, so it only uses language built-ins.

const MAX_URLS = 300;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Unwraps redirect wrappers (Google, Outlook Safe Links) so the real destination is kept. */
function unwrapLink(raw) {
  let url = raw;
  for (let i = 0; i < 3; i++) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return url;
    }
    const host = parsed.hostname.toLowerCase();
    let inner = null;
    if ((host === 'www.google.com' || host === 'google.com') && parsed.pathname === '/url') inner = parsed.searchParams.get('q') || parsed.searchParams.get('url');
    else if (host.endsWith('safelinks.protection.outlook.com')) inner = parsed.searchParams.get('url');
    if (!inner || !/^https?:\/\//i.test(inner)) return url;
    url = inner;
  }
  return url;
}

/** Trims punctuation that commonly sticks to the end of a link in prose. */
function trimLink(raw) {
  let url = raw.replace(/[.,;:!?'"’”>]+$/, '');
  // Drop a trailing ")" or "]" only when it isn't balanced inside the link.
  while (/[)\]]$/.test(url)) {
    const close = url.slice(-1);
    const open = close === ')' ? '(' : '[';
    if (url.split(open).length >= url.split(close).length) break;
    url = url.slice(0, -1);
  }
  return url;
}

function cleanLink(raw) {
  if (typeof raw !== 'string') return null;
  const url = unwrapLink(trimLink(decodeEntities(raw.trim())));
  if (!/^https?:\/\/[^\s/$.?#][^\s]*$/i.test(url) || url.length > 2048) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('.') ? url : null;
  } catch {
    return null;
  }
}

/**
 * HTML → readable text. Links stay next to their label as "label (url)" so the
 * AI can tell a registration link from a meeting link.
 */
function htmlToText(html) {
  let text = String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(head|style|script|title)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_m, _q, href, label) => {
      const url = cleanLink(href);
      const labelText = decodeEntities(label.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
      if (!url) return labelText;
      if (!labelText || cleanLink(labelText) === url) return ` ${url} `;
      return `${labelText} (${url})`;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|table|section|article|blockquote)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<(td|th)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  text = decodeEntities(text);
  return text;
}

/** Removes quoted earlier messages ("> …", "On … wrote:", forwarded headers stay). */
function stripQuotedReplies(text) {
  const lines = text.split('\n');
  const out = [];
  for (const line of lines) {
    if (/^\s*On .{5,200} wrote:\s*$/.test(line)) break;
    if (/^\s*>/.test(line)) continue;
    out.push(line);
  }
  return out.join('\n');
}

function tidyText(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v  -​  　]+/g, ' ')
    .split('\n')
    .map((l) => l.replace(/ {2,}/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Replaces wrapped links in plain text with their real destination. */
function unwrapLinksInText(text) {
  return text.replace(/https?:\/\/[^\s<>"'[\]{}]+/gi, (raw) => {
    const trimmed = trimLink(raw);
    const unwrapped = cleanLink(trimmed);
    return unwrapped && unwrapped !== trimmed ? raw.replace(trimmed, unwrapped) : raw;
  });
}

function extractLinks(...sources) {
  const seen = new Set();
  const links = [];
  for (const source of sources) {
    if (!source) continue;
    const candidates = [];
    String(source).replace(/href\s*=\s*(["'])(.*?)\1/gi, (_m, _q, href) => candidates.push(href));
    String(source).replace(/https?:\/\/[^\s<>"'[\]{}]+/gi, (m) => candidates.push(m));
    for (const raw of candidates) {
      const url = cleanLink(raw);
      if (url && !seen.has(url)) {
        seen.add(url);
        links.push(url);
        if (links.length >= MAX_URLS) return links;
      }
    }
  }
  return links;
}

/** Header value from n8n's `headers` object ("name": "Name: value") or a raw header list. */
function header(json, name) {
  const lower = name.toLowerCase();
  const h = json.headers;
  if (h && typeof h === 'object' && !Array.isArray(h)) {
    for (const key of Object.keys(h)) {
      if (key.toLowerCase() === lower) {
        const v = String(h[key]);
        return v.toLowerCase().startsWith(`${lower}:`) ? v.slice(lower.length + 1).trim() : v.trim();
      }
    }
  }
  const list = Array.isArray(h) ? h : json.payload && Array.isArray(json.payload.headers) ? json.payload.headers : [];
  const found = list.find((x) => x && String(x.name || '').toLowerCase() === lower);
  return found ? String(found.value || '').trim() : '';
}

function parseAddress(value) {
  if (!value) return { address: null, name: null, text: null };
  if (typeof value === 'object') {
    const first = Array.isArray(value.value) ? value.value[0] : null;
    if (first && first.address) return { address: String(first.address).toLowerCase(), name: first.name || null, text: value.text || `${first.name || ''} <${first.address}>`.trim() };
    if (value.text) return parseAddress(String(value.text));
    return { address: null, name: null, text: null };
  }
  const text = String(value).trim();
  const angle = /^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>/.exec(text);
  if (angle) return { address: angle[2].toLowerCase(), name: angle[1].replace(/^["'\s]+|["'\s]+$/g, '') || null, text };
  const bare = /([^\s<>"]+@[^\s<>"]+)/.exec(text);
  return { address: bare ? bare[1].toLowerCase() : null, name: null, text };
}

function toIso(value) {
  if (value === undefined || value === null || value === '') return null;
  const asNumber = typeof value === 'string' && /^\d{10,}$/.test(value) ? Number(value) : value;
  const d = new Date(asNumber);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Body parts of a raw Gmail API message, when the trigger returns one. */
function rawParts(payload, out = { text: '', html: '' }) {
  if (!payload) return out;
  const data = payload.body && payload.body.data;
  if (data && typeof Buffer !== 'undefined') {
    const decoded = Buffer.from(String(data).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    if (payload.mimeType === 'text/plain' && !out.text) out.text = decoded;
    if (payload.mimeType === 'text/html' && !out.html) out.html = decoded;
  }
  for (const part of payload.parts || []) rawParts(part, out);
  return out;
}

function attachmentList(json) {
  const list = Array.isArray(json.attachments) ? json.attachments : [];
  return list.slice(0, 50).map((a) => ({
    filename: a && (a.filename || a.fileName) ? String(a.filename || a.fileName).slice(0, 200) : null,
    contentType: a && (a.contentType || a.mimeType) ? String(a.contentType || a.mimeType).slice(0, 100) : null,
    size: a && Number.isFinite(Number(a.size)) ? Number(a.size) : null,
  }));
}

/**
 * Normalises one Gmail Trigger item (with "Simplify" turned off).
 * Throws when the message has no Gmail ID, because idempotency depends on it.
 */
function normalizeEmail(json, settings = {}) {
  const maxBodyChars = Number(settings.maxBodyChars) > 0 ? Number(settings.maxBodyChars) : 12000;
  const messageId = json.id ? String(json.id) : null;
  if (!messageId) throw new Error('The Gmail item has no message ID; check that the trigger has "Simplify" turned off.');

  const raw = rawParts(json.payload);
  const html = typeof json.html === 'string' && json.html ? json.html : raw.html;
  const plain = typeof json.text === 'string' && json.text ? json.text : raw.text;
  const from = parseAddress(json.from || header(json, 'from'));
  const subject = String(json.subject || header(json, 'subject') || '').replace(/\s+/g, ' ').trim();

  // Quoted earlier messages are dropped, and so are the links inside them.
  const plainText = plain ? stripQuotedReplies(unwrapLinksInText(plain)) : '';
  const fullText = tidyText(plain ? plainText : html ? stripQuotedReplies(htmlToText(html)) : String(json.snippet || ''));
  const truncated = fullText.length > maxBodyChars;
  const text = truncated ? `${fullText.slice(0, maxBodyChars)}\n[…email shortened]` : fullText;

  const contentType = header(json, 'content-type').toLowerCase();
  const attachments = attachmentList(json);
  const precedence = header(json, 'precedence').toLowerCase();
  const autoSubmitted = header(json, 'auto-submitted').toLowerCase();

  return {
    messageId,
    threadId: json.threadId ? String(json.threadId) : null,
    from: from.text ? from.text.slice(0, 512) : null,
    fromAddress: from.address,
    fromName: from.name,
    subject: subject.slice(0, 1000),
    receivedAt: toIso(json.date) || toIso(json.internalDate) || toIso(header(json, 'date')),
    text,
    truncated,
    urls: extractLinks(plainText, html),
    attachments,
    hasCalendarInvite:
      contentType.includes('text/calendar') ||
      /text\/calendar/i.test(String(html || '')) ||
      attachments.some((a) => /\.ics$/i.test(a.filename || '') || /calendar/i.test(a.contentType || '')),
    bulk: Boolean(header(json, 'list-unsubscribe') || header(json, 'list-id')) || precedence === 'bulk' || precedence === 'list',
    autoReply: (autoSubmitted && autoSubmitted !== 'no') || /^auto_?reply$/.test(precedence) || Boolean(header(json, 'x-autoreply')),
    labelIds: Array.isArray(json.labelIds) ? json.labelIds.map(String) : [],
  };
}

if (typeof module !== 'undefined') module.exports = { normalizeEmail, htmlToText, extractLinks, unwrapLink, cleanLink };
