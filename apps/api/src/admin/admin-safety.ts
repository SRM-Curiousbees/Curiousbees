import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role, UserStatus, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertEmailDomainAllowed, isEmailDomainAllowed, ROOT_ADMIN_EMAIL } from '../auth/email-policy';

export { ROOT_ADMIN_EMAIL };

/**
 * Guard rails for administrator user-management actions.
 * Protects the permanent root admin and ensures active administration continuity.
 */

const VALID_STATUSES = new Set<string>(Object.values(UserStatus));
const VALID_ROLES = new Set<string>(Object.values(Role));

export function parseUserStatus(status: unknown): UserStatus {
  if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
    throw new BadRequestException(`Invalid status. Allowed: ${[...VALID_STATUSES].join(', ')}.`);
  }
  return status as UserStatus;
}

export function parseRole(role: unknown): Role {
  if (typeof role !== 'string' || !VALID_ROLES.has(role)) {
    throw new BadRequestException(`Invalid role. Allowed: ${[...VALID_ROLES].join(', ')}.`);
  }
  return role as Role;
}

/** Admin-created accounts must use an allowed sign-in domain, or they could never log in. */
export function assertProvisionableEmail(email: string): void {
  assertEmailDomainAllowed(email);
}

export function assertNotSelf(actorId: string | undefined, targetId: string, action: string): void {
  if (actorId && actorId === targetId) {
    throw new ForbiddenException(`You cannot ${action} your own account.`);
  }
}

/** Root administrator cannot be modified, demoted, suspended, or deleted. */
export function assertNotRootAdmin(targetEmail: string | undefined | null, action: string): void {
  if (targetEmail && targetEmail.trim().toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
    throw new ForbiddenException(`The permanent root administrator (${ROOT_ADMIN_EMAIL}) cannot be ${action}.`);
  }
}

function isActiveAdmin(user: Pick<User, 'role' | 'status' | 'suspended'>): boolean {
  return user.role === Role.INSTITUTE_ADMIN && user.status === UserStatus.ACTIVE && !user.suspended;
}

/**
 * Prevents an action that would leave the platform with no active institute
 * admin (e.g. suspending, deactivating, demoting or deleting the last one).
 */
export async function assertKeepsAnActiveAdmin(
  prisma: PrismaService,
  target: Pick<User, 'id' | 'role' | 'status' | 'suspended'> & { email?: string },
  after: { role?: Role; status?: UserStatus; deleted?: boolean },
): Promise<void> {
  if (target.email && target.email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
    if (after.deleted || (after.role && after.role !== Role.INSTITUTE_ADMIN) || (after.status && after.status !== UserStatus.ACTIVE)) {
      throw new ForbiddenException(`The permanent root administrator (${ROOT_ADMIN_EMAIL}) cannot be altered, demoted, or deleted.`);
    }
  }

  if (!isActiveAdmin(target)) return;
  const stillActiveAdmin = !after.deleted && isActiveAdmin({
    role: after.role ?? target.role,
    status: after.status ?? target.status,
    suspended: after.status ? after.status === UserStatus.SUSPENDED : target.suspended,
  });
  if (stillActiveAdmin) return;

  const otherActiveAdmins = await prisma.user.count({
    where: { id: { not: target.id }, role: Role.INSTITUTE_ADMIN, status: UserStatus.ACTIVE, suspended: false },
  });
  if (otherActiveAdmins === 0) {
    throw new ForbiddenException('This change would leave CuriousBees without an active institute admin.');
  }
}

/** Non-throwing variant for bulk imports, which report per-row errors instead. */
export function isEmailAllowedForImport(email: string): boolean {
  return isEmailDomainAllowed(email);
}

/** Upper bound for admin spreadsheet imports (parsed in memory). */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
