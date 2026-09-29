import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserStatus } from '@prisma/client';
import { SupabaseAuthGuard, ALLOW_ACCESS_DENIAL_KEY } from './supabase.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

const makeContext = (headers: Record<string, string>, request: any = {}) => {
  const req = { headers, ...request };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { ctx, req };
};

const activeUser = (overrides: any = {}) => ({
  id: 'u1',
  email: 'scholar@srmist.edu.in',
  supabaseAuthId: 'sb-1',
  role: 'RESEARCH_SCHOLAR',
  status: UserStatus.ACTIVE,
  suspended: false,
  approved: true,
  image: 'x',
  emailVerified: new Date(),
  ...overrides,
});

describe('SupabaseAuthGuard (provisioning & domain policy)', () => {
  let prisma: any;
  let supabase: any;
  let reflector: Reflector;
  let metadata: Record<string, boolean>;
  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    process.env.ALLOWED_EMAIL_DOMAINS = 'gmail.com,srmist.edu.in';
    prisma = { user: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() } };
    supabase = { verifyToken: jest.fn() };
    metadata = {};
    reflector = { getAllAndOverride: jest.fn((key: string) => metadata[key]) } as any;
    guard = new SupabaseAuthGuard(prisma, supabase, reflector);
  });

  const identity = (email: string, extra: any = {}) =>
    supabase.verifyToken.mockResolvedValue({ id: 'sb-1', email, emailVerified: true, ...extra });

  it('allows @Public routes without a token', async () => {
    metadata[IS_PUBLIC_KEY] = true;
    await expect(guard.canActivate(makeContext({}).ctx)).resolves.toBe(true);
  });

  it('rejects a missing or invalid token with 401', async () => {
    await expect(guard.canActivate(makeContext({}).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    supabase.verifyToken.mockRejectedValue(new Error('bad jwt'));
    await expect(guard.canActivate(makeContext({ authorization: 'Bearer x' }).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each(['someone@gmail.com', 'scholar@srmist.edu.in'])('lets a provisioned, active %s through with the DB role', async (email) => {
    identity(email);
    prisma.user.findUnique.mockResolvedValueOnce(activeUser({ email, role: 'RESEARCH_SUPERVISOR' }));
    const { ctx, req } = makeContext({ authorization: 'Bearer t' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user.role).toBe('RESEARCH_SUPERVISOR');
  });

  it.each(['x@yahoo.com', 'x@evilsrmist.edu.in', 'x@srmist.edu.in.attacker.com', 'x@mail.srmist.edu.in'])(
    'denies non-allowed domain %s',
    async (email) => {
      identity(email);
      await expect(guard.canActivate(makeContext({ authorization: 'Bearer t' }).ctx)).rejects.toMatchObject({
        response: { code: 'EMAIL_DOMAIN_NOT_ALLOWED' },
      });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    },
  );

  it('never auto-creates users: an unprovisioned allowed-domain email is denied', async () => {
    identity('new.person@gmail.com');
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(makeContext({ authorization: 'Bearer t' }).ctx)).rejects.toMatchObject({
      response: { code: 'USER_NOT_PROVISIONED' },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('reports the denial instead of throwing on @AllowAccessDenial routes (GET /auth/me)', async () => {
    metadata[ALLOW_ACCESS_DENIAL_KEY] = true;
    identity('new.person@gmail.com');
    prisma.user.findUnique.mockResolvedValue(null);
    const { ctx, req } = makeContext({ authorization: 'Bearer t' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toBeNull();
    expect(req.accessDenial).toBe('USER_NOT_PROVISIONED');
  });

  it('links an admin-created record by verified email on first sign-in', async () => {
    identity('invited@srmist.edu.in');
    const provisioned = activeUser({ id: 'u9', email: 'invited@srmist.edu.in', supabaseAuthId: null });
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(provisioned);
    prisma.user.update.mockResolvedValue({ ...provisioned, supabaseAuthId: 'sb-1' });
    const { ctx, req } = makeContext({ authorization: 'Bearer t' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'u9' },
      data: expect.objectContaining({ supabaseAuthId: 'sb-1' }),
    }));
    expect(req.user.id).toBe('u9');
  });

  it('refuses to link by email when Supabase has not verified the address', async () => {
    identity('invited@srmist.edu.in', { emailVerified: false });
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(activeUser({ supabaseAuthId: null }));
    await expect(guard.canActivate(makeContext({ authorization: 'Bearer t' }).ctx)).rejects.toMatchObject({
      response: { code: 'EMAIL_NOT_VERIFIED' },
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: UserStatus.SUSPENDED }, 'USER_SUSPENDED'],
    [{ suspended: true }, 'USER_SUSPENDED'],
    [{ status: UserStatus.DEACTIVATED }, 'USER_DEACTIVATED'],
    [{ status: UserStatus.REJECTED }, 'USER_DEACTIVATED'],
  ])('blocks %o accounts', async (overrides, code) => {
    identity('scholar@srmist.edu.in');
    prisma.user.findUnique.mockResolvedValueOnce(activeUser(overrides));
    await expect(guard.canActivate(makeContext({ authorization: 'Bearer t' }).ctx)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      (async () => {
        prisma.user.findUnique.mockResolvedValueOnce(activeUser(overrides));
        await guard.canActivate(makeContext({ authorization: 'Bearer t' }).ctx);
      })(),
    ).rejects.toMatchObject({ response: { code } });
  });

  it('applies a tightened domain policy from configuration alone (srmist.edu.in only)', async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = 'srmist.edu.in';
    identity('someone@gmail.com');
    await expect(guard.canActivate(makeContext({ authorization: 'Bearer t' }).ctx)).rejects.toMatchObject({
      response: { code: 'EMAIL_DOMAIN_NOT_ALLOWED' },
    });
  });

  it('denies everyone when no domains are configured (fails closed)', async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = '';
    identity('scholar@srmist.edu.in');
    await expect(guard.canActivate(makeContext({ authorization: 'Bearer t' }).ctx)).rejects.toMatchObject({
      response: { code: 'EMAIL_DOMAIN_NOT_ALLOWED' },
    });
  });
});
