import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { assertKeepsAnActiveAdmin, assertNotRootAdmin, assertNotSelf, assertProvisionableEmail, parseRole, parseUserStatus } from './admin-safety';

describe('admin safety rules', () => {
  const admin = { id: 'a1', role: Role.INSTITUTE_ADMIN, status: UserStatus.ACTIVE, suspended: false };
  const prismaWith = (otherActiveAdmins: number) => ({ user: { count: jest.fn().mockResolvedValue(otherActiveAdmins) } }) as any;

  beforeEach(() => {
    process.env.ALLOWED_EMAIL_DOMAINS = 'gmail.com,srmist.edu.in';
  });

  it('blocks removing the last active institute admin', async () => {
    await expect(assertKeepsAnActiveAdmin(prismaWith(0), admin, { status: UserStatus.SUSPENDED })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(assertKeepsAnActiveAdmin(prismaWith(0), admin, { role: Role.RESEARCH_SCHOLAR })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(assertKeepsAnActiveAdmin(prismaWith(0), admin, { deleted: true })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows it when another active admin exists, and ignores non-admin targets', async () => {
    await expect(assertKeepsAnActiveAdmin(prismaWith(1), admin, { deleted: true })).resolves.toBeUndefined();
    const scholar = { ...admin, role: Role.RESEARCH_SCHOLAR };
    const prisma = prismaWith(0);
    await expect(assertKeepsAnActiveAdmin(prisma, scholar, { deleted: true })).resolves.toBeUndefined();
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it('prevents self-targeted actions', () => {
    expect(() => assertNotSelf('a1', 'a1', 'suspend')).toThrow(ForbiddenException);
    expect(() => assertNotSelf('a1', 'b2', 'suspend')).not.toThrow();
  });

  it('only provisions emails in the configured domains', () => {
    expect(() => assertProvisionableEmail('prof@srmist.edu.in')).not.toThrow();
    expect(() => assertProvisionableEmail('prof@outlook.com')).toThrow(ForbiddenException);
  });

  it('rejects unknown roles and statuses from request bodies', () => {
    expect(parseRole('RESEARCH_SUPERVISOR')).toBe(Role.RESEARCH_SUPERVISOR);
    expect(() => parseRole('SUPERADMIN')).toThrow(BadRequestException);
    expect(parseUserStatus('SUSPENDED')).toBe(UserStatus.SUSPENDED);
    expect(() => parseUserStatus('GOD_MODE')).toThrow(BadRequestException);
  });

  it('protects root administrator from any modification, suspension, or deletion', () => {
    expect(() => assertNotRootAdmin('srmcuriousbees@gmail.com', 'modified')).toThrow(ForbiddenException);
    expect(() => assertNotRootAdmin('SRMCURIOUSBEES@GMAIL.COM', 'suspended')).toThrow(ForbiddenException);
    expect(() => assertNotRootAdmin(' srmcuriousbees@gmail.com ', 'deleted')).toThrow(ForbiddenException);
    expect(() => assertNotRootAdmin('other@srmist.edu.in', 'modified')).not.toThrow();
  });
});
