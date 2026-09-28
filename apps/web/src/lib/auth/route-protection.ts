/**
 * lib/auth/route-protection.ts
 *
 * Pure helpers: map a role to its canonical dashboard landing route.
 * Used by the login page (auto-redirect) and middleware (fallback redirect).
 *
 * Scalability note: when multi-role accounts land, this can return a
 * priority-ordered route based on the user's primary role.
 */

import type { UserRole } from '@curiousbees/types';

// ─── Dashboard Route Map ──────────────────────────────────────────────────────

/**
 * Maps each role to the canonical dashboard route.
 *
 * Note: FACULTY and PHD_SCHOLAR both land on /dashboard — the page itself
 * conditionally renders the correct view based on currentUser.role.
 */
export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  RESEARCH_SUPERVISOR: '/feed',
  RESEARCH_SCHOLAR: '/feed',
  INSTITUTE_ADMIN: '/admin/dashboard',
};

// ─── Core Helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the dashboard route for the given user, considering role and approval status.
 * Unapproved scholars are always directed to /approval-pending.
 * Defaults to '/login' for unauthenticated users.
 */
export function getDashboardRoute(user?: { role: UserRole; approved?: boolean; status?: string }): string {
  if (!user) return '/login';
  if (user.status === 'REJECTED') {
    return '/access-denied';
  }
  if (user.status === 'SUSPENDED') {
    return '/account-suspended';
  }
  if (
    user.status === 'PENDING' ||
    user.status === 'PENDING_SUPERVISOR_APPROVAL' ||
    user.status === 'PENDING_ADMIN_APPROVAL'
  ) {
    return '/approval-pending';
  }
  return DASHBOARD_ROUTES[user.role] ?? '/dashboard';
}

/**
 * Returns the unauthorized page URL, optionally embedding the required role
 * and the path the user attempted to visit (for context-aware messaging).
 */
export function getUnauthorizedUrl(
  requiredRole?: string,
  attemptedPath?: string
): string {
  const params = new URLSearchParams();
  if (requiredRole) params.set('required', requiredRole);
  if (attemptedPath) params.set('from', attemptedPath);
  const qs = params.toString();
  return `/auth/unauthorized${qs ? `?${qs}` : ''}`;
}
