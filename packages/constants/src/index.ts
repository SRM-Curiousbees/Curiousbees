/**
 * Shared auth constants used across middleware, store, and helpers.
 * Isolates the cookie name from the middleware module to avoid import cycles.
 */

/** Cookie name used to persist the user's role for edge middleware reads */
export const ROLE_COOKIE_NAME = 'cb-role';

/** Maximum active scholars a Research Supervisor can guide */
export const MAX_SCHOLARS_PER_SUPERVISOR = 6;

/** Permanent Root Administrator email for CuriousBees platform */
export const ROOT_ADMIN_EMAIL = 'srmcuriousbees@gmail.com';

