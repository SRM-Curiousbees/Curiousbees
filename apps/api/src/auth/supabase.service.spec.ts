import * as http from 'http';
import { AddressInfo } from 'net';
import { SupabaseService, TokenVerificationError, supabaseAuthTimeoutMs, DEFAULT_SUPABASE_AUTH_TIMEOUT_MS } from './supabase.service';

/**
 * Runs the real supabase-js client against a local stand-in for Supabase Auth
 * (127.0.0.1 only; unit tests can't reach the network). Each test sets how
 * GET /auth/v1/user answers.
 */
describe('SupabaseService.verifyToken', () => {
  let server: http.Server;
  let baseUrl: string;
  let respond: (req: http.IncomingMessage, res: http.ServerResponse) => void;
  const saved = { ...process.env };

  beforeAll(async () => {
    server = http.createServer((req, res) => respond(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  const service = (env: Record<string, string> = {}) => {
    Object.assign(process.env, { SUPABASE_URL: baseUrl, SUPABASE_SERVICE_ROLE_KEY: 'test-service-role', SUPABASE_AUTH_TIMEOUT_MS: '500' }, env);
    const s = new SupabaseService();
    s.onModuleInit();
    return s;
  };

  const json = (res: http.ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  const rejection = (p: Promise<unknown>) => p.then(() => { throw new Error('expected a rejection'); }, (e) => e);

  it('returns the identity for a token Supabase accepts', async () => {
    respond = (req, res) => {
      expect(req.url).toBe('/auth/v1/user');
      expect(req.headers.authorization).toBe('Bearer good-token');
      json(res, 200, { id: 'sb-1', email: 'Scholar@SRMIST.edu.in', email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: {}, app_metadata: {} });
    };
    await expect(service().verifyToken('good-token')).resolves.toMatchObject({ id: 'sb-1', email: 'scholar@srmist.edu.in', emailVerified: true });
  });

  it('reports a rejected token as INVALID_TOKEN', async () => {
    respond = (_req, res) => json(res, 401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT: token is expired' });
    const e = await rejection(service().verifyToken('expired'));
    expect(e).toBeInstanceOf(TokenVerificationError);
    expect(e.reason).toBe('INVALID_TOKEN');
  });

  it('gives up after the timeout and reports AUTH_UNAVAILABLE', async () => {
    respond = () => { /* never answers */ };
    const started = Date.now();
    const e = await rejection(service({ SUPABASE_AUTH_TIMEOUT_MS: '600' }).verifyToken('any'));
    const elapsed = Date.now() - started;
    expect(e).toBeInstanceOf(TokenVerificationError);
    expect(e.reason).toBe('AUTH_UNAVAILABLE');
    expect(elapsed).toBeGreaterThanOrEqual(550);
    expect(elapsed).toBeLessThan(3000);
  });

  it.each([500, 502, 503, 504])('reports a Supabase %i as AUTH_UNAVAILABLE, not as a bad token', async (status) => {
    respond = (_req, res) => json(res, status, { msg: 'upstream error' });
    const e = await rejection(service().verifyToken('any'));
    expect(e.reason).toBe('AUTH_UNAVAILABLE');
  });

  it('reports an unparseable answer as AUTH_UNAVAILABLE', async () => {
    respond = (_req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<html>proxy error</html>'); };
    const e = await rejection(service().verifyToken('any'));
    expect(e).toBeInstanceOf(TokenVerificationError);
    expect(e.reason).toBe('AUTH_UNAVAILABLE');
  });

  it('reports a refused connection as AUTH_UNAVAILABLE', async () => {
    const e = await rejection(service({ SUPABASE_URL: 'http://127.0.0.1:1' }).verifyToken('any'));
    expect(e.reason).toBe('AUTH_UNAVAILABLE');
  });

  it('reports missing configuration as AUTH_UNAVAILABLE', async () => {
    const s = service();
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const unconfigured = new SupabaseService();
    unconfigured.onModuleInit();
    const e = await rejection(unconfigured.verifyToken('any'));
    expect(e.reason).toBe('AUTH_UNAVAILABLE');
    expect(s).toBeDefined();
  });

  it('refuses a verified user without an email', async () => {
    respond = (_req, res) => json(res, 200, { id: 'sb-2', email: '', user_metadata: {}, app_metadata: {} });
    const e = await rejection(service().verifyToken('phone-only'));
    expect(e.reason).toBe('INVALID_TOKEN');
  });
});

describe('supabaseAuthTimeoutMs', () => {
  it('uses the configured value within 0.5–30 s and the default otherwise', () => {
    expect(supabaseAuthTimeoutMs({ SUPABASE_AUTH_TIMEOUT_MS: '3000' })).toBe(3000);
    for (const bad of [undefined, '', 'abc', '100', '60000', '2.5']) {
      expect(supabaseAuthTimeoutMs({ SUPABASE_AUTH_TIMEOUT_MS: bad })).toBe(DEFAULT_SUPABASE_AUTH_TIMEOUT_MS);
    }
  });
});
