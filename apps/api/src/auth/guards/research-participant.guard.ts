import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/** Roles that take part in research: posting, discussing, following and collaborating. */
export const RESEARCH_PARTICIPANT_ROLES = new Set(['RESEARCH_SCHOLAR', 'RESEARCH_SUPERVISOR', 'SCHOLAR', 'SUPERVISOR']);

export const ADMIN_PARTICIPATION_MESSAGE =
  'Institute administrators govern the platform and cannot take part in research activity.';

/**
 * Restricts research participation endpoints to scholars and supervisors.
 * Institute administrators manage accounts, the institution and moderation
 * through the /admin endpoints; read-only access elsewhere is unaffected.
 * Must run after SupabaseAuthGuard (it reads request.user).
 */
@Injectable()
export class ResearchParticipantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (!user) {
      throw new ForbiddenException('User session required.');
    }
    if (!RESEARCH_PARTICIPANT_ROLES.has(user.role)) {
      throw new ForbiddenException(ADMIN_PARTICIPATION_MESSAGE);
    }
    return true;
  }
}
