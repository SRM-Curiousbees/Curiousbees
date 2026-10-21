import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { execSync } from 'child_process';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { SupabaseService } from '../src/auth/supabase.service';
import { assertDisposableTestDatabase, assertLiveDisposableDatabase } from './e2e-safety';

/**
 * Search and researcher discovery against a real PostgreSQL database:
 * moderation-hidden publications stay out of search, administrators are
 * excluded by role (not by name), and discovery returns profile fields only.
 * Needs no S3; Supabase is faked as in app.e2e-spec.ts ("tok:<email>").
 */
const fakeSupabase = {
  verifyToken: async (token: string) => {
    const [kind, email] = token.split(':');
    if (kind !== 'tok' || !email) throw new Error('invalid JWT');
    return { id: `sb-${email}`, email, emailVerified: true, user_metadata: {} };
  },
};

const API_ROOT = path.resolve(__dirname, '..');
const ACCOUNT_FIELDS = ['email', 'supabaseAuthId', 'clerkId', 'employeeId', 'supervisorEmail', 'supervisorId', 'approvedBy', 'approvedAt', 'status', 'suspended', 'emailVerified'];

describe('Search and discovery (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let http: any;
  const as = (email: string) => ({ get: (url: string) => http.get(url).set('Authorization', `Bearer tok:${email}`) });

  beforeAll(async () => {
    // Destructive reset below: check again, immediately before it, that this is the dedicated test database.
    assertDisposableTestDatabase(process.env.DATABASE_URL, process.env.NODE_ENV);
    if (process.env.DATABASE_URL !== process.env.E2E_DATABASE_URL) {
      throw new Error('Refusing to reset the database: DATABASE_URL no longer matches E2E_DATABASE_URL.');
    }
    // …and the live server must positively identify itself as the disposable test database.
    assertLiveDisposableDatabase(process.env.DATABASE_URL!);
    const env = { ...process.env };
    execSync(`psql "${process.env.DATABASE_URL!.split('?')[0]}" -qc "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"`, { env, stdio: 'pipe' });
    execSync('npx prisma migrate deploy', { cwd: API_ROOT, env, stdio: 'pipe' });
    execSync('npx ts-node --transpile-only src/scripts/seed-production.ts', { cwd: API_ROOT, env, stdio: 'pipe' });

    prisma = new PrismaClient();
    const person = (email: string, name: string, role: Role, extra: Record<string, unknown> = {}) =>
      prisma.user.create({
        data: {
          email, name, role, status: UserStatus.ACTIVE, approved: true, onboardingCompleted: true,
          employeeId: `EMP-${email.split('@')[0]}`, ...extra,
        },
      });
    await person('viewer@srmist.edu.in', 'Viewer Scholar', Role.RESEARCH_SCHOLAR);
    const padmini = await person('padmini@srmist.edu.in', 'Dr. Padmini Raman', Role.RESEARCH_SUPERVISOR, {
      bio: 'Graph neural networks for molecules',
      supervisorEmail: 'should-not-leak@srmist.edu.in',
    });
    await person('ops@srmist.edu.in', 'Graph Platform Admin', Role.INSTITUTE_ADMIN, { bio: 'Graph administrator' });
    await prisma.publication.createMany({
      data: [
        { title: 'Graph Learning Survey', authors: 'P. Raman', year: 2026, status: 'PUBLISHED', userId: padmini.id },
        { title: 'Graph Paper Under Moderation', authors: 'P. Raman', year: 2026, status: 'PUBLISHED', userId: padmini.id, hidden: true },
      ],
    });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SupabaseService)
      .useValue(fakeSupabase)
      .compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    configureApp(app);
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('search returns visible publications and never moderation-hidden ones', async () => {
    const { body } = await as('viewer@srmist.edu.in').get('/api/feed/search?q=Graph').expect(200);
    const titles = body.publications.map((p: any) => p.title);
    expect(titles).toContain('Graph Learning Survey');
    expect(titles).not.toContain('Graph Paper Under Moderation');
  });

  it('search finds people whose names contain "admin", but never administrators', async () => {
    const byName = await as('viewer@srmist.edu.in').get('/api/feed/search?q=Padmini').expect(200);
    expect(byName.body.users.map((u: any) => u.name)).toEqual(['Dr. Padmini Raman']);

    // "Admin" matches the two administrators by name, and Padmini (p-ADMIN-i); only she is a researcher.
    const admins = await as('viewer@srmist.edu.in').get('/api/feed/search?q=Admin').expect(200);
    expect(admins.body.users.map((u: any) => u.name)).toEqual(['Dr. Padmini Raman']);
    const graph = await as('viewer@srmist.edu.in').get('/api/feed/search?q=Graph').expect(200);
    expect(graph.body.users.map((u: any) => u.role)).not.toContain('INSTITUTE_ADMIN');
  });

  it('discovery (/users/collaborators) returns profile fields only', async () => {
    const { body } = await as('viewer@srmist.edu.in').get('/api/users/collaborators?search=graph').expect(200);
    expect(body.map((u: any) => u.name)).toEqual(['Dr. Padmini Raman']);
    const [padmini] = body;
    expect(padmini).toMatchObject({ name: 'Dr. Padmini Raman', role: 'RESEARCH_SUPERVISOR', bio: 'Graph neural networks for molecules', connectionStatus: 'NONE' });
    expect(Array.isArray(padmini.interests)).toBe(true);
    for (const field of ACCOUNT_FIELDS) expect(padmini).not.toHaveProperty(field);
    expect(JSON.stringify(body)).not.toMatch(/@srmist\.edu\.in/);
  });

  it('the supervisor list includes supervisors whose names contain "admin"', async () => {
    const { body } = await as('viewer@srmist.edu.in').get('/api/users/supervisors').expect(200);
    expect(body.map((u: any) => u.name)).toContain('Dr. Padmini Raman');
  });

  it('the researcher directory never lists administrators, even when asked for role=INSTITUTE_ADMIN', async () => {
    for (const url of ['/api/users/researchers', '/api/users/researchers?role=INSTITUTE_ADMIN', '/api/users/researchers?q=Admin']) {
      const { body } = await as('viewer@srmist.edu.in').get(url).expect(200);
      const people = body.items;
      expect(people.map((u: any) => u.role)).not.toContain('INSTITUTE_ADMIN');
    }
    const supervisors = await as('viewer@srmist.edu.in').get('/api/users/researchers?role=RESEARCH_SUPERVISOR').expect(200);
    const list = supervisors.body.items;
    expect(list.map((u: any) => u.name)).toEqual(['Dr. Padmini Raman']);
  });
});
