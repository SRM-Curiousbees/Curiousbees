import { UsersService } from './users.service';
import { DISCOVERY_PROFILE_SELECT, PUBLIC_AUTHOR_SELECT } from './discovery';

/** Discovery and directory queries, checked against a Prisma mock. */
describe('UsersService researcher discovery', () => {
  let prisma: any;
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'me', interests: [{ interestId: 'i1' }] }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      researchConnection: { findMany: jest.fn().mockResolvedValue([]) },
      userFollow: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new UsersService(prisma, {} as any, {} as any);
  });

  it('returns only approved profile fields from /users/collaborators', async () => {
    prisma.user.findMany.mockResolvedValueOnce([{ id: 'u2', name: 'Padmini R' }]);
    prisma.researchConnection.findMany.mockResolvedValueOnce([{ requesterId: 'me', receiverId: 'u2', status: 'PENDING' }]);
    const result = await service.getCollaborators('me', 'graphs');

    const args = prisma.user.findMany.mock.calls[0][0];
    expect(args.include).toBeUndefined();
    expect(args.select).toBe(DISCOVERY_PROFILE_SELECT);
    for (const field of ['email', 'supabaseAuthId', 'clerkId', 'employeeId', 'supervisorEmail', 'approvedBy', 'status', 'suspended']) {
      expect(args.select).not.toHaveProperty(field);
    }
    expect(result).toEqual([{ id: 'u2', name: 'Padmini R', connectionStatus: 'PENDING' }]);
  });

  it('excludes administrators by role, so names containing "admin" are not hidden', async () => {
    await service.getCollaborators('me');
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.role).toEqual({ in: ['RESEARCH_SCHOLAR', 'RESEARCH_SUPERVISOR'] });
    expect(JSON.stringify(where)).not.toMatch(/admin/i);
  });

  it('lists supervisors without a name-based filter', async () => {
    await service.getSupervisors();
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.role).toBe('RESEARCH_SUPERVISOR');
    expect(JSON.stringify(where)).not.toMatch(/admin/i);
  });

  it.each([
    [undefined, { in: ['RESEARCH_SCHOLAR', 'RESEARCH_SUPERVISOR'] }],
    ['RESEARCH_SCHOLAR', 'RESEARCH_SCHOLAR'],
    ['RESEARCH_SUPERVISOR', 'RESEARCH_SUPERVISOR'],
    ['INSTITUTE_ADMIN', { in: ['RESEARCH_SCHOLAR', 'RESEARCH_SUPERVISOR'] }],
    ['ADMIN', { in: ['RESEARCH_SCHOLAR', 'RESEARCH_SUPERVISOR'] }],
  ])('the researcher directory with role=%s lists only research roles', async (role, expected) => {
    prisma.user.findUnique.mockResolvedValue(null);
    await service.getResearchers('me', { role, q: 'Padmini' });
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.role).toEqual(expected);
    expect(where.status).toBe('ACTIVE');
    expect(where.suspended).toBe(false);
    expect(where.NOT).toBeUndefined();
  });

  it('combines search query q and department filter without overwriting q', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await service.getResearchers('me', { q: 'Padmini', department: 'CSE' });
    const args = prisma.user.findMany.mock.calls[0][0];
    expect(args.where.AND).toHaveLength(2);
    expect(args.select.supervisorProfile.select).not.toHaveProperty('employeeId');
  });

  it('getPublicProfile excludes sensitive PII, admins, and inactive users', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'u2', name: 'Dr. Priya' });
    await service.getPublicProfile('u2');

    const args = prisma.user.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({
      id: 'u2',
      role: { in: ['RESEARCH_SCHOLAR', 'RESEARCH_SUPERVISOR'] },
      status: 'ACTIVE',
      suspended: false,
    });
    for (const field of ['email', 'employeeId', 'supabaseAuthId', 'clerkId', 'supervisorEmail', 'approvedBy', 'status', 'suspended']) {
      expect(args.select).not.toHaveProperty(field);
    }
    expect(args.select.publications.where).toEqual({ hidden: false });
    expect(args.select.supervisor.select).not.toHaveProperty('email');
    expect(args.select.scholars.select).not.toHaveProperty('email');
    expect(args.select.scholars.select).not.toHaveProperty('employeeId');
  });

  it('getProfile (own profile) still returns full owner record', async () => {
    const ownerRecord = { id: 'me', email: 'me@srmist.edu.in', employeeId: 'EMP01' };
    prisma.user.findUnique.mockResolvedValueOnce(ownerRecord);
    const result = await service.getProfile('me');
    expect(result).toEqual(ownerRecord);
  });

  it('getFollowers and getFollowing exclude inactive users and use PUBLIC_AUTHOR_SELECT', async () => {
    await service.getFollowers('u2');
    const followerArgs = prisma.userFollow.findMany.mock.calls[0][0];
    expect(followerArgs.where.follower).toEqual({ status: 'ACTIVE', suspended: false });
    expect(followerArgs.include.follower.select).toBe(PUBLIC_AUTHOR_SELECT);

    await service.getFollowing('u2');
    const followingArgs = prisma.userFollow.findMany.mock.calls[1][0];
    expect(followingArgs.where.following).toEqual({ status: 'ACTIVE', suspended: false });
    expect(followingArgs.include.following.select).toBe(PUBLIC_AUTHOR_SELECT);
  });
});
