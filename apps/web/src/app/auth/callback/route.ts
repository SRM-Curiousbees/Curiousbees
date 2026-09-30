import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publicUrl } from '@/lib/site-url';
import { isEmailDomainAllowed } from '@/lib/auth/email-domains';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') || searchParams.get('redirectTo') || '/dashboard';

  // Prevent open redirect attacks: ensure next is a relative path
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/dashboard';
  }

  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as any;

  if (code || (token_hash && type)) {
    const supabase = await createClient();
    let authUser: any = null;
    let authError: any = null;

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      authUser = data?.user;
      authError = error;
    } else if (token_hash && type) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
      authUser = data?.user;
      authError = error;
    }

    if (!authError && authUser) {
      // Early UX check only; the API enforces the domain policy and account provisioning.
      if (!isEmailDomainAllowed(authUser.email)) {
        console.warn('[AUTH CALLBACK] Email domain not allowed. Signing out.');
        await supabase.auth.signOut();
        return NextResponse.redirect(publicUrl('/access-denied', request.url));
      }

      // Always redirect on the configured public origin, never on Host/X-Forwarded-Host.
      return NextResponse.redirect(publicUrl(next, request.url));
    }

    console.error('[AUTH CALLBACK] Error exchanging credentials for session:', authError?.message);
  }

  // If code exchange failed or was missing, return to login with error
  return NextResponse.redirect(publicUrl('/login?error=auth_callback_failed', request.url));
}
