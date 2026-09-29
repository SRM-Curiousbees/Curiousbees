import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { execSync } from 'child_process';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { S3Client, CreateBucketCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { SupabaseService } from '../src/auth/supabase.service';

/**
 * Fake Supabase: a bearer token "tok:<email>" is a valid, verified session for
 * <email>; "unverified:<email>" is valid but unverified; anything else is invalid.
 */
const invites: string[] = [];
const fakeSupabase = {
  verifyToken: async (token: string) => {
    const [kind, email] = token.split(':');
    if (!email || (kind !== 'tok' && kind !== 'unverified')) throw new Error('invalid JWT');
    return { id: `sb-${email}`, email, emailVerified: kind === 'tok', user_metadata: {} };
  },
  client: { auth: { admin: { inviteUserByEmail: async (email: string) => { invites.push(email); return { data: {}, error: null }; } } } },
};

const API_ROOT = path.resolve(__dirname, '..');
let ipCounter = 0;
const nextClientIp = () => `198.51.100.${(ipCounter++ % 250) + 1}`;

describe('CuriousBees API (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let http: any;
  const s3 = new S3Client({
    region: 'ap-south-1',
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });

  // Every request comes "through" CloudFront + ALB with its own client IP so the
  // global rate limit only bites in the dedicated rate-limit test.
  const as = (email: string | null, token?: string) => {
    const withHeaders = (req: any) => {
      req.set('X-Forwarded-For', `${nextClientIp()}, 10.0.0.10`);
      if (token) req.set('Authorization', `Bearer ${token}`);
      else if (email) req.set('Authorization', `Bearer tok:${email}`);
      return req;
    };
    return {
      get: (url: string) => withHeaders(http.get(url)),
      post: (url: string) => withHeaders(http.post(url)),
      put: (url: string) => withHeaders(http.put(url)),
    };
  };

  let faculty: { id: string };
  let department: { id: string; facultyId: string };
  let otherDepartment: { id: string; facultyId: string };
  let scholar: { id: string };
  let outsider: { id: string };
  let workspaceId: string;

  beforeAll(async () => {
    // Fresh schema exactly as production gets it: migrate deploy + production seed.
    const env = { ...process.env };
    execSync(`psql "${process.env.DATABASE_URL!.split('?')[0]}" -qc "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"`, { env, stdio: 'pipe' });
    execSync('npx prisma migrate deploy', { cwd: API_ROOT, env, stdio: 'pipe' });
    execSync('npx ts-node --transpile-only src/scripts/seed-production.ts', { cwd: API_ROOT, env, stdio: 'pipe' });

    await s3.send(new CreateBucketCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      CreateBucketConfiguration: { LocationConstraint: 'ap-south-1' },
    })).catch((e) => { if (!/BucketAlready/.test(e.name)) throw e; });

    prisma = new PrismaClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SupabaseService)
      .useValue(fakeSupabase)
      .compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    configureApp(app);
    await app.init();
    http = request(app.getHttpServer());

    faculty = (await prisma.faculty.findFirstOrThrow({ where: { name: 'Faculty of Engineering & Technology' } }));
    department = await prisma.department.findUniqueOrThrow({ where: { code: 'CSE' } });
    otherDepartment = await prisma.department.findUniqueOrThrow({ where: { code: 'MCA' } });
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  // ─── Database / seed ───────────────────────────────────────────────────────
  describe('fresh database + production seed', () => {
    it('created all 53 application tables via prisma migrate deploy', async () => {
      const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(*) FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'`;
      expect(Number(count)).toBe(53);
    });

    it('seeded reference data and exactly one bootstrap admin, no other users', async () => {
      expect(await prisma.campus.count()).toBe(1);
      expect(await prisma.faculty.count()).toBeGreaterThan(5);
      expect(await prisma.department.count()).toBeGreaterThan(10);
      expect(await prisma.researchDomain.count()).toBeGreaterThan(3);
      const users = await prisma.user.findMany();
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({ email: 'admin@srmist.edu.in', role: Role.INSTITUTE_ADMIN, status: UserStatus.ACTIVE });
    });

    it('re-running the production seed is idempotent', async () => {
      const before = await prisma.department.count();
      execSync('npx ts-node --transpile-only src/scripts/seed-production.ts', { cwd: API_ROOT, env: process.env, stdio: 'pipe' });
      expect(await prisma.department.count()).toBe(before);
      expect(await prisma.user.count()).toBe(1);
    });
  });

  // ─── Health / public surface ───────────────────────────────────────────────
  describe('health and public endpoints', () => {
    it('GET /api/health/live reports the process is alive', async () => {
      const res = await as(null).get('/api/health/live').expect(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET /api/health checks the database', async () => {
      const res = await as(null).get('/api/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', database: 'connected' });
    });

    it('GET /api/system is not public and not for non-admins', async () => {
      await as(null).get('/api/system').expect(401);
      await as('admin@srmist.edu.in').get('/api/system').expect(200);
    });

    it('the removed arbitrary-key download endpoint no longer exists', async () => {
      await as('admin@srmist.edu.in').get('/api/files/presigned-download?key=workspaces/x/y/z/a.pdf').expect(404);
      await as('admin@srmist.edu.in').post('/api/files/presigned-upload').send({}).expect(404);
    });
  });

  // ─── Authentication & sign-up policy ───────────────────────────────────────
  describe('authentication policy', () => {
    it('rejects missing and invalid tokens', async () => {
      await as(null).get('/api/auth/me').expect(401);
      await as(null, 'forged.jwt.value').get('/api/auth/me').expect(401);
    });

    it('bootstrap admin signs in and is linked to its Supabase identity', async () => {
      const res = await as('admin@srmist.edu.in').get('/api/auth/me').expect(200);
      expect(res.body).toMatchObject({ access: true, user: { role: 'INSTITUTE_ADMIN' } });
      const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@srmist.edu.in' } });
      expect(admin.supabaseAuthId).toBe('sb-admin@srmist.edu.in');
    });

    it('an allowed-domain email that no admin created gets no access (Gmail)', async () => {
      const res = await as('stranger@gmail.com').get('/api/auth/me').expect(200);
      expect(res.body).toMatchObject({ access: false, reason: 'USER_NOT_PROVISIONED' });
      await as('stranger@gmail.com').get('/api/users/profile').expect(403);
      expect(await prisma.user.count({ where: { email: 'stranger@gmail.com' } })).toBe(0);
    });

    it('an allowed-domain email that no admin created gets no access (SRM)', async () => {
      const res = await as('unknown@srmist.edu.in').get('/api/auth/me').expect(200);
      expect(res.body).toMatchObject({ access: false, reason: 'USER_NOT_PROVISIONED' });
    });

    it('a non-allowed domain is refused', async () => {
      const res = await as('someone@yahoo.com').get('/api/auth/me').expect(200);
      expect(res.body).toMatchObject({ access: false, reason: 'EMAIL_DOMAIN_NOT_ALLOWED' });
      const denied = await as('someone@yahoo.com').get('/api/users/profile').expect(403);
      expect(denied.body.message).not.toMatch(/stack|at .*\.ts/);
    });
  });

  // ─── Admin user management ─────────────────────────────────────────────────
  describe('admin-managed users', () => {
    it('admin creates a Gmail scholar with faculty + department; the scholar can then sign in', async () => {
      const res = await as('admin@srmist.edu.in')
        .post('/api/admin/scholars')
        .send({ name: 'Gmail Scholar', email: 'Scholar.One@Gmail.com', facultyId: faculty.id, departmentId: department.id })
        .expect(201);
      scholar = res.body;
      expect(res.body).toMatchObject({ email: 'scholar.one@gmail.com', role: 'RESEARCH_SCHOLAR', status: 'ACTIVE', departmentId: department.id });
      expect(invites).toContain('scholar.one@gmail.com');

      const me = await as('scholar.one@gmail.com').get('/api/auth/me').expect(200);
      expect(me.body).toMatchObject({ access: true, user: { id: scholar.id, role: 'RESEARCH_SCHOLAR' } });
    });

    it('admin creates an SRM supervisor; signing in links the account', async () => {
      await as('admin@srmist.edu.in')
        .post('/api/admin/supervisors')
        .send({ name: 'Dr. SRM', email: 'dr.srm@srmist.edu.in', facultyId: faculty.id, departmentId: department.id })
        .expect(201);
      const me = await as('dr.srm@srmist.edu.in').get('/api/auth/me').expect(200);
      expect(me.body).toMatchObject({ access: true, user: { role: 'RESEARCH_SUPERVISOR' } });
    });

    it('Admin Panel "add user": creates an approved user with role, faculty and department', async () => {
      const res = await as('admin@srmist.edu.in')
        .post('/api/admin/users')
        .send({ name: 'Panel User', email: 'panel.user@srmist.edu.in', role: 'RESEARCH_SUPERVISOR', departmentId: department.id })
        .expect(201);
      expect(res.body).toMatchObject({
        role: 'RESEARCH_SUPERVISOR', status: 'ACTIVE', approved: true, departmentId: department.id,
        faculty: 'Faculty of Engineering & Technology',
      });
      await as('admin@srmist.edu.in').post('/api/admin/users').send({ name: 'X', email: 'x2@gmail.com', role: 'RESEARCH_SCHOLAR', departmentId: 'nope' }).expect(400);
      await as('admin@srmist.edu.in').post('/api/admin/users').send({ name: 'X', email: 'x3@gmail.com', role: 'ROOT' }).expect(400);
    });

    it('Admin Panel "edit user": role/status changes are validated server-side', async () => {
      const u = await prisma.user.findUniqueOrThrow({ where: { email: 'panel.user@srmist.edu.in' } });
      await as('admin@srmist.edu.in').put(`/api/admin/users/${u.id}`).send({ role: 'RESEARCH_SCHOLAR' }).expect(200);
      await as('admin@srmist.edu.in').put(`/api/admin/users/${u.id}`).send({ status: 'NOT_A_STATUS' }).expect(400);
      await as('admin@srmist.edu.in').put(`/api/admin/users/${u.id}`).send({ email: 'moved@hotmail.com' }).expect(403);
      await as('panel.user@srmist.edu.in').put(`/api/admin/users/${u.id}`).send({ role: 'INSTITUTE_ADMIN' }).expect(403);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).role).toBe(Role.RESEARCH_SCHOLAR);
    });

    it('admins cannot provision emails outside the allowed domains', async () => {
      const res = await as('admin@srmist.edu.in')
        .post('/api/admin/scholars')
        .send({ name: 'Nope', email: 'nope@outlook.com' })
        .expect(403);
      expect(res.body.message).toMatch(/not in an allowed sign-in domain/);
    });

    it('non-admins cannot use admin endpoints, whatever they send', async () => {
      await as('scholar.one@gmail.com').post('/api/admin/scholars').send({ name: 'X', email: 'x@gmail.com' }).expect(403);
      await as('scholar.one@gmail.com').get('/api/admin/users').expect(403);
      await as('scholar.one@gmail.com').put(`/api/users/${scholar.id}/role`).send({ role: 'INSTITUTE_ADMIN' }).expect(403);
      await as('scholar.one@gmail.com').put(`/api/admin/users/${scholar.id}/role`).send({ role: 'INSTITUTE_ADMIN', reason: 'x' }).expect(403);
      const after = await prisma.user.findUniqueOrThrow({ where: { id: scholar.id } });
      expect(after.role).toBe(Role.RESEARCH_SCHOLAR);
    });

    it('admin searches users', async () => {
      const res = await as('admin@srmist.edu.in').get('/api/admin/users?search=scholar.one').expect(200);
      expect(JSON.stringify(res.body)).toContain('scholar.one@gmail.com');
    });

    it('admin updates role (validated) and affiliation', async () => {
      await as('admin@srmist.edu.in').put(`/api/admin/users/${scholar.id}/role`).send({ role: 'SUPERADMIN', reason: 'test' }).expect(400);
      await as('admin@srmist.edu.in')
        .put(`/api/admin/users/${scholar.id}/affiliation`)
        .send({ facultyId: otherDepartment.facultyId, departmentId: otherDepartment.id, reason: 'transfer' })
        .expect(200);
      const updated = await prisma.user.findUniqueOrThrow({ where: { id: scholar.id } });
      expect(updated.departmentId).toBe(otherDepartment.id);
    });

    it('scholars cannot promote themselves through onboarding or registration', async () => {
      await prisma.user.update({ where: { id: scholar.id }, data: { status: UserStatus.PENDING_SUPERVISOR_APPROVAL } });
      await as('scholar.one@gmail.com').put('/api/users/onboard').send({ role: 'SUPERVISOR' }).expect(403);
      await as('scholar.one@gmail.com')
        .post('/api/users/register')
        .send({ name: 'x', role: 'SUPERVISOR', departmentId: department.id, employeeId: 'E1' })
        .expect(403);
      await as('scholar.one@gmail.com').post('/api/users/onboarding/supervisor').send({ researchArea: 'AI' }).expect(403);
      const after = await prisma.user.findUniqueOrThrow({ where: { id: scholar.id } });
      expect(after).toMatchObject({ role: Role.RESEARCH_SCHOLAR, approved: true });
      await prisma.user.update({ where: { id: scholar.id }, data: { status: UserStatus.ACTIVE } });
    });

    it('suspending a user blocks access immediately; reactivating restores it', async () => {
      await as('admin@srmist.edu.in').post(`/api/admin/users/${scholar.id}/suspend`).send({ reason: 'policy' }).expect(201);
      const me = await as('scholar.one@gmail.com').get('/api/auth/me').expect(200);
      expect(me.body).toMatchObject({ access: false, reason: 'USER_SUSPENDED' });
      await as('scholar.one@gmail.com').get('/api/users/profile').expect(403);

      await as('admin@srmist.edu.in').post(`/api/admin/users/${scholar.id}/reactivate`).send({ reason: 'resolved' }).expect(201);
      await as('scholar.one@gmail.com').get('/api/users/profile').expect(200);
    });

    it('deactivated users are blocked (not only suspended ones)', async () => {
      const temp = await prisma.user.create({ data: { email: 'temp@gmail.com', role: Role.RESEARCH_SCHOLAR, status: UserStatus.ACTIVE, approved: true } });
      await as('admin@srmist.edu.in').post(`/api/admin/users/${temp.id}/deactivate`).send({ reason: 'left' }).expect(201);
      const me = await as('temp@gmail.com').get('/api/auth/me').expect(200);
      expect(me.body).toMatchObject({ access: false, reason: 'USER_DEACTIVATED' });
    });

    it('the last active admin cannot suspend, demote or delete themselves', async () => {
      const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@srmist.edu.in' } });
      await as('admin@srmist.edu.in').post(`/api/admin/users/${admin.id}/suspend`).send({ reason: 'x' }).expect(403);
      await as('admin@srmist.edu.in').put(`/api/admin/users/${admin.id}/role`).send({ role: 'RESEARCH_SCHOLAR', reason: 'x' }).expect(403);
      await as('admin@srmist.edu.in').put(`/api/admin/admins/${admin.id}/status`).send({ status: 'SUSPENDED' }).expect(403);
    });
  });

  // ─── S3 file storage ───────────────────────────────────────────────────────
  describe('workspace files in the private bucket', () => {
    const pdfBytes = Buffer.from('%PDF-1.4\n% CuriousBees integration test\n%%EOF\n');
    let storageKey: string;
    let fileId: string;

    beforeAll(async () => {
      outsider = await prisma.user.create({ data: { email: 'outsider@srmist.edu.in', role: Role.RESEARCH_SCHOLAR, status: UserStatus.ACTIVE, approved: true } });
      const supervisor = await prisma.user.findUniqueOrThrow({ where: { email: 'dr.srm@srmist.edu.in' } });
      const ws = await prisma.workspace.create({
        data: {
          title: 'Thesis workspace',
          supervisorId: supervisor.id,
          members: { create: [{ userId: supervisor.id, role: 'OWNER' }, { userId: scholar.id, role: 'MEMBER' }] },
        },
      });
      workspaceId = ws.id;
    });

    it('a member gets a presigned upload URL; the browser PUTs straight to S3', async () => {
      const res = await as('scholar.one@gmail.com')
        .post(`/api/workspaces/${workspaceId}/files/upload-url`)
        .send({ filename: 'chapter 1.pdf', contentType: 'application/pdf', sizeBytes: pdfBytes.length })
        .expect(201);
      expect(res.body.storageKey).toMatch(new RegExp(`^workspaces/${workspaceId}/${scholar.id}/[0-9a-f-]{36}/chapter_1\\.pdf$`));
      expect(res.body).not.toHaveProperty('fileUrl');
      storageKey = res.body.storageKey;

      const put = await fetch(res.body.uploadUrl, { method: 'PUT', headers: res.body.requiredHeaders, body: pdfBytes });
      expect(put.status).toBe(200);
    });

    it('registers the upload by key only (no public URL stored)', async () => {
      const res = await as('scholar.one@gmail.com')
        .post(`/api/workspaces/${workspaceId}/files`)
        .send({ name: 'Chapter 1', storageKey })
        .expect(201);
      fileId = res.body.id;
      expect(res.body).toMatchObject({ storageKey, url: null, size: pdfBytes.length, contentType: 'application/pdf' });
    });

    it('members download through a short-lived presigned URL', async () => {
      const res = await as('dr.srm@srmist.edu.in').get(`/api/workspaces/${workspaceId}/files/${fileId}/download`).expect(200);
      expect(res.body.expiresIn).toBeLessThanOrEqual(300);
      const got = await fetch(res.body.downloadUrl);
      expect(got.status).toBe(200);
      expect(Buffer.from(await got.arrayBuffer()).equals(pdfBytes)).toBe(true);
      expect(got.headers.get('content-disposition')).toContain('Chapter 1.pdf');
    });

    // Anonymous-read denial is a property of the real bucket (Block Public Access +
    // bucket policy); S3 emulators don't enforce it, so it is verified post-deploy
    // by infra/aws/verify-deployment.sh against AWS instead of here.
    it('stores only the object key, never a URL to the object', async () => {
      const record = await prisma.workspaceFile.findUniqueOrThrow({ where: { id: fileId } });
      expect(record.url).toBeNull();
      expect(record.storageKey).toBe(storageKey);
      expect(record.storageKey).not.toMatch(/^https?:/);
    });

    it('non-members can neither download nor upload', async () => {
      await as('outsider@srmist.edu.in').get(`/api/workspaces/${workspaceId}/files/${fileId}/download`).expect(403);
      await as('outsider@srmist.edu.in')
        .post(`/api/workspaces/${workspaceId}/files/upload-url`)
        .send({ filename: 'a.pdf', contentType: 'application/pdf', sizeBytes: 10 })
        .expect(403);
    });

    it('rejects invalid types, mismatched extensions, oversized files and unknown fields', async () => {
      const post = (body: any) => as('scholar.one@gmail.com').post(`/api/workspaces/${workspaceId}/files/upload-url`).send(body);
      await post({ filename: 'x.exe', contentType: 'application/x-msdownload', sizeBytes: 10 }).expect(400);
      await post({ filename: 'x.html', contentType: 'application/pdf', sizeBytes: 10 }).expect(400);
      await post({ filename: 'big.zip', contentType: 'application/zip', sizeBytes: 50 * 1024 * 1024 + 1 }).expect(400);
      await post({ filename: 'x.pdf', contentType: 'application/pdf', sizeBytes: 0 }).expect(400);
      await post({ filename: 'x.pdf', contentType: 'application/pdf', sizeBytes: 10, prefix: '../../other' }).expect(400);
    });

    it('S3 rejects a body larger than the signed size', async () => {
      const res = await as('scholar.one@gmail.com')
        .post(`/api/workspaces/${workspaceId}/files/upload-url`)
        .send({ filename: 'small.pdf', contentType: 'application/pdf', sizeBytes: 10 })
        .expect(201);
      const put = await fetch(res.body.uploadUrl, { method: 'PUT', headers: res.body.requiredHeaders, body: Buffer.alloc(5000, 1) });
      expect(put.status).toBeGreaterThanOrEqual(400);
      const head = await s3.send(new HeadObjectCommand({ Bucket: process.env.AWS_S3_BUCKET!, Key: res.body.storageKey })).catch((e) => e);
      expect(head.$metadata.httpStatusCode).toBe(404);
    });

    it('cannot attach keys from another user, another workspace, or with path tricks', async () => {
      const attach = (key: string) =>
        as('scholar.one@gmail.com').post(`/api/workspaces/${workspaceId}/files`).send({ name: 'x', storageKey: key });
      await attach(storageKey.replace(scholar.id, outsider.id)).expect(403);
      await attach(`workspaces/other-ws/${scholar.id}/id/a.pdf`).expect(403);
      await attach(`workspaces/${workspaceId}/${scholar.id}/../../${outsider.id}/a.pdf`).expect(403);
      await attach(`workspaces/${workspaceId}/${scholar.id}/00000000-0000-0000-0000-000000000000/missing.pdf`).expect(400);
      await attach(storageKey).expect(400); // already attached
    });

    it('external links must be http(s)', async () => {
      await as('scholar.one@gmail.com').post(`/api/workspaces/${workspaceId}/files`).send({ name: 'x', url: 'javascript:alert(1)' }).expect(400);
      await as('scholar.one@gmail.com').post(`/api/workspaces/${workspaceId}/files`).send({ name: 'Dataset', url: 'https://doi.org/10.1000/xyz' }).expect(201);
    });
  });

  describe('route matching', () => {
    it('GET /api/opportunities/requests lists collaboration requests instead of being read as an opportunity id', async () => {
      const forSupervisor = await as('dr.srm@srmist.edu.in').get('/api/opportunities/requests').expect(200);
      expect(Array.isArray(forSupervisor.body)).toBe(true);
      const forScholar = await as('scholar.one@gmail.com').get('/api/opportunities/requests').expect(200);
      expect(Array.isArray(forScholar.body)).toBe(true);
    });
  });

  // ─── CORS / proxy / rate limiting / errors ─────────────────────────────────
  describe('edge behaviour', () => {
    it('CORS allows the production origin and nothing else', async () => {
      const ok = await http.options('/api/auth/me').set('Origin', 'https://srmcuriousbees.in').set('Access-Control-Request-Method', 'GET');
      expect(ok.headers['access-control-allow-origin']).toBe('https://srmcuriousbees.in');
      expect(ok.headers['access-control-allow-credentials']).toBe('true');

      for (const origin of ['https://curiousbees.vercel.app', 'https://evil.example', 'null']) {
        const bad = await http.options('/api/auth/me').set('Origin', origin).set('Access-Control-Request-Method', 'GET');
        expect(bad.headers['access-control-allow-origin']).toBeUndefined();
      }
    });

    it('rate limiting keys on the real client IP behind CloudFront + ALB, and ignores spoofed X-Forwarded-For', async () => {
      const send = (xff: string) => http.get('/api/version').set('X-Forwarded-For', xff);
      for (let i = 0; i < 120; i++) {
        await send('203.0.113.7, 10.0.0.10').expect(200);
      }
      await send('203.0.113.7, 10.0.0.10').expect(429);
      // A client-injected extra hop does not change the identified client.
      await send('1.2.3.4, 203.0.113.7, 10.0.0.10').expect(429);
      // A different real client is unaffected.
      await send('203.0.113.8, 10.0.0.10').expect(200);
    }, 120_000);

    it('errors are JSON without stack traces', async () => {
      const res = await as('admin@srmist.edu.in').get('/api/does-not-exist').expect(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(JSON.stringify(res.body)).not.toMatch(/\.ts:\d+|at [A-Z][A-Za-z]+\./);
    });
  });
});
