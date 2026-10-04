// Strictly validates Gemini's answer before anything reaches CuriousBees. A
// response that is blocked, cut off or doesn't match the schema is reported as
// an AI failure (retryable), never "repaired" by guessing.

const STRING_FIELDS = [
  'title', 'description', 'startDate', 'startTime', 'endDate', 'endTime', 'timezone',
  'location', 'organizer', 'category', 'eventUrl', 'registrationUrl', 'meetingUrl',
];
const MAX_LENGTH = { description: 5000, title: 300 };

function usageOf(response, fallbackModel) {
  const u = (response && response.usageMetadata) || {};
  const output = (Number(u.candidatesTokenCount) || 0) + (Number(u.thoughtsTokenCount) || 0);
  return {
    model: String((response && response.modelVersion) || fallbackModel || 'gemini').slice(0, 100),
    inputTokens: Number.isFinite(Number(u.promptTokenCount)) ? Math.max(0, Math.round(Number(u.promptTokenCount))) : null,
    outputTokens: output > 0 ? Math.round(output) : u.candidatesTokenCount === 0 ? 0 : null,
  };
}

function fail(error, ai) {
  return { ok: false, error: String(error).slice(0, 300), ai };
}

/** Removes ```json fences some models add despite responseMimeType. */
function stripFences(text) {
  const t = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return fenced ? fenced[1].trim() : t;
}

/**
 * Validates one generateContent response.
 * Returns { ok: true, extraction, ai } or { ok: false, error, ai }.
 */
function parseGeminiResponse(response, fallbackModel) {
  const ai = usageOf(response, fallbackModel);
  if (!response || typeof response !== 'object') return fail('Gemini returned an empty response', ai);
  if (response.error) return fail(`Gemini error: ${response.error.message || response.error.status || 'unknown'}`, ai);
  if (response.promptFeedback && response.promptFeedback.blockReason) {
    return fail(`Gemini blocked the request (${response.promptFeedback.blockReason})`, ai);
  }

  const candidate = Array.isArray(response.candidates) ? response.candidates[0] : null;
  if (!candidate) return fail('Gemini returned no answer', ai);
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    return fail(`Gemini stopped early (${candidate.finishReason})`, ai);
  }
  const parts = (candidate.content && Array.isArray(candidate.content.parts) ? candidate.content.parts : []).filter((p) => p && !p.thought);
  const text = parts.map((p) => (typeof p.text === 'string' ? p.text : '')).join('');
  if (!text.trim()) return fail('Gemini returned an empty answer', ai);

  let data;
  try {
    data = JSON.parse(stripFences(text));
  } catch {
    return fail('Gemini did not return valid JSON', ai);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('Gemini did not return a JSON object', ai);

  if (typeof data.isEvent !== 'boolean') return fail('Gemini answer is missing "isEvent"', ai);
  if (typeof data.confidence !== 'number' || !Number.isFinite(data.confidence) || data.confidence < 0 || data.confidence > 1) {
    return fail('Gemini answer has an invalid "confidence"', ai);
  }

  const extraction = { isEvent: data.isEvent, confidence: data.confidence };
  for (const field of STRING_FIELDS) {
    const value = data[field];
    if (value === undefined || value === null) {
      extraction[field] = null;
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      extraction[field] = trimmed ? trimmed.slice(0, MAX_LENGTH[field] || 2048) : null;
    } else {
      return fail(`Gemini answer has a non-text "${field}"`, ai);
    }
  }
  if (data.yearInferred !== undefined && data.yearInferred !== null && typeof data.yearInferred !== 'boolean') {
    return fail('Gemini answer has an invalid "yearInferred"', ai);
  }
  extraction.yearInferred = data.yearInferred === true;

  return { ok: true, extraction, ai };
}

if (typeof module !== 'undefined') module.exports = { parseGeminiResponse, stripFences };
