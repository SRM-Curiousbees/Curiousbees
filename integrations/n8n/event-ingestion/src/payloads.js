// Request bodies for the CuriousBees integration endpoints. They carry the
// email's metadata and the list of links found in it, never the email body.

function sourceFor(email) {
  return {
    provider: 'gmail',
    messageId: String(email.messageId),
    threadId: email.threadId || null,
    from: email.from ? String(email.from).slice(0, 512) : null,
    subject: email.subject ? String(email.subject).slice(0, 1000) : null,
    receivedAt: email.receivedAt || null,
  };
}

function prefilterFor(filter) {
  if (!filter) return null;
  const score = Number(filter.score);
  return { score: Number.isFinite(score) ? Math.max(-1000, Math.min(1000, Math.round(score))) : null };
}

/** POST /integrations/n8n/events: one extracted email. */
function ingestPayload(email, extraction, ai, filter) {
  return {
    source: { ...sourceFor(email), urls: Array.isArray(email.urls) ? email.urls.slice(0, 500) : [] },
    extraction,
    ai: ai || null,
    prefilter: prefilterFor(filter),
  };
}

/** POST /integrations/n8n/events/skipped: rejected by the pre-filter, or the AI step failed. */
function skippedPayload(email, stage, reason, filter, ai) {
  return {
    source: sourceFor(email),
    stage,
    reason: reason ? String(reason).slice(0, 500) : null,
    ai: ai || null,
    prefilter: prefilterFor(filter),
  };
}

if (typeof module !== 'undefined') module.exports = { ingestPayload, skippedPayload, sourceFor };
