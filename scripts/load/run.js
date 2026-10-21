#!/usr/bin/env node
/**
 * Runs one CuriousBees load-test stage safely. See docs/load-testing.md.
 *
 *   npm run load:seed                      # synthetic data + fixture (disposable test DB only)
 *   npm run load:run -- --smoke            # one request per scenario endpoint; no k6 needed
 *   npm run load:run -- --stage 25         # then 50, 100, 250, 500, each after the previous passed
 *
 * Environment:
 *   LOAD_DATABASE_URL        the disposable test database (cbtest@127.0.0.1:55432/curiousbees); required
 *                            to start the local server and to sample PostgreSQL
 *   LOAD_TEST_TARGET         default http://127.0.0.1:4100 (loopback; other hosts need LOAD_TEST_ALLOWED_HOSTS)
 *   LOAD_TEST_FIXTURE        default scripts/load/.fixture/fixture.json
 *   LOAD_TEST_STEADY_MINUTES steady-state length, 1–10 (default 5)
 *   LOAD_TEST_CONFIRM_500    must be "yes" for the 500-user stage
 *   LOAD_DB_CONNECTION_LIMIT Prisma pool for the local server (default 5, as planned for production)
 *   LOAD_TEST_AUTH_LATENCY_MS simulated Supabase round trip per request (default 0)
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { assertLoadTarget, assertStage, previousStage, LOOPBACK } = require('./target-guard');
const { assertResetTarget } = require('../db/reset-guard');

const ROOT = path.resolve(__dirname, '../..');
const RESULTS = path.join(__dirname, 'results');
const MARKER = 'x-curiousbees-load-test';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

async function waitForServer(target, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) fail('The load-test server exited during start-up; see its log in scripts/load/results/.');
    try {
      const res = await fetch(`${target}/api/health/live`);
      if (res.ok && res.headers.get(MARKER) === '1') return;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  fail('The load-test server did not become ready within 60 s.');
}

async function assertLoadTestServer(target) {
  let res;
  try {
    res = await fetch(`${target}/api/health/live`);
  } catch (e) {
    fail(`Could not reach ${target}: ${e.message}`);
  }
  if (res.headers.get(MARKER) !== '1') fail(`${target} is not a CuriousBees load-test server (no ${MARKER} header). Refusing to send load.`);
}

function startServer(target, env, logFile) {
  const port = new URL(target).port || '80';
  const out = fs.openSync(logFile, 'w');
  return spawn(path.join(ROOT, 'node_modules/.bin/ts-node'), ['--transpile-only', '--project', 'apps/api/tsconfig.json', 'apps/api/test/load/load-server.ts'], {
    cwd: ROOT,
    env: { ...env, LOAD_TEST_PORT: port },
    stdio: ['ignore', out, out],
  });
}

/** Samples PostgreSQL every 5 s: connections by state, waiting sessions, queries running > 200 ms. */
function startDbSampler(databaseUrl, file) {
  const sql = `select json_build_object(
    'at', now(),
    'connections', count(*),
    'active', count(*) filter (where state = 'active'),
    'idle', count(*) filter (where state = 'idle'),
    'idleInTransaction', count(*) filter (where state like 'idle in transaction%'),
    'waitingOnLock', count(*) filter (where wait_event_type = 'Lock'),
    'over200ms', count(*) filter (where state = 'active' and now() - query_start > interval '200 milliseconds'),
    'slowest', (select left(query, 160) from pg_stat_activity where datname = current_database() and state = 'active' and pid <> pg_backend_pid() order by query_start limit 1)
  ) from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid();`;
  const timer = setInterval(() => {
    const r = spawnSync('psql', [databaseUrl.split('?')[0], '-Atqc', sql], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) fs.appendFileSync(file, r.stdout.trim() + '\n');
  }, 5000);
  return () => clearInterval(timer);
}

async function smoke(target, fixturePath) {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const user = fixture.users.find((u) => u.workspaceIds.length) || fixture.users[0];
  const threadId = fixture.threadIds[0];
  const steps = [
    ['GET', '/api/auth/me'], ['GET', '/api/opportunities'], ['GET', '/api/events'], ['GET', '/api/threads?limit=20'],
    ['GET', `/api/threads/${threadId}`], ['GET', `/api/comments/thread/${threadId}`], ['GET', '/api/notifications'],
    ['GET', '/api/feed/search?q=graph'], ['GET', '/api/users/researchers?page=1&limit=20'], ['GET', '/api/publications?limit=20'],
    ['GET', '/api/workspaces'], ['GET', `/api/workspaces/${user.workspaceIds[0]}`], ['GET', '/api/users/profile'],
    ['POST', '/api/comments', { threadId, content: '[loadtest] smoke comment' }],
    ['POST', `/api/threads/${threadId}/like`], ['POST', `/api/threads/${threadId}/like`],
    ['POST', '/api/threads/files/upload-url', { filename: 'loadtest-paper.pdf', contentType: 'application/pdf', sizeBytes: 1048576 }],
  ];
  let failed = 0;
  console.log(`Smoke test as ${user.email} (one request at a time, 3 rounds):`);
  for (const [method, url, body] of steps) {
    const times = [];
    let status;
    for (let i = 0; i < 3; i++) {
      const started = performance.now();
      const res = await fetch(`${target}${url}`, {
        method,
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      await res.arrayBuffer();
      times.push(performance.now() - started);
      status = res.status;
    }
    const ok = status >= 200 && status < 300;
    if (!ok) failed++;
    console.log(`  ${ok ? '✓' : '✗'} ${method.padEnd(4)} ${url.padEnd(48)} ${status}  ${times.map((t) => t.toFixed(1)).join(' / ')} ms`);
  }
  return failed;
}

function summarise(stage, summaryFile, metricsFile, dbFile) {
  const s = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
  const m = s.metrics;
  const d = (name) => m[name] || {};
  const fmt = (v) => (typeof v === 'number' ? v.toFixed(1) : '-');
  console.log(`\nStage ${stage} summary`);
  console.log(`  requests ${d('http_reqs').count} (${fmt(d('http_reqs').rate)}/s), failed ${(100 * (d('http_req_failed').value || 0)).toFixed(2)}%`);
  for (const [label, key] of [['reads', 'http_req_duration{kind:read}'], ['writes', 'http_req_duration{kind:write}']]) {
    const t = d(key);
    console.log(`  ${label.padEnd(6)} p50 ${fmt(t.med)} ms  p95 ${fmt(t['p(95)'])} ms  p99 ${fmt(t['p(99)'])} ms  max ${fmt(t.max)} ms`);
  }
  const lines = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  const server = lines(metricsFile);
  if (server.length) {
    const max = (fn) => Math.max(...server.map(fn));
    console.log(`  API process: peak CPU ${max((x) => x.cpuPercent)}% of one core, peak RSS ${max((x) => x.rssMb)} MB, event-loop delay p99 peak ${max((x) => x.eventLoopDelayMs.p99).toFixed(1)} ms`);
    console.log(`  API memory: RSS ${server[0].rssMb} MB at start → ${server[server.length - 1].rssMb} MB at end`);
  }
  const db = lines(dbFile);
  if (db.length) {
    const max = (fn) => Math.max(...db.map(fn));
    console.log(`  PostgreSQL: peak connections ${max((x) => x.connections)}, peak active ${max((x) => x.active)}, peak waiting on locks ${max((x) => x.waitingOnLock)}, peak queries > 200 ms ${max((x) => x.over200ms)}`);
  }
}

async function main() {
  const target = (process.env.LOAD_TEST_TARGET || 'http://127.0.0.1:4100').replace(/\/+$/, '');
  const fixturePath = path.resolve(ROOT, process.env.LOAD_TEST_FIXTURE || 'scripts/load/.fixture/fixture.json');
  let url;
  try {
    url = assertLoadTarget(target);
  } catch (e) {
    fail(e.message);
  }
  const isSmoke = process.argv.includes('--smoke');
  const stage = isSmoke ? null : (() => { try { return assertStage(arg('--stage')); } catch (e) { fail(e.message); } })();
  if (!fs.existsSync(fixturePath)) fail(`No fixture at ${fixturePath}. Run "npm run load:seed" first.`);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  fs.mkdirSync(RESULTS, { recursive: true });

  if (stage) {
    const prev = previousStage(stage);
    if (prev) {
      const metaFile = path.join(RESULTS, `stage-${prev}.meta.json`);
      const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : null;
      if (!meta || !meta.passed || meta.target !== target || meta.fixtureGeneratedAt !== fixture.generatedAt) {
        fail(`Stage ${stage} needs a passing stage ${prev} on the same target and data set first.`);
      }
    }
    if (stage === 500 && process.env.LOAD_TEST_CONFIRM_500 !== 'yes') fail('The 500-user stage needs LOAD_TEST_CONFIRM_500=yes (and prior approval).');
    if (spawnSync('k6', ['version'], { encoding: 'utf8' }).status !== 0) {
      fail('k6 is not installed. It is not installed automatically; see docs/load-testing.md ("Tooling").');
    }
  }

  const local = LOOPBACK.has(url.hostname);
  let server;
  const label = stage ? `stage-${stage}` : 'smoke';
  const metricsFile = path.join(RESULTS, `${label}.server-metrics.jsonl`);
  const dbFile = path.join(RESULTS, `${label}.db.jsonl`);
  for (const f of [metricsFile, dbFile]) fs.rmSync(f, { force: true });
  let stopDb = () => {};

  if (local) {
    let dbUrl;
    try {
      dbUrl = assertResetTarget(process.env.LOAD_DATABASE_URL, {}); // same disposable-database rule
    } catch (e) {
      fail(`LOAD_DATABASE_URL: ${e.message}`);
    }
    server = startServer(target, { ...process.env, LOAD_DATABASE_URL: dbUrl, LOAD_TEST_FIXTURE: fixturePath, LOAD_TEST_METRICS: metricsFile }, path.join(RESULTS, `${label}.server.log`));
    const stopServer = () => server && server.exitCode === null && server.kill('SIGTERM');
    process.on('exit', stopServer);
    process.on('SIGINT', () => { stopServer(); process.exit(130); });
    await waitForServer(target, server);
    stopDb = startDbSampler(dbUrl, dbFile);
  } else {
    await assertLoadTestServer(target);
  }

  let code = 0;
  try {
    if (isSmoke) {
      code = (await smoke(target, fixturePath)) ? 1 : 0;
    } else {
      const summaryFile = path.join(RESULTS, `${label}.summary.json`);
      const k6 = spawnSync('k6', ['run', '--summary-export', summaryFile, path.join(__dirname, 'curiousbees.k6.js')], {
        stdio: 'inherit',
        env: { ...process.env, LOAD_TEST_TARGET: target, LOAD_TEST_STAGE: String(stage), LOAD_TEST_FIXTURE: fixturePath },
      });
      code = k6.status ?? 1;
      fs.writeFileSync(path.join(RESULTS, `${label}.meta.json`), JSON.stringify({
        stage, target, passed: code === 0, k6ExitCode: code, fixtureGeneratedAt: fixture.generatedAt, finishedAt: new Date().toISOString(),
      }, null, 2));
      if (fs.existsSync(summaryFile)) summarise(stage, summaryFile, metricsFile, dbFile);
      console.log(code === 0 ? `\n✅ Stage ${stage} passed its thresholds.` : `\n❌ Stage ${stage} did not pass (k6 exit ${code}).`);
    }
  } finally {
    stopDb();
    if (server && server.exitCode === null) server.kill('SIGTERM');
  }
  process.exit(code);
}

main();
