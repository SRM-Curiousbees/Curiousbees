import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env file absolutely
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Build-time configuration.
 *
 * PUBLIC (NEXT_PUBLIC_*): inlined into the browser bundle at `next build`.
 *   Must be supplied as Docker build args. Never put secrets here.
 * SERVER-ONLY (APP_URL, ALLOWED_EMAIL_DOMAINS, ...): read at runtime by the
 *   Node.js server/middleware from the container environment; never inlined.
 */
// Next.js sets NEXT_PHASE while running `next build` (not for dev, lint or start).
const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';

if (!process.env.NEXT_PUBLIC_SITE_URL && process.env.VERCEL_URL) {
  process.env.NEXT_PUBLIC_SITE_URL = `https://${process.env.VERCEL_URL}`;
}

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url('NEXT_PUBLIC_API_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_SITE_URL: isProductionBuild
    ? z.string().url('NEXT_PUBLIC_SITE_URL (canonical public origin) is required for production builds')
    : z.string().url().optional(),
});

// Run validation at config load time (startup/build)
const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('\n❌ Frontend environment validation failed:');
  result.error.errors.forEach((err) => {
    console.error(`  - [${err.path.join('.') || 'Global'}]: ${err.message}`);
  });
  console.error('');
  process.exit(1);
}

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
];

const nextConfig = {
  // Optional: a second local dev server (e.g. UI testing) can build into its own
  // directory instead of sharing .next with the main dev server.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  poweredByHeader: false,
  transpilePackages: [
    "@curiousbees/constants",
    "@curiousbees/types",
    "@curiousbees/shared-utils",
    "@curiousbees/ui"
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return [
      // The legacy client-side PIN console was retired; administration lives in /admin.
      { source: '/sys-admin-login', destination: '/admin/dashboard', permanent: false },
      { source: '/sys-admin', destination: '/admin/dashboard', permanent: false },
      { source: '/sys-admin/:path*', destination: '/admin/dashboard', permanent: false },
      // /scholar/* were aliases of the main portal pages; keep old links working.
      { source: '/scholar/workspaces/:id', destination: '/workspace/:id', permanent: true },
      { source: '/scholar/workspaces', destination: '/workspace', permanent: true },
      { source: '/scholar/chat', destination: '/nexus', permanent: true },
      { source: '/scholar/my-research', destination: '/my-research', permanent: true },
      { source: '/scholar/profile', destination: '/profile', permanent: true },
      { source: '/scholar/settings', destination: '/settings', permanent: true },
      { source: '/scholar/events', destination: '/events', permanent: true },
      { source: '/scholar/opportunities', destination: '/opportunities', permanent: true },
      { source: '/scholar/connections', destination: '/researchers', permanent: true },
      { source: '/scholar/help', destination: '/help', permanent: true },
      // Admin aliases that rendered another admin page under a second name.
      { source: '/admin/directory', destination: '/admin/users', permanent: true },
      { source: '/admin/compliance', destination: '/admin/research-activity', permanent: true },
      { source: '/admin/publication-moderation', destination: '/admin/publications', permanent: true },
      { source: '/admin/notifications', destination: '/admin/email-delivery', permanent: true },
      { source: '/admin/security', destination: '/admin/audit', permanent: true },
      { source: '/admin/supervisors', destination: '/admin/users?tab=SUPERVISORS', permanent: true },
      // The old features page described capabilities that don't exist; the landing page covers the real ones.
      { source: '/features', destination: '/#platform', permanent: true },
      // Connected apps live in a Settings tab; the separate page duplicated it.
      { source: '/settings/integrations', destination: '/settings?tab=integrations', permanent: true },
      // The standalone composer was replaced by the one at the top of the feed.
      { source: '/feed/create', destination: '/feed?compose=1', permanent: true },
      {
        source: '/sign-in',
        destination: '/login',
        permanent: true,
      },
      {
        source: '/sign-up',
        destination: '/login',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;