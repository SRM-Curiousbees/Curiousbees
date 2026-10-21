import { ExecutionContext } from '@nestjs/common';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { createHash } from 'crypto';

/**
 * Rate limits. See docs/operations/rate-limiting.md.
 *
 * Signed-in traffic is limited per session (a hash of the bearer token), so
 * many people behind one shared campus IP don't share one budget. Requests
 * without a token are limited per client IP. A per-IP total across all
 * endpoints is a secondary safeguard against a single source flooding the API
 * (for example with made-up tokens, each of which costs a Supabase call).
 *
 * Counters are in memory, per API instance. Every number can be overridden by
 * the environment variable of the same name, read on each request.
 */
export const RATE_LIMIT_DEFAULTS = {
  /** Length of the counting window. */
  RATE_LIMIT_WINDOW_SECONDS: 60,
  /** Reads (GET/HEAD/OPTIONS) per signed-in session, per endpoint. */
  RATE_LIMIT_USER_READ: 300,
  /** Writes (POST/PUT/PATCH/DELETE) per signed-in session, per endpoint. */
  RATE_LIMIT_USER_WRITE: 60,
  /** Requests without a bearer token, per client IP, per endpoint. */
  RATE_LIMIT_ANONYMOUS: 120,
  /** Searches per signed-in session. */
  RATE_LIMIT_SEARCH: 60,
  /** Every request from one client IP, across all endpoints. Size it for the largest shared network. */
  RATE_LIMIT_IP_TOTAL: 6000,
} as const;

export type RateLimitName = keyof typeof RATE_LIMIT_DEFAULTS;

export function rateLimit(name: RateLimitName, env: NodeJS.ProcessEnv = process.env): number {
  const raw = env[name];
  const value = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
  return Number.isInteger(value) && value > 0 ? value : RATE_LIMIT_DEFAULTS[name];
}

const windowMs = () => rateLimit('RATE_LIMIT_WINDOW_SECONDS') * 1000;

const BEARER = /^Bearer\s+(\S+)$/i;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function bearerToken(req: Record<string, any>): string | null {
  const header = req.headers?.authorization;
  const match = typeof header === 'string' ? BEARER.exec(header) : null;
  return match ? match[1] : null;
}

const requestOf = (context: ExecutionContext) => context.switchToHttp().getRequest();

/**
 * One bucket per signed-in session, keyed by a hash of the token (never the
 * token itself). An unverified `sub` claim would let anyone exhaust someone
 * else's budget; a token hash requires holding the token. Requests without a
 * token fall back to the client IP (`req.ip`, which honours TRUST_PROXY_HOPS).
 */
export function sessionTracker(req: Record<string, any>): string {
  const token = bearerToken(req);
  return token ? `session:${createHash('sha256').update(token).digest('hex').slice(0, 32)}` : `ip:${req.ip}`;
}

export function ipTracker(req: Record<string, any>): string {
  return `ip:${req.ip}`;
}

/** Limit for the per-session/per-IP, per-endpoint throttler. */
export function requestLimit(context: ExecutionContext): number {
  const req = requestOf(context);
  if (!bearerToken(req)) return rateLimit('RATE_LIMIT_ANONYMOUS');
  return WRITE_METHODS.has(String(req.method).toUpperCase()) ? rateLimit('RATE_LIMIT_USER_WRITE') : rateLimit('RATE_LIMIT_USER_READ');
}

/** For @Throttle on search endpoints: `@Throttle({ default: SEARCH_THROTTLE })`. */
export const SEARCH_THROTTLE = {
  limit: (context: ExecutionContext) => (bearerToken(requestOf(context)) ? rateLimit('RATE_LIMIT_SEARCH') : rateLimit('RATE_LIMIT_ANONYMOUS')),
  ttl: windowMs,
};

export function throttlerOptions(): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        // Kept as "default" so existing @Throttle({ default: ... }) overrides still apply.
        name: 'default',
        limit: requestLimit,
        ttl: windowMs,
        getTracker: sessionTracker,
      },
      {
        name: 'ip',
        limit: () => rateLimit('RATE_LIMIT_IP_TOTAL'),
        ttl: windowMs,
        getTracker: ipTracker,
        // One counter per IP across all endpoints (the default key is per endpoint).
        generateKey: (_context, tracker, name) => createHash('sha256').update(`${name}-${tracker}`).digest('hex'),
      },
    ],
  };
}
