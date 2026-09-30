import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { publicUrl } from '@/lib/site-url';
import { isEmailDomainAllowed } from '@/lib/auth/email-domains';

// 1. Define Public Routes
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/sign-in',
  '/sign-up',
  '/auth/callback',
  '/auth/denied',
  '/about',
  '/research',
  '/education',
  '/institution',
  '/contact',
  '/features',
  '/privacy-policy',
  '/terms-of-service',
  '/ethics-framework',
  '/approval-pending',
  '/awaiting-supervisor-approval',
  '/account-rejected',
  '/access-denied',
  '/account-suspended',
  '/not-provisioned',
  '/sso-callback',
  '/error',
];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Explicit early-return for static assets, public images, and internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/healthz' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.png' ||
    pathname === '/apple-touch-icon.png' ||
    pathname === '/logo.png' ||
    pathname === '/logo_icon.png' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  try {
    // 1. Refresh Supabase session and get authenticated user
    const { supabaseResponse, user } = await updateSession(request);

    // 2. If authenticated user visits login/sign-in pages, redirect to /feed
    if (user && (pathname === '/login' || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
      return NextResponse.redirect(publicUrl('/feed', request.url));
    }

    // 3. If public path, allow through with refreshed session cookies
    if (isPublicPath(pathname)) {
      return supabaseResponse;
    }

    // 4. Protected Route: Require authenticated Supabase user
    if (!user) {
      console.log(`[MIDDLEWARE] Unauthenticated access to ${pathname}. Redirecting to /login`);
      const loginUrl = publicUrl('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 5. Early domain check for UX. The API is authoritative (domain policy + admin-provisioned account).
    if (!isEmailDomainAllowed(user.email)) {
      console.warn('[MIDDLEWARE SECURITY] Blocking non-allowed email domain.');
      return NextResponse.redirect(publicUrl('/access-denied', request.url));
    }

    return supabaseResponse;
  } catch (error: any) {
    // Next.js Redirect errors should not be swallowed
    if (error && error.message && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }

    console.error(`[MIDDLEWARE EXCEPTION] Path: ${pathname}`, error);
    return NextResponse.next();
  }
}

// Match all application paths except Next.js internals, API routes, and static assets
export const config = {
  // Node.js runtime: reads server-only configuration (APP_URL, ALLOWED_EMAIL_DOMAINS) at runtime.
  runtime: 'nodejs',
  matcher: [
    '/((?!api|healthz|robots.txt|sitemap.xml|_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png|logo.png|logo_icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
