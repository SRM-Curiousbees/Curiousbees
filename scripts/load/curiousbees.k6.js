/**
 * CuriousBees load test (k6). Run through scripts/load/run.js, which checks the
 * target, enforces the stage order and starts the local load-test server.
 *
 * Each virtual user is one synthetic, signed-in researcher (fixture from
 * apps/api/test/load/seed-load-data.ts). It opens the portal, then repeatedly
 * does one weighted action and pauses 2–8 s, like an active person browsing.
 * Writes go only to the disposable test database and are prefixed "[loadtest]".
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';

// ─── Target safety (same rules as scripts/load/target-guard.js) ─────────────
const TARGET = (__ENV.LOAD_TEST_TARGET || '').replace(/\/+$/, '');
const REFUSED = ['srmcuriousbees.in', 'www.srmcuriousbees.in', 'origin.srmcuriousbees.in'];
const REFUSED_SUFFIXES = ['supabase.co', 'supabase.in', 'supabase.com', 'brevo.com', 'sendinblue.com', 'googleapis.com', 'google.com', 'zoom.us', 'n8n.cloud', 'vercel.app', 'railway.app'];
const LOOPBACK = ['127.0.0.1', 'localhost', '::1', '[::1]'];
const host = (/^https?:\/\/(\[[^\]]+\]|[^/:]+)/i.exec(TARGET) || [])[1];
const extraHosts = (__ENV.LOAD_TEST_ALLOWED_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
if (!host) throw new Error('Refusing to run: LOAD_TEST_TARGET must be an http(s) URL.');
const h = host.toLowerCase();
if (REFUSED.indexOf(h) >= 0 || REFUSED_SUFFIXES.some((s) => h === s || h.endsWith('.' + s))) throw new Error(`Refusing to run: ${h} is production or a third-party service.`);
if (LOOPBACK.indexOf(h) < 0 && extraHosts.indexOf(h) < 0) throw new Error(`Refusing to run: ${h} is not loopback or listed in LOAD_TEST_ALLOWED_HOSTS.`);

// ─── Stage: 1 min ramp-up, steady state, 30 s ramp-down ─────────────────────
const STAGE = Number(__ENV.LOAD_TEST_STAGE);
if ([25, 50, 100, 250, 500].indexOf(STAGE) < 0) throw new Error('LOAD_TEST_STAGE must be 25, 50, 100, 250 or 500.');
const STEADY_MINUTES = Math.min(Math.max(Number(__ENV.LOAD_TEST_STEADY_MINUTES || 5), 1), 10);

const fixture = new SharedArray('users', () => JSON.parse(open(__ENV.LOAD_TEST_FIXTURE)).users);
const extras = JSON.parse(open(__ENV.LOAD_TEST_FIXTURE));
const THREAD_IDS = extras.threadIds;
const TERMS = extras.searchTerms;

export const options = {
  scenarios: {
    researchers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: STAGE },
        { duration: `${STEADY_MINUTES}m`, target: STAGE },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  // Hard ceiling, whatever the stage settings.
  maxDuration: '12m',
  thresholds: {
    // Proposed acceptance criteria (reported as pass/fail).
    'http_req_duration{kind:read}': ['p(95)<500'],
    'http_req_duration{kind:write}': ['p(95)<800'],
    http_req_failed: [
      'rate<0.01',
      // Stop condition: abort if more than 5% of requests fail, after the first 30 s.
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' },
    ],
    checks: [{ threshold: 'rate>0.95', abortOnFail: true, delayAbortEval: '30s' }],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  discardResponseBodies: false,
};

export function setup() {
  // Only a server started in load-test mode (fake auth, no outbound network) is accepted.
  const res = http.get(`${TARGET}/api/health/live`);
  if (res.status !== 200 || res.headers['X-Curiousbees-Load-Test'] !== '1') {
    exec.test.abort(`Refusing to run: ${TARGET} is not a CuriousBees load-test server (missing X-CuriousBees-Load-Test header).`);
  }
  const ready = http.get(`${TARGET}/api/health`);
  if (ready.status !== 200) exec.test.abort('The load-test server reports its database as unavailable.');
}

const pick = (items) => items[Math.floor(Math.random() * items.length)];

function call(method, path, kind, name, user, body) {
  const params = {
    headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
    tags: { kind, name },
    timeout: '10s',
  };
  const res = method === 'GET' ? http.get(`${TARGET}${path}`, params) : http.request(method, `${TARGET}${path}`, body ? JSON.stringify(body) : null, params);
  check(res, { [`${name} ok`]: (r) => r.status >= 200 && r.status < 300 });
  return res;
}

export default function () {
  const user = fixture[(exec.vu.idInTest - 1) % fixture.length];
  const read = (path, name) => call('GET', path, 'read', name, user);
  const write = (method, path, name, body) => call(method, path, 'write', name, user, body);

  // Opening the portal: the same requests the web app makes on start.
  if (exec.vu.iterationInScenario === 0) {
    read('/api/auth/me', 'auth_me');
    read('/api/opportunities', 'opportunities');
    read('/api/events', 'events');
    read('/api/threads', 'feed');
  }

  const r = Math.random();
  if (r < 0.28) {
    const page = read('/api/threads?limit=20', 'feed');
    if (Math.random() < 0.3 && page.status === 200) {
      const items = page.json();
      if (Array.isArray(items) && items.length) read(`/api/threads?limit=20&cursor=${items[items.length - 1].id}`, 'feed_next');
    }
  } else if (r < 0.40) {
    const threadId = pick(THREAD_IDS);
    read(`/api/threads/${threadId}`, 'thread_detail');
    read(`/api/comments/thread/${threadId}`, 'comments');
  } else if (r < 0.50) {
    read('/api/notifications', 'notifications');
  } else if (r < 0.57) {
    read('/api/events', 'events');
  } else if (r < 0.64) {
    read(`/api/feed/search?q=${encodeURIComponent(pick(TERMS))}`, 'search');
  } else if (r < 0.71) {
    read('/api/users/researchers?page=1&limit=20', 'researchers');
  } else if (r < 0.77) {
    read('/api/publications?limit=20', 'publications');
  } else if (r < 0.83) {
    read('/api/workspaces', 'workspaces');
    if (user.workspaceIds.length) read(`/api/workspaces/${pick(user.workspaceIds)}`, 'workspace_detail');
  } else if (r < 0.87) {
    read('/api/users/profile', 'profile');
  } else if (r < 0.91) {
    read('/api/auth/me', 'auth_me'); // every portal page load re-checks the session
  } else if (r < 0.95) {
    write('POST', '/api/comments', 'comment_create', { threadId: pick(THREAD_IDS), content: `[loadtest] comment from ${user.id}` });
  } else if (r < 0.98) {
    const threadId = pick(THREAD_IDS);
    write('POST', `/api/threads/${threadId}/like`, 'like_toggle');
    write('POST', `/api/threads/${threadId}/like`, 'like_toggle');
  } else {
    write('POST', '/api/threads/files/upload-url', 'upload_url', { filename: 'loadtest-paper.pdf', contentType: 'application/pdf', sizeBytes: 1048576 });
  }

  sleep(2 + Math.random() * 6);
}
