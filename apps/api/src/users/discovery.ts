import { Prisma, Role } from '@prisma/client';

/** Roles that appear in research discovery and search. Institute administrators never do. */
export const RESEARCH_ROLES: Role[] = [Role.RESEARCH_SCHOLAR, Role.RESEARCH_SUPERVISOR];

/**
 * Fields any signed-in researcher may see about another researcher in
 * discovery lists, the same profile fields the researcher directory returns.
 * No email, sign-in identifiers, employee numbers or approval details.
 */
export const DISCOVERY_PROFILE_SELECT = {
  id: true,
  name: true,
  image: true,
  role: true,
  department: true,
  faculty: true,
  departmentId: true,
  departmentRef: {
    select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } },
  },
  bio: true,
  interests: { include: { interest: true } },
} satisfies Prisma.UserSelect;
