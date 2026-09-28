import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from './supabase.service';
import { IS_PUBLIC_KEY } from './public.decorator';

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
    const authHeader = request.headers['authorization'];

    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      throw new UnauthorizedException('Authorization Bearer ID token is required.');
    }

    try {
      this.logger.debug(`Received Supabase bearer token for verification. tokenLength=${token.length}`);
      const decodedUser = await this.supabaseService.verifyToken(token);

      const email = decodedUser.email.toLowerCase().trim();
      const supabaseAuthId = decodedUser.id;
      const isMeEndpoint = request.url.endsWith('/auth/me');

      // 1. Primary lookup: Find user by supabaseAuthId
      let user = await this.prisma.user.findUnique({
        where: { supabaseAuthId },
        include: { interests: { include: { interest: true } } },
      });

      // 2. Secondary lookup: If not found by supabaseAuthId, lookup by email
      if (!user) {
        user = await this.prisma.user.findUnique({
          where: { email },
          include: { interests: { include: { interest: true } } },
        });

        // Self-Healing Link: Update supabaseAuthId for existing user record
        if (user && !user.supabaseAuthId) {
          this.logger.log(`Linking supabaseAuthId=${supabaseAuthId} to existing user ${email}`);
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { supabaseAuthId },
            include: { interests: { include: { interest: true } } },
          });
        }
      }

      // 3. User provisioning / auto-creation
      if (!user) {
        // Enforce allowed domains
        const allowedDomains = (
          process.env.ALLOWED_EMAIL_DOMAINS ||
          process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS ||
          'gmail.com'
        )
          .split(',')
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean);

        const isAllowedDomain = allowedDomains.some((domain) => email.endsWith('@' + domain));

        if (!isAllowedDomain) {
          this.logger.warn(`Unauthorized domain attempted registration: ${email}`);
          throw new ForbiddenException({
            message: 'CuriousBees is restricted to authorized accounts.',
            code: 'EMAIL_DOMAIN_NOT_ALLOWED',
          });
        }

        const name = decodedUser.user_metadata?.full_name ||
          decodedUser.user_metadata?.name ||
          email.split('@')[0];
        const image = decodedUser.user_metadata?.avatar_url ||
          decodedUser.user_metadata?.picture ||
          null;

        const configuredAdmins = (
          process.env.ADMIN_EMAILS ||
          process.env.MAIN_ADMIN_EMAIL ||
          'curiousbees@srmist.edu.in,r.matheshwaran.io@gmail.com'
        )
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        const role = configuredAdmins.includes(email) ? 'INSTITUTE_ADMIN' : 'RESEARCH_SCHOLAR';

        this.logger.log(`Auto-provisioning user profile for ${email} with role ${role}`);
        user = await this.prisma.user.create({
          data: {
            supabaseAuthId,
            email,
            name,
            image,
            role,
            approved: true,
            status: 'ACTIVE',
            onboardingCompleted: true,
            emailVerified: new Date(),
          },
          include: {
            interests: {
              include: {
                interest: true,
              },
            },
          },
        });
      }

      // 4. Check for suspended user status
      if (user.status === 'SUSPENDED' || user.suspended) {
        if (isMeEndpoint) {
          request.user = user;
          return true;
        }
        throw new ForbiddenException({
          message: 'Your account has been suspended.',
          code: 'USER_SUSPENDED',
        });
      }

      // 5. Update user avatar if newer from OAuth and not set
      if (!user.image && decodedUser.user_metadata?.avatar_url) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { image: decodedUser.user_metadata.avatar_url },
          include: { interests: { include: { interest: true } } },
        });
      }

      request.user = user;
      request.userEmail = email;
      return true;
    } catch (e: any) {
      this.logger.error(`Supabase authentication failed: ${e.message}`);
      throw new UnauthorizedException({
        message: e.message || 'Authentication failed.',
        code: 'SUPABASE_AUTH_FAILED',
      });
    }
  }
}
