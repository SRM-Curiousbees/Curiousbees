'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import Logo from '@/components/Logo';
import SRMLogo from '@/components/SRMLogo';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectTo') || '/feed';
  const queryError = searchParams?.get('error');

  const { syncUserSession, signInWithGoogle } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    queryError === 'auth_callback_failed'
      ? 'Sign-in didn\'t complete. Please try again.'
      : ''
  );

  useEffect(() => {
    // Check if session is already active
    syncUserSession({ throwOnError: false }).then((user) => {
      if (user) {
        router.push(redirectTo);
      }
    });
  }, [router, redirectTo, syncUserSession]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await signInWithGoogle(redirectTo);
    } catch (err: any) {
      console.error('[LOGIN] Google Sign-In Error:', err);
      setErrorMessage(err?.message || 'We couldn\'t reach Google. Check your connection and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12 theme-static">
        <div aria-hidden className="honeycomb-bg pointer-events-none absolute inset-0 opacity-[0.35] invert" />
        <Link href="/" className="relative w-fit rounded-lg" aria-label="CuriousBees home">
          <Logo size={36} showText variant="light" />
        </Link>
        <div className="relative max-w-md">
          <p className="font-serif text-4xl font-semibold leading-[1.15] tracking-tight">
            Research at SRMIST, <em className="font-normal italic text-warning-300">in one place.</em>
          </p>
          <p className="mt-4 text-base leading-relaxed text-white/75">
            Supervision, shared workspaces and research discovery for doctoral scholars, supervisors and research leadership.
          </p>
        </div>
        <div className="relative flex items-center gap-4 border-t border-white/15 pt-6">
          <SRMLogo variant="full" theme="light" size={44} />
          <p className="text-sm text-white/70">SRM Institute of Science and Technology</p>
        </div>
      </aside>

      {/* Sign-in panel */}
      <main id="main-content" className="flex flex-col px-6 py-10 sm:px-10">
        <Link href="/" className="w-fit rounded-lg lg:hidden" aria-label="CuriousBees home">
          <Logo size={32} showText />
        </Link>

        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Sign in to CuriousBees</h1>
          <p className="mt-2 text-[15px] text-ink-secondary">
            Continue with the Google account for the email address your institution registered.
          </p>

          {errorMessage && (
            <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-xl border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{errorMessage}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            aria-busy={isLoading}
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-line-strong bg-surface px-5 text-[15px] font-medium text-ink shadow-xs transition-[background-color,border-color,box-shadow] duration-fast hover:border-neutral-400 hover:bg-surface-muted hover:shadow-sm active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-5 animate-spin text-ink-muted" aria-hidden />
                Redirecting to Google…
              </>
            ) : (
              <>
                {/* Google "G" mark, as required by Google's sign-in branding guidelines */}
                <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="mt-8 rounded-xl border border-line bg-surface-muted p-4 text-sm text-ink-secondary">
            <p className="font-medium text-ink">Don&apos;t have access yet?</p>
            <p className="mt-1">
              Accounts are created by your department or the research office.{' '}
              <Link href="/contact" className="font-medium text-brand hover:underline">Request access</Link>
            </p>
          </div>
        </div>

        <p className="mx-auto flex items-center gap-1.5 text-xs text-ink-muted">
          <ShieldCheck className="size-3.5" aria-hidden />
          Only accounts added by SRMIST can sign in.
        </p>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-surface" />}>
      <LoginContent />
    </Suspense>
  );
}
