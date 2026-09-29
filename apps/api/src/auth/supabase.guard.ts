import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from './supabase.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { isEmailDomainAllowed, normalizeEmail, ROOT_ADMIN_EMAIL } from './email-policy';

/**
 * Marks a handler that must still run when the caller is authenticated with
 * Supabase but not allowed into CuriousBees (e.g. GET /auth/me, which reports
 * the reason to the frontend). The guard then sets `request.user = null` and
 * `request.accessDenial` instead of throwing.
 */
export const ALLOW_ACCESS_DENIAL_KEY = 'allowAccessDenial';
export const AllowAccessDenial = () => SetMetadata(ALLOW_ACCESS_DENIAL_KEY, true);

export type AccessDenialReason =
  | 'EMAIL_DOMAIN_NOT_ALLOWED'
  | 'EMAIL_NOT_VERIFIED'
  | 'USER_NOT_PROVISIONED'
  | 'USER_SUSPENDED'
  | 'USER_DEACTIVATED';

const DENIAL_MESSAGES: Record<AccessDenialReason, string> = {
  EMAIL_DOMAIN_NOT_ALLOWED: 'CuriousBees is restricted to authorized email domains.',
  EMAIL_NOT_VERIFIED: 'Your email address has not been verified.',
  USER_NOT_PROVISIONED: 'Your account has not been added to CuriousBees by an administrator.',
  USER_SUSPENDED: 'Your account has been suspended.',
  USER_DEACTIVATED: 'Your account is not active.',
};

const INACTIVE_STATUSES: UserStatus[] = [UserStatus.DEACTIVATED, UserStatus.REJECTED];

const USER_INCLUDE = { interests: { include: { interest: true } } } as const;

/**
 * Authenticates the Supabase access token and authorizes the caller against
 * the CuriousBees user directory.
 *
 * Authorization model: a valid Supabase session only proves identity. Access
 * requires (1) an email in ALLOWED_EMAIL_DOMAINS and (2) a User record that an
 * administrator created, in a non-blocked status. Users are never created
 * here, and role/approval always come from the database.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';

    if (!token) {
      throw new UnauthorizedException({
        message: 'Authorization Bearer token is required.',
        code: 'AUTH_TOKEN_MISSING',
      });
    }

    let identity: Awaited<ReturnType<SupabaseService['verifyToken']>>;
    try {
      identity = await this.supabaseService.verifyToken(token);
    } catch (e: any) {
      this.logger.warn(`Supabase token rejected: ${e.message}`);
      throw new UnauthorizedException({
        message: 'Your session is invalid or has expired. Please sign in again.',
        code: 'SUPABASE_AUTH_FAILED',
      });
    }

    const allowDenial = this.reflector.getAllAndOverride<boolean>(ALLOW_ACCESS_DENIAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const email = normalizeEmail(identity.email);
    request.userEmail = email;

    const deny = (reason: AccessDenialReason, user: any = null): boolean => {
      if (allowDenial) {
        request.user = user;
        request.accessDenial = reason;
        return true;
      }
      throw new ForbiddenException({ message: DENIAL_MESSAGES[reason], code: reason });
    };

    if (!isEmailDomainAllowed(email)) {
      this.logger.warn(`Sign-in rejected for non-allowed email domain: ${email}`);
      return deny('EMAIL_DOMAIN_NOT_ALLOWED');
    }

    let user = await this.prisma.user.findUnique({
      where: { supabaseAuthId: identity.id },
      include: USER_INCLUDE,
    });

    if (email === ROOT_ADMIN_EMAIL) {
      if (!user) {
        user = await this.prisma.user.findUnique({
          where: { email: ROOT_ADMIN_EMAIL },
          include: USER_INCLUDE,
        });
      }
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: ROOT_ADMIN_EMAIL,
            name: identity.user_metadata?.full_name || 'Curiousbees',
            role: Role.INSTITUTE_ADMIN,
            status: UserStatus.ACTIVE,
            approved: true,
            suspended: false,
            onboardingCompleted: true,
            supabaseAuthId: identity.id,
            emailVerified: new Date(),
          },
          include: USER_INCLUDE,
        });
        this.logger.log(`Provisioned permanent root admin: ${ROOT_ADMIN_EMAIL}`);
      } else if (
        user.role !== Role.INSTITUTE_ADMIN ||
        user.status !== UserStatus.ACTIVE ||
        user.suspended ||
        !user.approved ||
        user.supabaseAuthId !== identity.id
      ) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            role: Role.INSTITUTE_ADMIN,
            status: UserStatus.ACTIVE,
            suspended: false,
            approved: true,
            onboardingCompleted: true,
            supabaseAuthId: identity.id,
          },
          include: USER_INCLUDE,
        });
        this.logger.log(`Re-synchronized permanent root admin permissions: ${ROOT_ADMIN_EMAIL}`);
      }
    } else {
      if (!user) {
        const provisioned = await this.prisma.user.findUnique({
          where: { email },
          include: USER_INCLUDE,
        });

        if (!provisioned) {
          this.logger.warn(`Sign-in rejected for unprovisioned email: ${email}`);
          return deny('USER_NOT_PROVISIONED');
        }

        // Linking an admin-created record to a Supabase identity by email is only
        // safe once Supabase has proven the caller controls that mailbox.
        if (!identity.emailVerified) {
          return deny('EMAIL_NOT_VERIFIED');
        }

        if (provisioned.supabaseAuthId && provisioned.supabaseAuthId !== identity.id) {
          this.logger.warn(`Re-linking ${email} to a new Supabase identity (previous identity was replaced).`);
        }
        user = await this.prisma.user.update({
          where: { id: provisioned.id },
          data: { supabaseAuthId: identity.id, emailVerified: provisioned.emailVerified ?? new Date() },
          include: USER_INCLUDE,
        });
        this.logger.log(`Linked Supabase identity to provisioned user ${email}`);
      }

      // Status is the source of truth; `suspended` is a legacy flag also set on deactivation.
      if (INACTIVE_STATUSES.includes(user.status)) {
        return deny('USER_DEACTIVATED', user);
      }
      if (user.status === UserStatus.SUSPENDED || user.suspended) {
        return deny('USER_SUSPENDED', user);
      }
    }

    const avatarUrl = identity.user_metadata?.avatar_url || identity.user_metadata?.picture;
    if (!user.image && avatarUrl) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { image: avatarUrl },
        include: USER_INCLUDE,
      });
    }

    request.user = user;
    return true;
  }
}
