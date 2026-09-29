/**
 * lib/auth/role-mapping.ts
 *
 * Human-readable role labels. Roles themselves always come from the API
 * (GET /api/auth/me); the frontend never derives a role from an email.
 */

// ─── Role Labels (human-readable) ────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  INSTITUTE_ADMIN: 'Institute Admin',
  RESEARCH_SUPERVISOR: 'Research Supervisor',
  RESEARCH_SCHOLAR: 'Research Scholar',
};
