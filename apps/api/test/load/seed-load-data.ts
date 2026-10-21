/**
 * Resets the disposable test database and fills it with synthetic data at the
 * launch scale (1,500 registered users), then writes the fixture the k6 script
 * reads (user ids, their load-test tokens, sample thread ids).
 *
 * Only ever runs against cbtest@127.0.0.1:55432/curiousbees (checked twice,
 * the second time immediately before the reset). All names, emails and content
 * are made up; emails use the reserved .invalid domain.
 *
 *   LOAD_DATABASE_URL=… LOAD_TEST_FIXTURE=scripts/load/.fixture/fixture.json npm run load:seed
 */
import './load-env';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import * as path from 'path';
import { Prisma, PrismaClient, Role, UserStatus, ThreadType, EventStatus, ConnectionStatus } from '@prisma/client';
import { assertDisposableTestDatabase } from '../e2e-safety';
import { signLoadTestToken } from './token';

const API_ROOT = path.resolve(__dirname, '../..');
const DATABASE_URL = process.env.DIRECT_URL!; // load-env set it to the validated LOAD_DATABASE_URL
const FIXTURE = process.env.LOAD_TEST_FIXTURE;

const SCALE = {
  supervisors: 200,
  scholars: 1290,
  admins: 10,
  threads: 6000,
  comments: 20000,
  likes: 30000,
  saves: 5000,
  publications: 3000,
  events: 400,
  notificationsPerUser: 20,
  workspaces: 200,
  follows: 6000,
  connections: 3000,
  opportunities: 60,
};

const TOPICS = ['graph neural networks', 'quantum computing', 'bioinformatics', 'nanotechnology', 'cybersecurity', 'machine learning',
  'computer vision', 'renewable energy', 'robotics', 'materials science', 'signal processing', 'climate modelling'];
const SEARCH_TERMS = ['graph', 'quantum', 'bio', 'nano', 'security', 'learning', 'vision', 'energy', 'robot', 'materials'];

// Deterministic pseudo-random numbers, so runs are comparable.
let seed = 42;
const rand = () => {
  // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(items: T[]) => items[Math.floor(rand() * items.length)];
const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000 - between(0, 86399) * 1000);
/** ids accepted by the app's cuid validation (start with "c", no hyphens). */
const id = (kind: string, n: number) => `clt${kind}${String(n).padStart(6, '0')}`;
const pad = (n: number) => String(n).padStart(4, '0');

async function inBatches<T>(rows: T[], insert: (batch: T[]) => Promise<unknown>, size = 2000) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}

async function main() {
  if (!FIXTURE) throw new Error('LOAD_TEST_FIXTURE is not set.');
  // Destructive reset below: re-check the exact connection it will use.
  assertDisposableTestDatabase(DATABASE_URL, 'test');
  const env = { ...process.env, DATABASE_URL, NODE_ENV: 'test' };
  console.log('Resetting the disposable test database (127.0.0.1:55432/curiousbees)...');
  execSync(`psql "${DATABASE_URL.split('?')[0]}" -qc "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"`, { env, stdio: 'pipe' });
  execSync('npx prisma migrate deploy', { cwd: API_ROOT, env, stdio: 'pipe' });
  execSync('npx ts-node --transpile-only src/scripts/seed-production.ts', { cwd: API_ROOT, env, stdio: 'pipe' });

  const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
  const departments = await prisma.department.findMany({ select: { id: true, name: true, faculty: { select: { name: true } } } });
  const interests = await prisma.researchInterest.findMany({ select: { id: true } });
  if (departments.length === 0) throw new Error('The production seed created no departments.');

  // Users
  type U = { id: string; email: string; role: Role };
  const users: U[] = [];
  const add = (role: Role, n: number, label: string) => {
    for (let i = 1; i <= n; i++) users.push({ id: id(label[0], users.length + 1), email: `lt-${label}-${pad(i)}@loadtest.invalid`, role });
  };
  add(Role.RESEARCH_SUPERVISOR, SCALE.supervisors, 'supervisor');
  add(Role.RESEARCH_SCHOLAR, SCALE.scholars, 'scholar');
  add(Role.INSTITUTE_ADMIN, SCALE.admins, 'admin');
  const supervisors = users.filter((u) => u.role === Role.RESEARCH_SUPERVISOR);
  const researchers = users.filter((u) => u.role !== Role.INSTITUTE_ADMIN);

  await inBatches(users, (batch) => prisma.user.createMany({
    data: batch.map((u, i): Prisma.UserCreateManyInput => {
      const dept = pick(departments);
      return {
        id: u.id, email: u.email, role: u.role, status: UserStatus.ACTIVE, approved: true, onboardingCompleted: true,
        name: `${u.role === Role.RESEARCH_SUPERVISOR ? 'Dr. ' : ''}Load Test ${u.email.split('@')[0].slice(3)}`,
        departmentId: dept.id, department: dept.name, faculty: dept.faculty?.name,
        bio: `Researching ${pick(TOPICS)} and ${pick(TOPICS)}.`,
        supervisorId: u.role === Role.RESEARCH_SCHOLAR ? supervisors[i % supervisors.length].id : null,
        createdAt: daysAgo(between(1, 365)),
      };
    }),
  }));
  await inBatches(researchers.flatMap((u) => {
    const chosen = new Set<string>();
    while (chosen.size < Math.min(3, interests.length)) chosen.add(pick(interests).id);
    return [...chosen].map((interestId) => ({ userId: u.id, interestId }));
  }), (batch) => prisma.userInterest.createMany({ data: batch, skipDuplicates: true }));

  // Feed
  const threads = Array.from({ length: SCALE.threads }, (_, i) => ({
    id: id('thread', i + 1),
    title: `Notes on ${pick(TOPICS)} #${i + 1}`,
    content: `Synthetic load-test post about ${pick(TOPICS)}. `.repeat(between(2, 12)),
    type: pick([ThreadType.TEXT, ThreadType.RESEARCH_UPDATE, ThreadType.DISCUSSION, ThreadType.QUESTION]),
    tags: [pick(TOPICS), pick(TOPICS)],
    authorId: pick(researchers).id,
    hidden: rand() < 0.02,
    createdAt: daysAgo(between(0, 180)),
  }));
  await inBatches(threads, (batch) => prisma.thread.createMany({ data: batch }));
  const visibleThreads = threads.filter((t) => !t.hidden);
  await inBatches(Array.from({ length: SCALE.comments }, (_, i) => ({
    id: id('comment', i + 1), threadId: pick(visibleThreads).id, authorId: pick(researchers).id,
    content: `Synthetic comment ${i + 1}.`, createdAt: daysAgo(between(0, 120)),
  })), (batch) => prisma.comment.createMany({ data: batch }));
  await inBatches(Array.from({ length: SCALE.likes }, () => ({ threadId: pick(visibleThreads).id, userId: pick(researchers).id })),
    (batch) => prisma.threadLike.createMany({ data: batch, skipDuplicates: true }));
  await inBatches(Array.from({ length: SCALE.saves }, () => ({ threadId: pick(visibleThreads).id, userId: pick(researchers).id })),
    (batch) => prisma.savedThread.createMany({ data: batch, skipDuplicates: true }));

  // Publications, events, opportunities
  await inBatches(Array.from({ length: SCALE.publications }, (_, i) => ({
    id: id('pub', i + 1), title: `A study of ${pick(TOPICS)} (${i + 1})`, authors: 'Load Test et al.',
    year: between(2015, 2026), status: 'PUBLISHED', userId: pick(researchers).id, hidden: rand() < 0.05, createdAt: daysAgo(between(0, 700)),
  })), (batch) => prisma.publication.createMany({ data: batch }));
  await inBatches(Array.from({ length: SCALE.events }, (_, i) => ({
    id: id('event', i + 1), title: `Seminar: ${pick(TOPICS)}`, eventType: pick(['Seminar', 'Workshop', 'Conference']),
    date: daysAgo(between(-60, 60)), time: `${between(9, 17)}:00`, status: rand() < 0.9 ? EventStatus.PUBLISHED : EventStatus.REVIEW_REQUIRED,
    authorId: pick(supervisors).id, tags: [pick(TOPICS)],
  })), (batch) => prisma.event.createMany({ data: batch }));
  await prisma.opportunity.createMany({
    data: Array.from({ length: SCALE.opportunities }, (_, i) => {
      const dept = pick(departments);
      return {
        id: id('opp', i + 1), title: `Research position in ${pick(TOPICS)}`, description: 'Synthetic opportunity for load testing.',
        department: dept.name, departmentId: dept.id, researchDomain: pick(TOPICS), authorId: pick(supervisors).id,
      };
    }),
  });

  // Notifications, network
  await inBatches(researchers.flatMap((u) => Array.from({ length: SCALE.notificationsPerUser }, (_, i) => ({
    userId: u.id, title: 'Synthetic notification', body: `Load-test notification ${i + 1}`,
    readAt: rand() < 0.7 ? daysAgo(between(0, 30)) : null, createdAt: daysAgo(between(0, 60)),
  }))), (batch) => prisma.notification.createMany({ data: batch }), 5000);
  await inBatches(Array.from({ length: SCALE.follows }, () => ({ followerId: pick(researchers).id, followingId: pick(researchers).id }))
    .filter((f) => f.followerId !== f.followingId), (batch) => prisma.userFollow.createMany({ data: batch, skipDuplicates: true }));
  await inBatches(Array.from({ length: SCALE.connections }, () => ({
    requesterId: pick(researchers).id, receiverId: pick(researchers).id, status: rand() < 0.6 ? ConnectionStatus.CONNECTED : ConnectionStatus.PENDING,
  })).filter((c) => c.requesterId !== c.receiverId), (batch) => prisma.researchConnection.createMany({ data: batch, skipDuplicates: true }));

  // Workspaces: a supervisor and 3–6 scholars each
  const scholars = users.filter((u) => u.role === Role.RESEARCH_SCHOLAR);
  const memberships = new Map<string, string[]>();
  const members: { workspaceId: string; userId: string; role: string }[] = [];
  const workspaces = Array.from({ length: SCALE.workspaces }, (_, i) => {
    const workspaceId = id('ws', i + 1);
    const owner = supervisors[i % supervisors.length];
    const team = new Set<string>([owner.id]);
    while (team.size < between(4, 7)) team.add(pick(scholars).id);
    for (const userId of team) {
      members.push({ workspaceId, userId, role: userId === owner.id ? 'OWNER' : 'MEMBER' });
      memberships.set(userId, [...(memberships.get(userId) || []), workspaceId]);
    }
    return { id: workspaceId, title: `Workspace: ${pick(TOPICS)}`, supervisorId: owner.id };
  });
  await prisma.workspace.createMany({ data: workspaces });
  await inBatches(members, (batch) => prisma.workspaceMember.createMany({ data: batch, skipDuplicates: true }));

  await prisma.$executeRawUnsafe('ANALYZE');
  const counts = {
    users: await prisma.user.count(), threads: await prisma.thread.count(), comments: await prisma.comment.count(),
    likes: await prisma.threadLike.count(), publications: await prisma.publication.count(), events: await prisma.event.count(),
    notifications: await prisma.notification.count(), workspaces: await prisma.workspace.count(),
  };
  await prisma.$disconnect();

  // Fixture for the k6 script and the load server. Test values for the local app only.
  const secret = randomBytes(32).toString('hex');
  mkdirSync(path.dirname(path.resolve(FIXTURE)), { recursive: true });
  writeFileSync(FIXTURE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    secret,
    searchTerms: SEARCH_TERMS,
    threadIds: visibleThreads.slice(0, 2000).map((t) => t.id),
    users: researchers.map((u) => ({ id: u.id, email: u.email, role: u.role, token: signLoadTestToken(secret, u.id), workspaceIds: memberships.get(u.id) || [] })),
    admins: users.filter((u) => u.role === Role.INSTITUTE_ADMIN).map((u) => ({ id: u.id, email: u.email, token: signLoadTestToken(secret, u.id) })),
  }));
  console.log('Synthetic data:', JSON.stringify(counts));
  console.log(`Fixture written to ${FIXTURE}`);
}

main().catch((e) => {
  console.error('Load-test seed failed:', e?.message || e);
  process.exit(1);
});
