import { ForbiddenException } from '@nestjs/common';

/**
 * Sign-in domain policy.
 *
 * The allowed domains come only from ALLOWED_EMAIL_DOMAINS (comma separated,
 * e.g. "srmist.edu.in,gmail.com"). There is deliberately no built-in default:
 * production refuses to boot without it (see env.validation.ts), and an empty
 * list here denies everyone rather than silently allowing a public provider.
 *
 * A matching domain only makes an address *eligible*. Access still requires an
 * admin-provisioned, active User record — see SupabaseAuthGuard.
 */
export function getAllowedEmailDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

export const ROOT_ADMIN_EMAIL = 'srmcuriousbees@gmail.com';

export function isEmailDomainAllowed(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (normalized === ROOT_ADMIN_EMAIL) return true;
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) return false;
  const domain = normalized.slice(at + 1);
  return getAllowedEmailDomains().includes(domain);
}

export function assertEmailDomainAllowed(email: string): void {
  if (!isEmailDomainAllowed(email)) {
    throw new ForbiddenException({
      message: `Email ${normalizeEmail(email)} is not in an allowed sign-in domain.`,
      code: 'EMAIL_DOMAIN_NOT_ALLOWED',
    });
  }
}
