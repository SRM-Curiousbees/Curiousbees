/**
 * Safety rails for scripts that delete, reset, migrate or reseed a database.
 *
 * Destructive commands (prisma migrate reset, DROP SCHEMA, bulk deletes) may
 * only target the dedicated, disposable test database, and only after it has
 * been positively identified: the URL must name it exactly, AND a live
 * connection must show the marker that only throwaway test databases carry
 * (`curiousbees.disposable_test_db = on`, set by docker-compose.test.yml, CI and
 * scripts/db/local-test-db.sh). The target is passed explicitly; DATABASE_URL
 * and .env are never used for resets, because they normally point at a real
 * development or production database. NODE_ENV is never relied on.
 *
 * Data-writing developer tools (migrate dev, db push, demo seeds) may only
 * target a database on this machine: assertLocalDatabase.
 *
 * Every check fails closed and has no override. Error messages never echo a
 * URL, so a password can't end up in terminal output.
 */
const { spawnSync } = require('child_process');

/** Database-level setting that marks a throwaway test database. Real databases never have it. */
const DISPOSABLE_MARKER = Object.freeze({ name: 'curiousbees.disposable_test_db', value: 'on' });

/** The only database that may be reset. */
const RESET_TARGET = Object.freeze({ host: '127.0.0.1', port: '55432', database: 'curiousbees', user: 'cbtest' });

const TARGET_LABEL = `postgresql://${RESET_TARGET.user}@${RESET_TARGET.host}:${RESET_TARGET.port}/${RESET_TARGET.database}`;

function refuse(reason) {
  const error = new Error(
    `Refusing to run a destructive database command: ${reason}. ` +
      `Destructive commands only run against the disposable test database ${TARGET_LABEL}.`,
  );
  error.code = 'RESET_TARGET_REFUSED';
  throw error;
}

/**
 * Returns the validated target URL, or throws. Error messages never echo the
 * URL, so a password can't end up in terminal output.
 */
function assertResetTarget(url, env = process.env) {
  if (env.NODE_ENV === 'production') refuse('NODE_ENV is "production"');
  if (!url) refuse('no target database URL was given');

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    refuse('the target database URL could not be parsed');
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') refuse(`protocol is "${parsed.protocol}"`);
  if (parsed.hostname !== RESET_TARGET.host) refuse(`host is "${parsed.hostname}"`);
  if (parsed.port !== RESET_TARGET.port) refuse(`port is "${parsed.port || '(default)'}"`);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (database !== RESET_TARGET.database) refuse(`database is "${database}"`);
  const user = decodeURIComponent(parsed.username);
  if (user !== RESET_TARGET.user) refuse(`user is "${user}"`);
  // libpq accepts connection keywords (host, hostaddr, port, dbname, service…)
  // as query parameters, and they override the URL. Only Prisma's schema=public is allowed.
  for (const [key, value] of parsed.searchParams) {
    if (key !== 'schema' || value !== 'public') refuse(`unexpected connection parameter "${key}"`);
  }
  return parsed.toString();
}

/**
 * Environment for the child processes: everything that could redirect a
 * database connection is removed, then the validated target is set. Variables
 * in the process environment take precedence over .env files for the Prisma
 * CLI and dotenv, so the root .env can't redirect the reset.
 */
function childEnvironment(target, env = process.env) {
  const out = {};
  for (const [key, value] of Object.entries(env)) {
    if (key === 'DATABASE_URL' || key === 'DIRECT_URL' || key.startsWith('PG')) continue;
    out[key] = value;
  }
  out.DATABASE_URL = target;
  out.DIRECT_URL = target;
  // prisma/seed.ts never loads the root .env under NODE_ENV=test.
  out.NODE_ENV = 'test';
  return out;
}

function refuseUnidentified(reason) {
  const error = new Error(
    `Refusing to run a destructive database command: ${reason}. ` +
      `The target must be positively identified as the disposable test database ${TARGET_LABEL} ` +
      `(database setting ${DISPOSABLE_MARKER.name} = ${DISPOSABLE_MARKER.value}).`,
  );
  error.code = 'RESET_TARGET_REFUSED';
  throw error;
}

/**
 * Asks the server who it is: database, user, and the disposable marker. Uses
 * psql with a clean environment (no inherited PG* variables, no psqlrc), so
 * nothing but the given URL decides where it connects.
 */
function databaseIdentity(url) {
  const u = new URL(url);
  const sql = `select current_database(), current_user, coalesce(current_setting('${DISPOSABLE_MARKER.name}', true), '')`;
  const result = spawnSync('psql', ['-XAtq', '-F', '\t', '-c', sql], {
    encoding: 'utf8',
    timeout: 15000,
    env: {
      PATH: process.env.PATH,
      PGHOST: u.hostname.replace(/^\[|\]$/g, ''),
      PGPORT: u.port || '5432',
      PGUSER: decodeURIComponent(u.username),
      PGPASSWORD: decodeURIComponent(u.password),
      PGDATABASE: decodeURIComponent(u.pathname.replace(/^\//, '')),
      PGCONNECT_TIMEOUT: '5',
      PGAPPNAME: 'curiousbees-reset-guard',
    },
  });
  if (result.error) refuseUnidentified(`psql could not be run (${result.error.code || result.error.message})`);
  if (result.status !== 0) refuseUnidentified('the database could not be reached to verify it');
  const [database, user, marker] = result.stdout.trim().split('\t');
  return { database, user, marker };
}

/** Throws unless the live identity is the disposable test database. */
function assertDisposableIdentity(identity) {
  if (!identity || identity.database !== RESET_TARGET.database) refuseUnidentified(`the server reports database "${identity && identity.database}"`);
  if (identity.user !== RESET_TARGET.user) refuseUnidentified(`the server reports user "${identity.user}"`);
  if (identity.marker !== DISPOSABLE_MARKER.value) {
    refuseUnidentified(`the database does not carry the disposable marker (${DISPOSABLE_MARKER.name} is "${identity.marker || ''}")`);
  }
}

/**
 * Full check before a destructive command: the URL names the test database
 * and the live server confirms it. Returns the validated URL.
 */
function verifyDisposableDatabase(url, env = process.env, identify = databaseIdentity) {
  const target = assertResetTarget(url, env);
  assertDisposableIdentity(identify(target));
  return target;
}

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const ALLOWED_CLOUD_SUFFIXES = ['.supabase.co', '.pooler.supabase.com'];

function isAllowedDatabaseHost(rawHost) {
  const host = rawHost.toLowerCase().replace(/^\[|\]$/g, '');
  if (LOCAL_HOSTS.has(host)) return true;
  return ALLOWED_CLOUD_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/** Query parameters that can't redirect a connection elsewhere. */
const SAFE_LOCAL_PARAMS = new Set(['schema', 'connection_limit', 'pool_timeout', 'connect_timeout', 'sslmode', 'application_name', 'pgbouncer', 'statement_cache_size', 'socket_timeout']);

/**
 * For data-writing developer tools (migrate dev, db push, demo seeds): the
 * database must be an authorized local or Supabase database. Refuses unknown,
 * third-party or production URLs. Returns the URL.
 */
function assertLocalDatabase(url, purpose, env = process.env) {
  const refuseLocal = (reason) => {
    const error = new Error(
      `Refusing to ${purpose}: ${reason}. ` +
        'This command only runs against an authorized development or Supabase database, never an unknown or production one.',
    );
    error.code = 'LOCAL_DATABASE_REQUIRED';
    throw error;
  };
  if (env.NODE_ENV === 'production') refuseLocal('NODE_ENV is "production"');
  if (!url) refuseLocal('DATABASE_URL is not set');
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    refuseLocal('DATABASE_URL could not be parsed');
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') refuseLocal(`protocol is "${parsed.protocol}"`);
  if (!isAllowedDatabaseHost(parsed.hostname)) refuseLocal(`host "${parsed.hostname}" is not this machine or Supabase`);
  for (const key of parsed.searchParams.keys()) {
    if (!SAFE_LOCAL_PARAMS.has(key)) refuseLocal(`unexpected connection parameter "${key}"`);
  }
  return url;
}

module.exports = {
  RESET_TARGET,
  TARGET_LABEL,
  DISPOSABLE_MARKER,
  assertResetTarget,
  childEnvironment,
  databaseIdentity,
  assertDisposableIdentity,
  verifyDisposableDatabase,
  assertLocalDatabase,
};
