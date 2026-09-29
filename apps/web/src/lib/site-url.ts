/**
 * Canonical public origin of the web app (e.g. https://srmcuriousbees.in).
 *
 * Behind CloudFront -> ALB -> Next.js, the Host / X-Forwarded-Host headers seen
 * by the server can be an internal hostname or be supplied by the client, so
 * production redirects must never be built from them. APP_URL (runtime) or
 * NEXT_PUBLIC_SITE_URL (build time) is required in production; only local
 * development falls back to the request's own origin.
 */
export function getPublicOrigin(requestUrl: string): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('[site-url] APP_URL / NEXT_PUBLIC_SITE_URL is not configured; falling back to request origin.');
  }
  return new URL(requestUrl).origin;
}

/** Builds an absolute URL on the public origin for a same-site path. */
export function publicUrl(path: string, requestUrl: string): URL {
  const safePath = path.startsWith('/') && !path.startsWith('//') ? path : '/';
  return new URL(safePath, getPublicOrigin(requestUrl));
}
