import { Controller, Get, INestApplication, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { configureApp } from '../../main';
import { RATE_LIMIT_DEFAULTS, SEARCH_THROTTLE, rateLimit, sessionTracker, throttlerOptions } from './rate-limits';

@Controller('rl')
class RateLimitedController {
  @Get('read') read() { return { ok: true }; }
  @Get('other') other() { return { ok: true }; }
  @Post('write') write() { return { ok: true }; }
  @Get('search') @Throttle({ default: SEARCH_THROTTLE }) search() { return { ok: true }; }
}

/** Small limits so each rule can be exercised quickly. */
const LIMITS = {
  RATE_LIMIT_USER_READ: '3',
  RATE_LIMIT_USER_WRITE: '2',
  RATE_LIMIT_ANONYMOUS: '2',
  RATE_LIMIT_SEARCH: '1',
  RATE_LIMIT_IP_TOTAL: '8',
};

describe('rate limiting (real HTTP pipeline, configureApp)', () => {
  const saved = { ...process.env };
  let app: INestApplication;

  /** A fresh app per test, so counters start at zero. */
  async function start(trustProxyHops: number) {
    Object.assign(process.env, LIMITS, { TRUST_PROXY_HOPS: String(trustProxyHops) });
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(throttlerOptions())],
      controllers: [RateLimitedController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    return request(app.getHttpServer());
  }

  afterEach(async () => {
    await app?.close();
    process.env = { ...saved };
  });

  const statuses = async (n: number, send: (i: number) => any) => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push((await send(i)).status);
    return out;
  };

  it('gives each signed-in session its own budget on a shared IP', async () => {
    const http = await start(0); // every request comes from the same socket address
    const asA = () => http.get('/api/rl/read').set('Authorization', 'Bearer token-A');
    expect(await statuses(4, asA)).toEqual([200, 200, 200, 429]);
    // Someone else on the same IP is unaffected.
    await http.get('/api/rl/read').set('Authorization', 'Bearer token-B').expect(200);
  });

  it('limits a session per endpoint, and writes more tightly than reads', async () => {
    const http = await start(0);
    const auth = (req: any) => req.set('Authorization', 'Bearer token-C');
    expect(await statuses(4, () => auth(http.get('/api/rl/read')))).toEqual([200, 200, 200, 429]);
    await auth(http.get('/api/rl/other')).expect(200);
    expect(await statuses(3, () => auth(http.post('/api/rl/write')))).toEqual([201, 201, 429]);
  });

  it('applies the search limit to search endpoints', async () => {
    const http = await start(0);
    const search = () => http.get('/api/rl/search').set('Authorization', 'Bearer token-D');
    expect(await statuses(2, search)).toEqual([200, 429]);
  });

  it('limits requests without a token per IP, including malformed Authorization headers', async () => {
    const http = await start(0);
    const anon = (i: number) => {
      const req = http.get('/api/rl/read');
      return i === 1 ? req.set('Authorization', 'Basic abc') : i === 2 ? req.set('Authorization', 'Bearer') : req;
    };
    expect(await statuses(3, anon)).toEqual([200, 200, 429]);
  });

  it('ignores X-Forwarded-For when no proxy is trusted, so rotating it does not reset the budget', async () => {
    const http = await start(0);
    const spoofed = (i: number) => http.get('/api/rl/read').set('X-Forwarded-For', `198.51.100.${i + 1}`);
    expect(await statuses(3, spoofed)).toEqual([200, 200, 429]);
  });

  it('behind a trusted proxy, uses the address the proxy saw and ignores client-injected hops', async () => {
    const http = await start(1); // supertest's socket plays the proxy, which appends the real client
    const viaProxy = (spoof: string) => http.get('/api/rl/read').set('X-Forwarded-For', `${spoof}, 203.0.113.7`);
    expect(await statuses(3, (i) => viaProxy(`1.2.3.${i}`))).toEqual([200, 200, 429]);
    // A different real client behind the same proxy has its own budget.
    await http.get('/api/rl/read').set('X-Forwarded-For', '203.0.113.8').expect(200);
  });

  it('keeps a session limited when it switches IP addresses', async () => {
    const http = await start(1);
    const roaming = (i: number) => http.get('/api/rl/read').set('Authorization', 'Bearer token-E').set('X-Forwarded-For', `203.0.113.${10 + i}`);
    expect(await statuses(4, roaming)).toEqual([200, 200, 200, 429]);
  });

  it('caps the total from one IP across all endpoints, whatever tokens it presents', async () => {
    const http = await start(0);
    const paths = ['/api/rl/read', '/api/rl/other'];
    // Each request uses a new made-up token, so only the per-IP total can stop them.
    const flood = (i: number) => http.get(paths[i % 2]).set('Authorization', `Bearer made-up-${i}`);
    const result = await statuses(9, flood);
    expect(result.slice(0, 8)).toEqual(Array(8).fill(200));
    expect(result[8]).toBe(429);
    const blocked = await http.get('/api/rl/read').set('Authorization', 'Bearer made-up-again');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after-ip']).toBeDefined();
  });
});

describe('rate limit configuration', () => {
  it('reads positive integers from the environment and falls back to the defaults', () => {
    expect(rateLimit('RATE_LIMIT_USER_READ', { RATE_LIMIT_USER_READ: '500' })).toBe(500);
    for (const bad of [undefined, '', '0', '-5', '2.5', 'abc']) {
      expect(rateLimit('RATE_LIMIT_IP_TOTAL', { RATE_LIMIT_IP_TOTAL: bad })).toBe(RATE_LIMIT_DEFAULTS.RATE_LIMIT_IP_TOTAL);
    }
  });

  it('keys sessions by a token hash, never the token itself', () => {
    const tracker = sessionTracker({ headers: { authorization: 'Bearer eyJ.secret-token.sig' }, ip: '203.0.113.7' });
    expect(tracker).toMatch(/^session:[0-9a-f]{32}$/);
    expect(tracker).not.toContain('secret-token');
    expect(sessionTracker({ headers: {}, ip: '203.0.113.7' })).toBe('ip:203.0.113.7');
  });
});
