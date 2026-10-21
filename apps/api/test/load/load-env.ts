/**
 * Environment for the load-test API server. Imported before any application
 * code (the config and logger read the environment at import time).
 *
 * The server only runs against the dedicated, disposable test database, can't
 * open a connection that leaves this machine, and has every real credential
 * removed. Supabase is replaced by locally signed test tokens (load-server.ts).
 */
import { assertDisposableTestDatabase, assertLiveDisposableDatabase, scrubServiceEnvironment } from '../e2e-safety';
import { blockNonLocalConnections } from '../network-guard';

const LOAD_DATABASE_URL = process.env.LOAD_DATABASE_URL;
// Same rule as the integration suite: only cbtest@127.0.0.1:55432/curiousbees.
assertDisposableTestDatabase(LOAD_DATABASE_URL, 'test');
// …and the live server must carry the disposable marker.
assertLiveDisposableDatabase(LOAD_DATABASE_URL!);

const positive = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/** Prisma pool per API instance; the production plan uses 5 (docs/deployment/aws-production.md). */
export const CONNECTION_LIMIT = positive(process.env.LOAD_DB_CONNECTION_LIMIT, 5);
export const PORT = positive(process.env.LOAD_TEST_PORT, 4100);
/** Optional pause in the fake token check, to model Supabase's round trip (0 = no Supabase cost). */
export const AUTH_LATENCY_MS = Number(process.env.LOAD_TEST_AUTH_LATENCY_MS || 0);
export const FIXTURE_PATH = process.env.LOAD_TEST_FIXTURE;
export const METRICS_PATH = process.env.LOAD_TEST_METRICS;
const ipTotal = process.env.LOAD_TEST_RATE_LIMIT_IP_TOTAL;

scrubServiceEnvironment(process.env);
blockNonLocalConnections();

Object.assign(process.env, {
  // Production mode for realistic behaviour: JSON info logging, sanitised errors, no Swagger.
  NODE_ENV: 'production',
  DATABASE_URL: `${LOAD_DATABASE_URL}&connection_limit=${CONNECTION_LIMIT}`,
  DIRECT_URL: LOAD_DATABASE_URL,
  FRONTEND_URL: 'https://loadtest.invalid',
  ALLOWED_ORIGINS: '',
  ALLOWED_EMAIL_DOMAINS: 'loadtest.invalid',
  TRUST_PROXY_HOPS: '0',
  // Placeholders that satisfy production config validation. Nothing can use them:
  // Supabase is replaced, mail is never sent (no network), and S3 presigning is
  // a local computation that never contacts S3.
  SUPABASE_URL: 'https://supabase.loadtest.invalid',
  SUPABASE_SERVICE_ROLE_KEY: 'load-test-placeholder',
  AWS_REGION: 'ap-south-1',
  AWS_S3_BUCKET: 'curiousbees-loadtest',
  AWS_ACCESS_KEY_ID: 'loadtest',
  AWS_SECRET_ACCESS_KEY: 'loadtest',
  BREVO_API_KEY: 'load-test-placeholder',
  MAIL_FROM_EMAIL: 'no-reply@loadtest.invalid',
  ENABLE_CRON: 'false',
  ENABLE_SWAGGER: 'false',
  LOG_TO_FILE: 'false',
  // All virtual users share 127.0.0.1, so the per-IP total would cap the generator,
  // not the API. Production keeps its own per-IP limit (docs/operations/rate-limiting.md).
  RATE_LIMIT_IP_TOTAL: ipTotal || '100000000',
});
