// Runs before any test module is imported (ConfigModule reads env at import time).
if (!process.env.E2E_DATABASE_URL || !process.env.E2E_S3_ENDPOINT) {
  throw new Error('E2E_DATABASE_URL and E2E_S3_ENDPOINT must be set for integration tests (the database is reset).');
}
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: process.env.E2E_DATABASE_URL,
  DIRECT_URL: process.env.E2E_DATABASE_URL,
  ALLOWED_EMAIL_DOMAINS: 'gmail.com,srmist.edu.in',
  FRONTEND_URL: 'https://srmcuriousbees.in',
  ALLOWED_ORIGINS: '',
  TRUST_PROXY_HOPS: '2',
  AWS_REGION: 'ap-south-1',
  AWS_S3_BUCKET: 'curiousbees-e2e',
  AWS_S3_ENDPOINT: process.env.E2E_S3_ENDPOINT,
  // Dummy credentials for the local S3 emulator only.
  AWS_ACCESS_KEY_ID: 'test',
  AWS_SECRET_ACCESS_KEY: 'test',
  BOOTSTRAP_ADMIN_EMAIL: 'admin@srmist.edu.in',
  BOOTSTRAP_ADMIN_NAME: 'Bootstrap Admin',
  BREVO_API_KEY: '',
  LOG_TO_FILE: 'false',
});
