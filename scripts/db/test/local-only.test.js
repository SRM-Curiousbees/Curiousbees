const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveDatabaseUrl } = require('../local-only');

const CLI = path.resolve(__dirname, '../local-only.js');
// Harmless stand-in for prisma: prints what it would connect to, never connects.
const PROBE = ['-e', 'console.log(JSON.stringify({ url: process.env.DATABASE_URL, pghost: process.env.PGHOST || null }))'];

const run = (env) => spawnSync(process.execPath, [CLI, process.execPath, ...PROBE], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });

test('a remote database is refused and the command never runs', () => {
  const r = run({ DATABASE_URL: 'postgresql://app:pw@curiousbees.abc.ap-south-1.rds.amazonaws.com:5432/app' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Refusing to run .* is not this machine/);
  assert.equal(r.stdout, '');
});

test('NODE_ENV=production is refused even for a local database', () => {
  const r = run({ DATABASE_URL: 'postgresql://postgres:pw@127.0.0.1:5432/dev', NODE_ENV: 'production' });
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
});

test('a local database runs the command with exactly that URL pinned and PG* overrides removed', () => {
  const url = 'postgresql://postgres:pw@127.0.0.1:5432/dev?schema=public';
  const r = run({ DATABASE_URL: url, PGHOST: 'prod.example.com' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), { url, pghost: null });
});

test('the URL comes from the environment first, then the root .env', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-local-only-'));
  fs.writeFileSync(path.join(dir, '.env'), 'DATABASE_URL=postgresql://x:y@127.0.0.1:5432/from_dotenv\n');
  assert.equal(resolveDatabaseUrl({}, dir), 'postgresql://x:y@127.0.0.1:5432/from_dotenv');
  assert.equal(resolveDatabaseUrl({ DATABASE_URL: 'postgresql://x:y@127.0.0.1:5432/from_env' }, dir), 'postgresql://x:y@127.0.0.1:5432/from_env');
  assert.equal(resolveDatabaseUrl({}, path.join(dir, 'missing')), undefined);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('local-test-db.sh refuses to manage a directory it did not create', () => {
  const script = path.resolve(__dirname, '../local-test-db.sh');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-not-ours-'));
  for (const cmd of ['start', 'stop', 'status']) {
    const r = spawnSync('bash', [script, cmd], { env: { PATH: process.env.PATH, CURIOUSBEES_TEST_DB_DIR: dir }, encoding: 'utf8' });
    assert.equal(r.status, 1, cmd);
    assert.match(r.stderr, /was not created by this script; refusing to touch it/);
  }
  const init = spawnSync('bash', [script, 'init'], { env: { PATH: process.env.PATH, CURIOUSBEES_TEST_DB_DIR: dir }, encoding: 'utf8' });
  assert.equal(init.status, 1);
  assert.match(init.stderr, /already exists/);
  fs.rmSync(dir, { recursive: true, force: true });
});
