#!/usr/bin/env node
// Generates workflow.json (the file you import into n8n) from the tested
// modules in src/. Run `node build-workflow.js` after changing src/, or
// `node build-workflow.js --check` to verify workflow.json is up to date.
//
// The workflow contains no secrets and no real credential IDs: after import you
// pick your own credentials in n8n (see docs/integrations/n8n-event-ingestion.md).

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'workflow.json');
const src = (file) => fs.readFileSync(path.join(__dirname, 'src', file), 'utf8').trim();

/** Placeholder credential reference: n8n asks you to choose the real credential after import. */
const CREDENTIAL_PLACEHOLDER = 'REPLACE_WITH_YOUR_N8N_CREDENTIAL';
const CREDENTIALS = {
  gmail: { gmailOAuth2: { id: CREDENTIAL_PLACEHOLDER, name: 'CuriousBees Gmail (curiousbees@srmist.edu.in)' } },
  curiousbees: { httpHeaderAuth: { id: CREDENTIAL_PLACEHOLDER, name: 'CuriousBees API token' } },
  gemini: { httpHeaderAuth: { id: CREDENTIAL_PLACEHOLDER, name: 'Gemini API key' } },
};

const N = {
  trigger: 'Gmail Trigger',
  settings: 'Workflow settings',
  normalize: 'Normalize email',
  check: 'Already processed?',
  isNew: 'New email?',
  filter: 'Candidate filter',
  isCandidate: 'Likely an event?',
  gemini: 'Gemini 2.5 Flash',
  geminiFailed: 'Gemini failed',
  parse: 'Parse + validate',
  isValid: 'Valid answer?',
  send: 'Send to CuriousBees',
  skipped: 'Record skipped email',
};

const SETTINGS_CODE = `// ✏️  Workflow settings: edit these values after importing.
// Nothing secret belongs here. The CuriousBees token and the Gemini API key are
// n8n credentials (see docs/integrations/n8n-event-ingestion.md).
const settings = {
  // Your CuriousBees API address, including /api, without a trailing slash.
  apiBaseUrl: 'https://YOUR-CURIOUSBEES-API-HOST/api',
  // Gemini model. Only emails that pass the pre-filter are sent to it.
  geminiModel: 'gemini-2.5-flash',
  // Emails scoring below this never reach Gemini. Higher = fewer AI calls; lower = fewer missed events.
  minCandidateScore: 4,
  // Longest email text sent to Gemini, in characters. Longer emails are shortened.
  maxBodyChars: 12000,
  // Senders from these domains score higher in the pre-filter. Automatic publishing is
  // decided separately by EVENT_INGESTION_TRUSTED_SENDERS on the CuriousBees API.
  trustedSenderDomains: ['srmist.edu.in'],
  timezone: 'Asia/Kolkata',
};
return { json: { ...$json, settings } };`;

const settingsRef = `$('${N.settings}').first().json.settings`;

const NORMALIZE_CODE = `${src('normalize-email.js')}

// ── n8n entry point ──
const settings = $json.settings || {};
if (!settings.apiBaseUrl || /YOUR-CURIOUSBEES/i.test(settings.apiBaseUrl)) {
  throw new Error('Open the "${N.settings}" node and set apiBaseUrl to your CuriousBees API address.');
}
const { settings: _ignored, ...gmail } = $json;
return { json: normalizeEmail(gmail, settings) };`;

const FILTER_CODE = `${src('candidate-filter.js')}

${src('gemini-request.js')}

${src('payloads.js')}

// ── n8n entry point ──
// Only candidates get a Gemini request; everything else is recorded as skipped.
const email = $('${N.normalize}').item.json;
const settings = ${settingsRef};
const result = scoreCandidate(email, settings);
return {
  json: {
    candidate: result.candidate,
    score: result.score,
    signals: result.signals,
    geminiRequest: result.candidate ? buildGeminiRequest(email, settings) : null,
    skippedPayload: result.candidate ? null : skippedPayload(email, 'prefilter', result.reason, result),
  },
};`;

const GEMINI_FAILED_CODE = `${src('payloads.js')}

// ── n8n entry point ──
// The Gemini call failed after its retries (quota, network, invalid key…).
// Recorded as a retryable AI failure; nothing is guessed.
const email = $('${N.normalize}').item.json;
const filter = $('${N.filter}').item.json;
const err = $json.error || $json;
const detail = String((err && (err.message || err.description)) || 'unknown error').slice(0, 200);
return { json: { skippedPayload: skippedPayload(email, 'ai_error', 'Gemini request failed: ' + detail, filter) } };`;

const PARSE_CODE = `${src('parse-gemini.js')}

${src('payloads.js')}

// ── n8n entry point ──
const email = $('${N.normalize}').item.json;
const filter = $('${N.filter}').item.json;
const settings = ${settingsRef};
const parsed = parseGeminiResponse($json, settings.geminiModel);
if (!parsed.ok) {
  return { json: { ok: false, skippedPayload: skippedPayload(email, 'ai_error', parsed.error, filter, parsed.ai) } };
}
return { json: { ok: true, payload: ingestPayload(email, parsed.extraction, parsed.ai, filter) } };`;

function nodeId(name) {
  const h = crypto.createHash('sha1').update(`curiousbees-event-ingestion:${name}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function code(name, position, jsCode) {
  return {
    parameters: { mode: 'runOnceForEachItem', jsCode },
    id: nodeId(name),
    name,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position,
  };
}

function ifTrue(name, position, expression, description) {
  return {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [
          {
            id: nodeId(`${name}:condition`),
            leftValue: `={{ ${expression} }}`,
            rightValue: '',
            operator: { type: 'boolean', operation: 'true', singleValue: true },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
    id: nodeId(name),
    name,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position,
    notes: description,
    notesInFlow: true,
  };
}

function curiousbeesPost(name, position, pathSuffix, bodyExpression, notes) {
  return {
    parameters: {
      method: 'POST',
      url: `={{ ${settingsRef}.apiBaseUrl }}/integrations/n8n/events${pathSuffix}`,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify(${bodyExpression}) }}`,
      options: { timeout: 30000 },
    },
    id: nodeId(name),
    name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position,
    credentials: CREDENTIALS.curiousbees,
    // Safe to retry: CuriousBees de-duplicates on the Gmail message ID.
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    notes,
    notesInFlow: true,
  };
}

function sticky(name, position, width, height, content) {
  return {
    parameters: { content, width, height, color: 7 },
    id: nodeId(name),
    name,
    type: 'n8n-nodes-base.stickyNote',
    typeVersion: 1,
    position,
  };
}

const nodes = [
  sticky('Setup', [-60, -420], 520, 360, [
    '## Set up before activating',
    '1. **Gmail Trigger**: choose your Gmail OAuth2 credential for curiousbees@srmist.edu.in.',
    '2. **Workflow settings**: set `apiBaseUrl` to your CuriousBees API (…/api).',
    '3. **Already processed?**, **Send to CuriousBees**, **Record skipped email**: choose the *CuriousBees API token* credential (Header Auth, name `Authorization`, value `Bearer <N8N_INTEGRATION_TOKEN>`).',
    '4. **Gemini 2.5 Flash**: choose the *Gemini API key* credential (Header Auth, name `x-goog-api-key`).',
    '',
    'No secrets are stored in this workflow. Full guide: docs/integrations/n8n-event-ingestion.md',
  ].join('\n')),
  sticky('Cost control', [1100, -420], 460, 300, [
    '## How AI use is kept low',
    '- Messages CuriousBees has already handled stop at **Already processed?**',
    '- **Candidate filter** scores each email with simple rules (no AI). Only likely events reach Gemini.',
    '- Gemini gets a shortened plain-text email, answers in strict JSON, temperature 0, no "thinking" tokens.',
    '- Everything else is recorded in CuriousBees as *skipped*, so it is counted but costs nothing.',
  ].join('\n')),
  {
    parameters: {
      pollTimes: { item: [{ mode: 'everyX', value: 5, unit: 'minutes' }] },
      simple: false,
      filters: { includeSpamTrash: false, readStatus: 'both' },
      options: { downloadAttachments: false },
    },
    id: nodeId(N.trigger),
    name: N.trigger,
    type: 'n8n-nodes-base.gmailTrigger',
    typeVersion: 1.2,
    position: [0, 0],
    credentials: CREDENTIALS.gmail,
    notes: 'Polls every 5 minutes. Attachments are not downloaded.',
    notesInFlow: true,
  },
  code(N.settings, [220, 0], SETTINGS_CODE),
  code(N.normalize, [440, 0], NORMALIZE_CODE),
  curiousbeesPost(N.check, [660, 0], '/check', '{ messageId: $json.messageId }', 'Skips emails CuriousBees already handled, before any AI call.'),
  {
    ...ifTrue(N.isNew, [880, 0], '$json.processed !== true', 'Continue only for emails CuriousBees has not handled yet.'),
  },
  code(N.filter, [1100, -100], FILTER_CODE),
  ifTrue(N.isCandidate, [1320, -100], '$json.candidate === true', 'Only likely events go to Gemini.'),
  {
    parameters: {
      method: 'POST',
      url: `={{ 'https://generativelanguage.googleapis.com/v1beta/models/' + ${settingsRef}.geminiModel + ':generateContent' }}`,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json.geminiRequest) }}',
      options: { timeout: 60000 },
    },
    id: nodeId(N.gemini),
    name: N.gemini,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [1540, -200],
    credentials: CREDENTIALS.gemini,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    onError: 'continueErrorOutput',
    notes: 'Structured JSON extraction. Called only for candidate emails.',
    notesInFlow: true,
  },
  code(N.geminiFailed, [1760, 40], GEMINI_FAILED_CODE),
  code(N.parse, [1760, -220], PARSE_CODE),
  ifTrue(N.isValid, [1980, -220], '$json.ok === true', 'Malformed or blocked answers are recorded as retryable AI failures.'),
  curiousbeesPost(N.send, [2200, -320], '', '$json.payload', 'CuriousBees validates, de-duplicates and publishes or queues for review.'),
  curiousbeesPost(N.skipped, [2200, 40], '/skipped', '$json.skippedPayload', 'Counted in CuriousBees so it is never processed again.'),
];

const link = (node, index = 0) => ({ node, type: 'main', index });
const connections = {
  [N.trigger]: { main: [[link(N.settings)]] },
  [N.settings]: { main: [[link(N.normalize)]] },
  [N.normalize]: { main: [[link(N.check)]] },
  [N.check]: { main: [[link(N.isNew)]] },
  [N.isNew]: { main: [[link(N.filter)], []] },
  [N.filter]: { main: [[link(N.isCandidate)]] },
  [N.isCandidate]: { main: [[link(N.gemini)], [link(N.skipped)]] },
  [N.gemini]: { main: [[link(N.parse)], [link(N.geminiFailed)]] },
  [N.geminiFailed]: { main: [[link(N.skipped)]] },
  [N.parse]: { main: [[link(N.isValid)]] },
  [N.isValid]: { main: [[link(N.send)], [link(N.skipped)]] },
};

const workflow = {
  name: 'CuriousBees: institutional email → events',
  nodes,
  connections,
  pinData: {},
  active: false,
  settings: {
    executionOrder: 'v1',
    timezone: 'Asia/Kolkata',
    // Successful runs are not kept (they contain email text). Failed runs are kept so they can be retried.
    saveDataSuccessExecution: 'none',
    saveDataErrorExecution: 'all',
    saveManualExecutions: true,
    saveExecutionProgress: false,
  },
  meta: { templateCredsSetupCompleted: false },
  tags: [],
};

const output = `${JSON.stringify(workflow, null, 2)}\n`;

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== output) {
      console.error('workflow.json is out of date. Run: node integrations/n8n/event-ingestion/build-workflow.js');
      process.exit(1);
    }
    console.log('workflow.json is up to date.');
  } else {
    fs.writeFileSync(OUT, output);
    console.log(`Wrote ${path.relative(process.cwd(), OUT)}`);
  }
}

module.exports = { workflow, output, NODE_NAMES: N, CREDENTIAL_PLACEHOLDER };
