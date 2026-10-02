/**
 * Safety rails for the integration suite, which drops and recreates the
 * database schema. They run before any application code is loaded and fail
 * closed: anything other than the dedicated, disposable test endpoint aborts
 * the run. There is deliberately no override.
 */

/** The only database the integration suite may reset. */
export const E2E_DATABASE = { host: '127.0.0.1', port: '55432', database: 'curiousbees', user: 'cbtest' } as const;

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

/**
 * Prefixes of variables that could point the suite at a real database or a
 * real external service. They are removed before the test configuration is
 * applied, so nothing from the developer's shell (or a future .env loader)
 * leaks into the run. PG* covers libpq overrides such as PGHOSTADDR, which psql
 * would otherwise honour.
 */
const SCRUBBED_PREFIXES = [
  'DATABASE_URL', 'DIRECT_URL', 'PG',
  'SUPABASE_', 'NEXT_PUBLIC_SUPABASE_',
  'AWS_',
  'BREVO_', 'MAIL_', 'SMTP_', 'MAIN_ADMIN_EMAIL', 'BOOTSTRAP_ADMIN_',
  'OPENSEARCH_',
  'GOOGLE_', 'GEMINI_', 'ZOOM_', 'VAPID_',
  'N8N_', 'EVENT_INGESTION_',
];

function refuse(reason: string): never {
  throw new Error(
    `Refusing to run the destructive integration suite: ${reason}. ` +
      `It only runs against postgresql://${E2E_DATABASE.user}@${E2E_DATABASE.host}:${E2E_DATABASE.port}/${E2E_DATABASE.database} with NODE_ENV=test.`,
  );
}

/**
 * Throws unless `url` is exactly the dedicated test database. Error messages
 * never echo the URL itself, so a password can't end up in test output.
 */
export function assertDisposableTestDatabase(url: string | undefined, nodeEnv: string | undefined): void {
  if (nodeEnv !== 'test') refuse(`NODE_ENV is "${nodeEnv ?? ''}", not "test"`);
  if (!url) refuse('E2E_DATABASE_URL is not set');

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    refuse('the database URL could not be parsed');
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') refuse(`protocol is "${parsed.protocol}"`);
  if (parsed.hostname !== E2E_DATABASE.host) refuse(`host is "${parsed.hostname}"`);
  if (parsed.port !== E2E_DATABASE.port) refuse(`port is "${parsed.port || '(default)'}"`);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (database !== E2E_DATABASE.database) refuse(`database is "${database}"`);
  const user = decodeURIComponent(parsed.username);
  if (user !== E2E_DATABASE.user) refuse(`user is "${user}"`);
  // libpq accepts connection keywords (host, hostaddr, port, dbname, service…)
  // as query parameters, and they override the URL. Only Prisma's schema=public is allowed.
  for (const [key, value] of parsed.searchParams) {
    if (key !== 'schema' || value !== 'public') refuse(`unexpected connection parameter "${key}"`);
  }
}

/** Throws unless the S3 endpoint is a local emulator. */
export function assertLocalS3Endpoint(url: string | undefined): void {
  if (!url) throw new Error('Refusing to run the integration suite: E2E_S3_ENDPOINT is not set.');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Refusing to run the integration suite: E2E_S3_ENDPOINT could not be parsed.');
  }
  if (parsed.protocol !== 'http:' || !LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new Error(`Refusing to run the integration suite: E2E_S3_ENDPOINT must be a local emulator, not "${parsed.host}".`);
  }
}

/** Removes every variable that could reach a real database or external service. */
export function scrubServiceEnvironment(env: NodeJS.ProcessEnv): void {
  for (const key of Object.keys(env)) {
    if (SCRUBBED_PREFIXES.some((prefix) => key.startsWith(prefix))) delete env[key];
  }
}
