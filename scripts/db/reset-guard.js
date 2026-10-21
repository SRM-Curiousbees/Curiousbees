/**
 * Safety rail for destructive database commands (`prisma migrate reset`).
 *
 * They may only target the dedicated, disposable test database. The target is
 * passed explicitly in RESET_DATABASE_URL; DATABASE_URL and .env files are
 * deliberately ignored, because they normally point at a real development or
 * production database. Fails closed and has no override. Same rule as the
 * integration suite (apps/api/test/e2e-safety.ts).
 */

/** The only database that may be reset. */
const RESET_TARGET = Object.freeze({ host: '127.0.0.1', port: '55432', database: 'curiousbees', user: 'cbtest' });

const TARGET_LABEL = `postgresql://${RESET_TARGET.user}@${RESET_TARGET.host}:${RESET_TARGET.port}/${RESET_TARGET.database}`;

function refuse(reason) {
  const error = new Error(
    `Refusing to reset the database: ${reason}. ` +
      `Destructive resets only run against the disposable test database ${TARGET_LABEL}, ` +
      'passed explicitly as RESET_DATABASE_URL.',
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
  if (!url) refuse('RESET_DATABASE_URL is not set (DATABASE_URL and .env are never used for resets)');

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    refuse('RESET_DATABASE_URL could not be parsed');
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

module.exports = { RESET_TARGET, TARGET_LABEL, assertResetTarget, childEnvironment };
