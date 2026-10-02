import { assertDisposableTestDatabase, assertLocalS3Endpoint, scrubServiceEnvironment } from './e2e-safety';

const TEST_DB = 'postgresql://cbtest:cbtest_local_only@127.0.0.1:55432/curiousbees';

describe('assertDisposableTestDatabase', () => {
  it('accepts only the dedicated test database', () => {
    expect(() => assertDisposableTestDatabase(TEST_DB, 'test')).not.toThrow();
    expect(() => assertDisposableTestDatabase(`${TEST_DB}?schema=public`, 'test')).not.toThrow();
    expect(() => assertDisposableTestDatabase(TEST_DB.replace('postgresql:', 'postgres:'), 'test')).not.toThrow();
  });

  it.each([
    // The development database that the 2026-10-01 incident reset.
    ['the development database (localhost)', 'postgresql://maddy@localhost:5432/srm_curiousbees_db?schema=public'],
    ['the development database (127.0.0.1)', 'postgresql://maddy:secret@127.0.0.1:5432/srm_curiousbees_db'],
    ['the Docker compose database', 'postgresql://postgres:postgres@postgres:5432/srm_curiousbees_db?schema=public'],
    ['a remote database', 'postgresql://cbtest:x@db.example.supabase.co:55432/curiousbees'],
    ['localhost instead of 127.0.0.1', 'postgresql://cbtest:x@localhost:55432/curiousbees'],
    ['the right database on the default port', 'postgresql://cbtest:x@127.0.0.1/curiousbees'],
    ['the right server, another database', 'postgresql://cbtest:x@127.0.0.1:55432/srm_curiousbees_db'],
    ['the right server, another user', 'postgresql://postgres:x@127.0.0.1:55432/curiousbees'],
    ['a trailing path segment', 'postgresql://cbtest:x@127.0.0.1:55432/curiousbees/'],
    ['a host override parameter', `${TEST_DB}?host=/var/run/postgresql`],
    ['a hostaddr override parameter', `${TEST_DB}?hostaddr=10.0.0.5`],
    ['a port override parameter', `${TEST_DB}?port=5432`],
    ['a dbname override parameter', `${TEST_DB}?dbname=srm_curiousbees_db`],
    ['a service parameter', `${TEST_DB}?service=dev`],
    ['another schema', `${TEST_DB}?schema=other`],
    ['a multi-host URL', 'postgresql://cbtest:x@127.0.0.1:55432,localhost:5432/curiousbees'],
    ['another protocol', 'mysql://cbtest:x@127.0.0.1:55432/curiousbees'],
    ['an unparseable value', 'not a url'],
  ])('refuses %s', (_label, url) => {
    expect(() => assertDisposableTestDatabase(url, 'test')).toThrow(/Refusing to run the destructive integration suite/);
  });

  it('refuses when the URL is missing', () => {
    expect(() => assertDisposableTestDatabase(undefined, 'test')).toThrow(/E2E_DATABASE_URL is not set/);
    expect(() => assertDisposableTestDatabase('', 'test')).toThrow(/E2E_DATABASE_URL is not set/);
  });

  it.each(['development', 'production', undefined])('refuses NODE_ENV=%s even for the test database', (nodeEnv) => {
    expect(() => assertDisposableTestDatabase(TEST_DB, nodeEnv)).toThrow(/NODE_ENV/);
  });

  it('never repeats the password in its error message', () => {
    try {
      assertDisposableTestDatabase('postgresql://maddy:Sup3rS3cret@127.0.0.1:5432/srm_curiousbees_db', 'test');
      throw new Error('expected a refusal');
    } catch (e: any) {
      expect(e.message).toMatch(/Refusing/);
      expect(e.message).not.toContain('Sup3rS3cret');
    }
  });
});

describe('assertLocalS3Endpoint', () => {
  it('accepts a local emulator', () => {
    expect(() => assertLocalS3Endpoint('http://127.0.0.1:59000')).not.toThrow();
    expect(() => assertLocalS3Endpoint('http://localhost:4566')).not.toThrow();
  });

  it.each([
    ['real S3', 'https://s3.ap-south-1.amazonaws.com'],
    ['another machine', 'http://10.0.0.5:4566'],
    ['https to localhost', 'https://localhost:4566'],
    ['nothing', undefined],
  ])('refuses %s', (_label, url) => {
    expect(() => assertLocalS3Endpoint(url)).toThrow(/Refusing to run the integration suite/);
  });
});

describe('scrubServiceEnvironment', () => {
  it('removes database and external-service settings and keeps the rest', () => {
    const env: NodeJS.ProcessEnv = {
      PATH: '/usr/bin',
      HOME: '/Users/someone',
      E2E_DATABASE_URL: TEST_DB,
      E2E_S3_ENDPOINT: 'http://127.0.0.1:59000',
      DATABASE_URL: 'postgresql://maddy@localhost:5432/srm_curiousbees_db',
      DIRECT_URL: 'postgresql://maddy@localhost:5432/srm_curiousbees_db',
      PGHOSTADDR: '127.0.0.1',
      PGPORT: '5432',
      AWS_PROFILE: 'curiousbees',
      AWS_SECRET_ACCESS_KEY: 'x',
      SUPABASE_SERVICE_ROLE_KEY: 'x',
      NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
      BREVO_API_KEY: 'x',
      MAIL_FROM_EMAIL: 'noreply@example.com',
      MAIN_ADMIN_EMAIL: 'admin@example.com',
      OPENSEARCH_ENDPOINT: 'https://search.example.com',
      GOOGLE_CLIENT_SECRET: 'x',
      GOOGLE_WORKSPACE_CLIENT_SECRET: 'x',
      GEMINI_API_KEY: 'x',
      ZOOM_WORKPLACE_CLIENT_SECRET: 'x',
      N8N_INTEGRATION_TOKEN: 'x'.repeat(40),
    };
    scrubServiceEnvironment(env);
    expect(Object.keys(env).sort()).toEqual(['E2E_DATABASE_URL', 'E2E_S3_ENDPOINT', 'HOME', 'PATH']);
  });
});
