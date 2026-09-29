/**
 * Sign-in domain allow-list used for early UX feedback in the web tier.
 *
 * The API (SupabaseAuthGuard) is the authority: it enforces
 * ALLOWED_EMAIL_DOMAINS and requires an admin-provisioned account. This helper
 * only mirrors the same configuration so users get a clear "access denied"
 * page sooner. There is no built-in default domain; when nothing is
 * configured the web tier defers entirely to the API.
 */
export function getAllowedEmailDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS || process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

export const ROOT_ADMIN_EMAIL = 'srmcuriousbees@gmail.com';

export function isEmailDomainAllowed(email: string | null | undefined): boolean {
  const normalized = (email || '').trim().toLowerCase();
  if (normalized === ROOT_ADMIN_EMAIL) return true;
  const domains = getAllowedEmailDomains();
  if (domains.length === 0) return true;
  const at = normalized.lastIndexOf('@');
  return at > 0 && domains.includes(normalized.slice(at + 1));
}
