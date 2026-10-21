/**
 * Load-test API server: the real AppModule and HTTP pipeline, against the
 * disposable test database, with Supabase replaced by locally signed tokens.
 * Listens on 127.0.0.1 only. Started by scripts/load/run.js; see docs/load-testing.md.
 *
 *   LOAD_DATABASE_URL=postgresql://cbtest:…@127.0.0.1:55432/curiousbees?schema=public \
 *   LOAD_TEST_FIXTURE=scripts/load/.fixture/fixture.json \
 *     npx ts-node --transpile-only apps/api/test/load/load-server.ts
 */
import { AUTH_LATENCY_MS, CONNECTION_LIMIT, FIXTURE_PATH, METRICS_PATH, PORT } from './load-env';
import { appendFileSync, readFileSync } from 'fs';
import { timingSafeEqual } from 'crypto';
import { monitorEventLoopDelay } from 'perf_hooks';
import { Test } from '@nestjs/testing';
import { WinstonModule } from 'nest-winston';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/main';
import { SupabaseService, TokenVerificationError } from '../../src/auth/supabase.service';
import { winstonOptions } from '../../src/config/winston.config';
import { signLoadTestToken } from './token';

export const LOAD_TEST_HEADER = 'x-curiousbees-load-test';

interface Fixture {
  secret: string;
  users: { id: string; email: string }[];
  admins?: { id: string; email: string }[];
}

function fakeSupabase(fixture: Fixture) {
  const emails = new Map([...fixture.users, ...(fixture.admins || [])].map((u) => [u.id, u.email]));
  return {
    verifyToken: async (token: string) => {
      if (AUTH_LATENCY_MS > 0) await new Promise((r) => setTimeout(r, AUTH_LATENCY_MS));
      const [version, userId] = token.split('.');
      const email = userId ? emails.get(userId) : undefined;
      const expected = userId ? Buffer.from(signLoadTestToken(fixture.secret, userId)) : Buffer.alloc(0);
      const presented = Buffer.from(token);
      if (version !== 'lt1' || !email || expected.length !== presented.length || !timingSafeEqual(expected, presented)) {
        throw new TokenVerificationError('INVALID_TOKEN', 'invalid load-test token');
      }
      return { id: `lt-sb-${userId}`, email, emailVerified: true, user_metadata: {} };
    },
  };
}

function startMetrics(path: string) {
  const loop = monitorEventLoopDelay({ resolution: 10 });
  loop.enable();
  let lastCpu = process.cpuUsage();
  let lastAt = process.hrtime.bigint();
  const timer = setInterval(() => {
    const now = process.hrtime.bigint();
    const cpu = process.cpuUsage(lastCpu);
    const wallUs = Number(now - lastAt) / 1000;
    const mem = process.memoryUsage();
    appendFileSync(path, JSON.stringify({
      at: new Date().toISOString(),
      cpuPercent: Math.round(((cpu.user + cpu.system) / wallUs) * 1000) / 10,
      rssMb: Math.round(mem.rss / 1048576),
      heapUsedMb: Math.round(mem.heapUsed / 1048576),
      eventLoopDelayMs: { p50: loop.percentile(50) / 1e6, p99: loop.percentile(99) / 1e6, max: loop.max / 1e6 },
    }) + '\n');
    loop.reset();
    lastCpu = process.cpuUsage();
    lastAt = now;
  }, 5000);
  timer.unref();
}

async function main() {
  if (!FIXTURE_PATH) throw new Error('LOAD_TEST_FIXTURE is not set; run the seed first (npm run load:seed).');
  const fixture: Fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SupabaseService)
    .useValue(fakeSupabase(fixture))
    .compile();
  const app = moduleRef.createNestApplication({ logger: WinstonModule.createLogger(winstonOptions) });
  // Every response says it came from this server; the runner refuses targets that don't.
  app.use((_req: any, res: any, next: () => void) => { res.setHeader(LOAD_TEST_HEADER, '1'); next(); });
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(PORT, '127.0.0.1');
  if (METRICS_PATH) startMetrics(METRICS_PATH);
  console.log(`[load-server] listening on http://127.0.0.1:${PORT} (pool ${CONNECTION_LIMIT}, auth latency ${AUTH_LATENCY_MS} ms)`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[load-server] failed to start:', e?.message || e);
    process.exit(1);
  });
}
