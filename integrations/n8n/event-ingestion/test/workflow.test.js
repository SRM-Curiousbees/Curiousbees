// Checks the generated workflow.json: its wiring, that it carries no secrets,
// and that its Code nodes and IF conditions behave as intended when run the way
// n8n runs them (Gemini is mocked; nothing leaves this machine).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { output, NODE_NAMES: N, CREDENTIAL_PLACEHOLDER } = require('../build-workflow');
const f = require('./fixtures');

const FILE = path.join(__dirname, '..', 'workflow.json');
const raw = fs.readFileSync(FILE, 'utf8');
const workflow = JSON.parse(raw);
const node = (name) => workflow.nodes.find((n) => n.name === name);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

/** Runs a Code node ("Run Once for Each Item") with n8n's $json and $() helpers. */
async function runCode(name, $json, outputs) {
  const $ = (other) => {
    if (!(other in outputs)) throw new Error(`test did not provide output of "${other}"`);
    return { item: { json: outputs[other] }, first: () => ({ json: outputs[other] }) };
  };
  // `module` is undefined inside n8n; pass undefined so the embedded modules behave the same.
  const fn = new AsyncFunction('$json', '$', 'module', node(name).parameters.jsCode);
  const result = await fn($json, $, undefined);
  return result.json;
}

/** Evaluates an IF node's condition for an item. */
function ifPasses(name, $json) {
  const expr = node(name).parameters.conditions.conditions[0].leftValue.replace(/^=\{\{\s*|\s*\}\}$/g, '');
  return Boolean(new Function('$json', `return (${expr});`)($json));
}

/** Successor node names for an output index. */
const next = (name, index = 0) => ((workflow.connections[name] || {}).main || [])[index]?.map((l) => l.node) || [];

test('workflow.json is generated from src/ and up to date', () => {
  assert.equal(raw, output, 'Run: node integrations/n8n/event-ingestion/build-workflow.js');
});

test('imports inactive, with placeholder credentials and no secrets', () => {
  assert.equal(workflow.active, false);
  const creds = workflow.nodes.flatMap((n) => Object.values(n.credentials || {}));
  assert.ok(creds.length >= 5);
  for (const c of creds) assert.equal(c.id, CREDENTIAL_PLACEHOLDER);
  assert.deepEqual([...new Set(creds.map((c) => c.name))].sort(), ['CuriousBees API token', 'CuriousBees Gmail (curiousbees@srmist.edu.in)', 'Gemini API key']);
  for (const pattern of [/AIza[0-9A-Za-z_-]{20,}/, /Bearer [A-Za-z0-9._-]{20,}/, /xkeysib-/, /sk-[A-Za-z0-9]{20,}/, /postgres(ql)?:\/\//i, /DATABASE_URL|SERVICE_ROLE|CLIENT_SECRET|AWS_SECRET/]) {
    assert.doesNotMatch(raw, pattern);
  }
  assert.doesNotMatch(node(N.gemini).parameters.url, /key=/, 'the Gemini key must come from the credential header, not the URL');
});

test('Gmail trigger reads full messages and never downloads attachments', () => {
  const t = node(N.trigger);
  assert.equal(t.type, 'n8n-nodes-base.gmailTrigger');
  assert.equal(t.parameters.simple, false);
  assert.equal(t.parameters.options.downloadAttachments, false);
});

test('Gemini is reachable only through the pre-filter, after the duplicate check', () => {
  const into = (target) => Object.entries(workflow.connections).flatMap(([from, c]) => c.main.flatMap((outs, i) => outs.filter((l) => l.node === target).map(() => `${from}#${i}`)));
  assert.deepEqual(into(N.gemini), [`${N.isCandidate}#0`]);
  assert.deepEqual(into(N.isCandidate), [`${N.filter}#0`]);
  assert.deepEqual(into(N.filter), [`${N.isNew}#0`]);
  assert.deepEqual(into(N.isNew), [`${N.check}#0`]);
  assert.deepEqual(next(N.isNew, 1), [], 'already-processed emails stop here');
  assert.deepEqual(next(N.isCandidate, 1), [N.skipped]);
  assert.deepEqual(next(N.gemini, 0), [N.parse]);
  assert.deepEqual(next(N.gemini, 1), [N.geminiFailed]);
  assert.deepEqual(next(N.isValid, 0), [N.send]);
  assert.deepEqual(next(N.isValid, 1), [N.skipped]);
});

test('CuriousBees calls use the token credential, the configured API address and safe retries', () => {
  for (const [name, suffix] of [[N.check, '/check'], [N.send, ''], [N.skipped, '/skipped']]) {
    const n = node(name);
    assert.equal(n.parameters.genericAuthType, 'httpHeaderAuth');
    assert.equal(n.credentials.httpHeaderAuth.name, 'CuriousBees API token');
    assert.equal(n.parameters.url, `={{ $('${N.settings}').first().json.settings.apiBaseUrl }}/integrations/n8n/events${suffix}`);
    assert.equal(n.retryOnFail, true);
  }
  assert.equal(node(N.gemini).credentials.httpHeaderAuth.name, 'Gemini API key');
  assert.equal(node(N.gemini).onError, 'continueErrorOutput');
});

// ─── Simulated runs ────────────────────────────────────────────────────────

async function upToFilter(item, settingsOverride = {}) {
  const withSettings = await runCode(N.settings, item, {});
  withSettings.settings = { ...withSettings.settings, apiBaseUrl: 'http://127.0.0.1:4000/api', ...settingsOverride };
  const email = await runCode(N.normalize, withSettings, {});
  const outputs = { [N.settings]: withSettings, [N.normalize]: email };
  assert.equal(ifPasses(N.isNew, { processed: false }), true);
  assert.equal(ifPasses(N.isNew, { processed: false, retryable: true }), true);
  assert.equal(ifPasses(N.isNew, { processed: true, status: 'created' }), false);
  const filter = await runCode(N.filter, { processed: false }, outputs);
  return { email, filter, outputs: { ...outputs, [N.filter]: filter } };
}

test('an event email: filtered in, sent to (mocked) Gemini, validated and posted to CuriousBees', async () => {
  const { email, filter, outputs } = await upToFilter(f.SEMINAR_HTML);
  assert.equal(ifPasses(N.isCandidate, filter), true);
  assert.equal(filter.skippedPayload, null);
  assert.equal(filter.geminiRequest.generationConfig.temperature, 0);
  assert.match(filter.geminiRequest.contents[0].parts[0].text, /Guest Lecture on Quantum Sensing/);

  const parsed = await runCode(N.parse, f.geminiResponse(f.SEMINAR_EXTRACTION), outputs);
  assert.equal(ifPasses(N.isValid, parsed), true);
  assert.deepEqual(parsed.payload, {
    source: {
      provider: 'gmail',
      messageId: '18f2a9c0d1e2f3a4',
      threadId: '18f2a9c0d1e2f3a4',
      from: 'Directorate of Research <research.office@srmist.edu.in>',
      subject: f.SEMINAR_HTML.subject,
      receivedAt: '2026-10-02T04:15:00.000Z',
      urls: email.urls,
    },
    extraction: f.SEMINAR_EXTRACTION,
    ai: { model: 'gemini-2.5-flash', inputTokens: 1840, outputTokens: 212 },
    prefilter: { score: filter.score },
  });
  // The email body itself is never sent to CuriousBees.
  assert.ok(!JSON.stringify(parsed.payload).includes('Dear Scholars'));
});

test('a non-event email is recorded as skipped and never builds a Gemini request', async () => {
  const { filter } = await upToFilter(f.PASSWORD_RESET);
  assert.equal(ifPasses(N.isCandidate, filter), false);
  assert.equal(filter.geminiRequest, null);
  assert.deepEqual(filter.skippedPayload, {
    source: {
      provider: 'gmail',
      messageId: '18f2a9c0d1e2f3d7',
      threadId: '18f2a9c0d1e2f3d7',
      from: 'Accounts <no-reply@accounts.example.com>',
      subject: 'Reset your password',
      receivedAt: '2026-10-02T07:00:00.000Z',
    },
    stage: 'prefilter',
    reason: 'Not an event: security code',
    ai: null,
    prefilter: { score: -100 },
  });
});

test('a malformed Gemini answer is reported as a retryable AI failure', async () => {
  const { outputs } = await upToFilter(f.SEMINAR_HTML);
  const parsed = await runCode(N.parse, f.geminiResponse({ ...f.SEMINAR_EXTRACTION, confidence: 'high' }), outputs);
  assert.equal(ifPasses(N.isValid, parsed), false);
  assert.equal(parsed.skippedPayload.stage, 'ai_error');
  assert.match(parsed.skippedPayload.reason, /confidence/);
  assert.equal(parsed.skippedPayload.ai.inputTokens, 1840);
});

test('a failed Gemini call (after retries) is reported as a retryable AI failure', async () => {
  const { outputs } = await upToFilter(f.SEMINAR_HTML);
  const failed = await runCode(N.geminiFailed, { error: { message: 'The service is receiving too many requests from you' } }, outputs);
  assert.equal(failed.skippedPayload.stage, 'ai_error');
  assert.equal(failed.skippedPayload.reason, 'Gemini request failed: The service is receiving too many requests from you');
});

test('refuses to run until the API address is configured', async () => {
  const withSettings = await runCode(N.settings, f.SEMINAR_HTML, {});
  await assert.rejects(runCode(N.normalize, withSettings, {}), /set apiBaseUrl/);
});

test('tests cannot reach the network', async () => {
  await assert.rejects(fetch('https://generativelanguage.googleapis.com/v1beta/models'), (e) => /Blocked an outbound connection/.test(String(e.cause && e.cause.message)));
});
