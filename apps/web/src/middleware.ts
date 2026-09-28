import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

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
  '/sys-admin-login',
  '/sys-admin',
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
      return NextResponse.redirect(new URL('/feed', request.url));
    }

    // 3. If public path, allow through with refreshed session cookies
    if (isPublicPath(pathname)) {
      return supabaseResponse;
    }

    // 4. Protected Route: Require authenticated Supabase user
    if (!user) {
      console.log(`[MIDDLEWARE] Unauthenticated access to ${pathname}. Redirecting to /login`);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 5. Enforce allowed domain restriction
    const email = user.email?.toLowerCase().trim() || '';
    const allowedDomains = (
      process.env.ALLOWED_EMAIL_DOMAINS ||
      process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS ||
      'gmail.com'
    )
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    const isAllowedDomain = allowedDomains.some((domain) => email.endsWith('@' + domain));

    if (!isAllowedDomain) {
      console.warn(`[MIDDLEWARE SECURITY] Blocking non-allowed email: ${email}`);
      return NextResponse.redirect(new URL('/access-denied', request.url));
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
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png|logo.png|logo_icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
