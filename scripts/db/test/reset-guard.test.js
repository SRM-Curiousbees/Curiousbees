const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');
const { assertResetTarget, childEnvironment } = require('../reset-guard');

const VALID = 'postgresql://cbtest:cbtest_local_only@127.0.0.1:55432/curiousbees?schema=public';
const refused = { code: 'RESET_TARGET_REFUSED' };

test('accepts only the dedicated disposable test database', () => {
  assert.equal(new URL(assertResetTarget(VALID, {})).port, '55432');
  assert.ok(assertResetTarget('postgres://cbtest@127.0.0.1:55432/curiousbees', {}));
});

test('refuses when no explicit target is given, even if DATABASE_URL is set', () => {
  assert.throws(() => assertResetTarget(undefined, { DATABASE_URL: VALID }), refused);
  assert.throws(() => assertResetTarget('', {}), refused);
});

test('refuses development and production databases', () => {
  for (const url of [
    'postgresql://postgres:pw@127.0.0.1:5432/srm_curiousbees_db', // local development server
    'postgresql://postgres:pw@localhost:55432/curiousbees', // hostname aliases are not accepted
    'postgresql://app:pw@curiousbees.abc123.ap-south-1.rds.amazonaws.com:5432/curiousbees?sslmode=require',
    'postgresql://postgres:pw@db.abcdefgh.supabase.co:5432/postgres',
    'postgresql://cbtest:pw@127.0.0.1:55432/srm_curiousbees_db', // right server, wrong database
    'postgresql://postgres:pw@127.0.0.1:55432/curiousbees', // wrong user
    'mysql://cbtest:pw@127.0.0.1:55432/curiousbees',
    'not a url',
  ]) {
    assert.throws(() => assertResetTarget(url, {}), refused, url);
  }
});

test('refuses connection parameters that could redirect the connection', () => {
  for (const params of ['host=prod.example.com', 'hostaddr=10.0.0.5', 'port=5432', 'dbname=postgres', 'service=prod', 'schema=other']) {
    assert.throws(() => assertResetTarget(`${VALID.split('?')[0]}?${params}`, {}), refused, params);
  }
});

test('refuses under NODE_ENV=production', () => {
  assert.throws(() => assertResetTarget(VALID, { NODE_ENV: 'production' }), refused);
});

test('never echoes the password', () => {
  try {
    assertResetTarget('postgresql://postgres:s3cret-value@prod.example.com:5432/app', {});
    assert.fail('expected a refusal');
  } catch (e) {
    assert.doesNotMatch(e.message, /s3cret-value/);
  }
});

test('child processes get only the validated target, whatever else is configured', () => {
  const env = childEnvironment(VALID, {
    DATABASE_URL: 'postgresql://postgres:pw@127.0.0.1:5432/srm_curiousbees_db',
    DIRECT_URL: 'postgresql://postgres:pw@127.0.0.1:5432/srm_curiousbees_db',
    PGHOST: 'prod.example.com',
    PGHOSTADDR: '10.0.0.5',
    PATH: '/usr/bin',
  });
  assert.equal(env.DATABASE_URL, VALID);
  assert.equal(env.DIRECT_URL, VALID);
  assert.equal(env.PGHOST, undefined);
  assert.equal(env.PGHOSTADDR, undefined);
  assert.equal(env.NODE_ENV, 'test');
  assert.equal(env.PATH, '/usr/bin');
});

test('the CLI exits before Prisma runs when the target is not the test database', () => {
  const cli = path.resolve(__dirname, '../guarded-reset.js');
  // Closed local ports: even a guard failure could not reach a real database.
  const result = spawnSync(process.execPath, [cli, '--seed'], {
    env: {
      PATH: process.env.PATH,
      DATABASE_URL: 'postgresql://postgres:pw@127.0.0.1:1/srm_curiousbees_db',
      RESET_DATABASE_URL: 'postgresql://postgres:pw@127.0.0.1:2/srm_curiousbees_db',
    },
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing to run a destructive database command: port is "2"/);
  assert.doesNotMatch(result.stdout + result.stderr, /Datasource|Prisma schema loaded/);
});

// ─── Positive identification (live server) ──────────────────────────────────
const { assertDisposableIdentity, verifyDisposableDatabase, assertLocalDatabase } = require('../reset-guard');

const IDENTITY = { database: 'curiousbees', user: 'cbtest', marker: 'on' };

test('a live identity must show the test database, the test user and the disposable marker', () => {
  assert.doesNotThrow(() => assertDisposableIdentity(IDENTITY));
  for (const bad of [
    { ...IDENTITY, marker: '' }, // e.g. a real database reached through a tunnel on 127.0.0.1:55432
    { ...IDENTITY, marker: 'off' },
    { ...IDENTITY, database: 'srm_curiousbees_db' },
    { ...IDENTITY, user: 'postgres' },
    undefined,
  ]) {
    assert.throws(() => assertDisposableIdentity(bad), refused, JSON.stringify(bad));
  }
});

test('verifyDisposableDatabase checks the URL first and never connects for a wrong URL', () => {
  let connected = false;
  const identify = () => { connected = true; return IDENTITY; };
  assert.throws(() => verifyDisposableDatabase('postgresql://postgres:pw@127.0.0.1:5432/srm_curiousbees_db', {}, identify), refused);
  assert.equal(connected, false);
});

test('verifyDisposableDatabase refuses a correct URL whose server lacks the marker', () => {
  assert.throws(() => verifyDisposableDatabase(VALID, {}, () => ({ ...IDENTITY, marker: '' })), refused);
  assert.equal(verifyDisposableDatabase(VALID, {}, () => IDENTITY), new URL(VALID).toString());
});

test('verifyDisposableDatabase does not rely on NODE_ENV: test mode alone is not enough', () => {
  assert.throws(() => verifyDisposableDatabase('postgresql://app:pw@prod.example.com:5432/app', { NODE_ENV: 'test' }, () => IDENTITY), refused);
});

// ─── Local-only developer tools ─────────────────────────────────────────────
const localRefused = { code: 'LOCAL_DATABASE_REQUIRED' };

test('data-writing developer tools accept databases on this machine', () => {
  for (const url of [
    'postgresql://postgres:pw@127.0.0.1:5432/srm_curiousbees_db?schema=public',
    'postgresql://postgres:pw@localhost:5433/dev?schema=public&connection_limit=5',
    'postgres://u@[::1]:5432/dev',
  ]) {
    assert.equal(assertLocalDatabase(url, 'seed', {}), url);
  }
});

test('data-writing developer tools refuse remote, production and unknown databases', () => {
  for (const url of [
    undefined,
    '',
    'not a url',
    'postgresql://app:pw@curiousbees.abc123.ap-south-1.rds.amazonaws.com:5432/curiousbees?sslmode=require',
    'postgresql://postgres:pw@db.abcdefgh.supabase.co:5432/postgres',
    'postgresql://postgres:pw@10.0.0.5:5432/app',
    'postgresql://postgres:pw@127.0.0.1:5432/app?host=prod.example.com', // libpq redirect
    'postgresql://postgres:pw@127.0.0.1:5432/app?hostaddr=10.0.0.5',
    'mysql://root@127.0.0.1/app',
  ]) {
    assert.throws(() => assertLocalDatabase(url, 'seed', {}), localRefused, String(url));
  }
  assert.throws(() => assertLocalDatabase('postgresql://postgres:pw@127.0.0.1:5432/app', 'seed', { NODE_ENV: 'production' }), localRefused);
});

test('local-only refusals never echo the password', () => {
  try {
    assertLocalDatabase('postgresql://app:s3cret-value@prod.example.com:5432/app', 'seed', {});
    assert.fail('expected a refusal');
  } catch (e) {
    assert.doesNotMatch(e.message, /s3cret-value/);
  }
});
