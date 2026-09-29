/**
 * Integration tests: real HTTP pipeline (configureApp) + real PostgreSQL +
 * an S3-compatible endpoint. Supabase is the only stubbed dependency.
 *
 * Requires:
 *   E2E_DATABASE_URL  - an empty, disposable PostgreSQL database (it is reset!)
 *   E2E_S3_ENDPOINT   - S3-compatible endpoint (e.g. LocalStack) with a disposable bucket
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/e2e-env.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
};
