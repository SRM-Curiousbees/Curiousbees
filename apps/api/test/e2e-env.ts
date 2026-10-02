// Runs before any test module is imported (ConfigModule reads env at import time).
import { assertDisposableTestDatabase, assertLocalS3Endpoint, scrubServiceEnvironment } from './e2e-safety';
import { blockNonLocalConnections } from './network-guard';

// The suite resets the database: it only ever runs against the dedicated test endpoint.
const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL;
const E2E_S3_ENDPOINT = process.env.E2E_S3_ENDPOINT;
assertDisposableTestDatabase(E2E_DATABASE_URL, 'test');
assertLocalS3Endpoint(E2E_S3_ENDPOINT);

// Nothing from the developer's shell may point the run at a real database or service.
scrubServiceEnvironment(process.env);
blockNonLocalConnections();

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: E2E_DATABASE_URL,
  DIRECT_URL: E2E_DATABASE_URL,
  ALLOWED_EMAIL_DOMAINS: 'gmail.com,srmist.edu.in',
  FRONTEND_URL: 'https://srmcuriousbees.in',
  ALLOWED_ORIGINS: '',
  TRUST_PROXY_HOPS: '2',
  AWS_REGION: 'ap-south-1',
  AWS_S3_BUCKET: 'curiousbees-e2e',
  AWS_S3_ENDPOINT: E2E_S3_ENDPOINT,
  // Dummy credentials for the local S3 emulator only.
  AWS_ACCESS_KEY_ID: 'test',
  AWS_SECRET_ACCESS_KEY: 'test',
  BOOTSTRAP_ADMIN_EMAIL: 'admin@srmist.edu.in',
  BOOTSTRAP_ADMIN_NAME: 'Bootstrap Admin',
  // Supabase is replaced by a fake in the suite; mail, search, Google and Zoom stay unconfigured.
  BREVO_API_KEY: '',
  ENABLE_CRON: 'false',
  LOG_TO_FILE: 'false',
});
