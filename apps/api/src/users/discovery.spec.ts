import { UsersService } from './users.service';
import { DISCOVERY_PROFILE_SELECT } from './discovery';

/** Discovery and directory queries, checked against a Prisma mock. */
describe('UsersService researcher discovery', () => {
  let prisma: any;
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'me', interests: [{ interestId: 'i1' }] }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      researchConnection: { findMany: jest.fn().mockResolvedValue([]) },
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
    expect(where.NOT).toBeUndefined();
  });
});
