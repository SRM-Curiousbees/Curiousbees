/**
 * lib/auth/permissions.ts
 *
 * Defines which route prefixes each role is allowed to access.
 * Used by middleware.ts for edge-level route protection.
 *
 * Scalability note: extend `ROLE_PERMISSIONS` with new roles/routes as the
 * platform grows. No other file needs changing.
 */

import type { UserRole } from '@curiousbees/types';

// ─── Route Permission Matrix ──────────────────────────────────────────────────

/**
 * Maps each role to the list of route prefixes it is permitted to visit.
 * All portal routes NOT listed for a role will result in a redirect to
 * /auth/unauthorized.
 *
 * Rules are prefix-matched: '/dashboard' covers '/dashboard', '/dashboard/...', etc.
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  // Institute admins govern the platform (accounts, institution, moderation,
  // audit). They do not take part in research: no feed, researchers, events,
  // opportunities, workspaces, Nexus or research profile. The API enforces the
  // same rule (ResearchParticipantGuard).
  INSTITUTE_ADMIN: [
    '/',
    '/admin',
    '/institute-admin',
    '/settings',
    '/notifications',
  ],
  RESEARCH_SUPERVISOR: [
    '/',
    '/dashboard',
    '/feed',
    '/publications',
    '/opportunities',
    '/nexus',
    '/workspace',
    '/events',
    '/researchers',
    '/my-scholars',
    '/supervisor',
    '/profile',
    '/notifications',
    '/settings',
    '/chat',
  ],
  RESEARCH_SCHOLAR: [
    '/',
    '/dashboard',
    '/feed',
    '/publications',
    '/opportunities',
    '/my-research',
    '/nexus',
    '/workspace',
    '/events',
    '/researchers',
    '/scholar',
    '/profile',
    '/notifications',
    '/settings',
    '/chat',
  ],
};

// ─── Routes that are always public (no auth required) ────────────────────────

export const PUBLIC_ROUTES: string[] = [
  '/',
  '/login',
  '/sign-in',
  '/sign-up',
  '/about',
  '/features',
  '/auth',
  '/verification-pending',
  '/approval-pending',
  '/awaiting-supervisor-approval',
  '/account-rejected',
  '/access-denied',
  '/account-suspended',
  '/not-provisioned',
];

// ─── Core Permission Check ────────────────────────────────────────────────────

/**
 * Returns true if the given role is allowed to access the given pathname.
 *
 * @param role     The user's current role
 * @param pathname The Next.js pathname being accessed (e.g. '/admin')
 */
export function isRouteAllowedForRole(role: UserRole, pathname: string): boolean {
  const allowed = ROLE_PERMISSIONS[role] ?? [];
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

/** Scholars and supervisors take part in research; institute admins only govern. */
export function isResearchParticipant(role?: UserRole | string | null): boolean {
  return role === 'RESEARCH_SCHOLAR' || role === 'RESEARCH_SUPERVISOR';
}

/**
 * Returns true if the pathname is a public route (no auth needed).
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );
}

/**
 * Returns the path prefix for a given user role.
 */
export function getRolePrefix(role: UserRole): string {
  if (role === 'INSTITUTE_ADMIN') return '/admin';
  if (role === 'RESEARCH_SUPERVISOR') return '/supervisor';
  return '/scholar';
}
