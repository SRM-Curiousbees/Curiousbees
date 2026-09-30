import type { MetadataRoute } from 'next';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** Only the public site is indexable; the signed-in product never is. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/api/',
          '/admin',
          '/feed',
          '/my-research',
          '/my-scholars',
          '/scholar',
          '/supervisor',
          '/researchers',
          '/profile',
          '/publications',
          '/events',
          '/opportunities',
          '/nexus',
          '/workspace',
          '/chat',
          '/notifications',
          '/settings',
          '/onboarding',
          '/verification-pending',
          '/auth',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
