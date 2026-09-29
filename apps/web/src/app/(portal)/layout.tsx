'use client';

import Sidebar from '@/components/dashboard/Sidebar';
import Navbar from '@/components/dashboard/Navbar';
import { useStore } from '@/store/useStore';
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ToastContainer } from '@/components/Toast';
import { PushNotificationPrompt } from '@/components/shared/PushNotificationPrompt';
import { AlertTriangle } from 'lucide-react';
import { isRouteAllowedForRole } from '@/lib/auth/permissions';
import PortalLoading from './loading';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, setCurrentUser, fetchData, setTheme, syncUserSession } = useStore();
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [isAuthVerifying, setIsAuthVerifying] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const hasInitialized = useRef(false);

  const showLoader = isAuthVerifying || !currentUser || !isRouteAllowedForRole(currentUser.role, pathname);

  // Tell people it's still working if loading takes longer than usual.
  useEffect(() => {
    if (!showLoader) {
      setIsSlow(false);
      return;
    }
    const timer = setTimeout(() => setIsSlow(true), 5000);
    return () => clearTimeout(timer);
  }, [showLoader]);

  // Sync local storage theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = (localStorage.getItem('curiousbees-theme') as 'dark' | 'light') || 'light';
      setTheme(savedTheme);
    }
  }, [setTheme]);

  // Set timeout safety for auth loading screen
  useEffect(() => {
    if (isAuthVerifying) {
      const timer = setTimeout(() => {
        console.warn('[PortalLayout] Auth initialization is taking longer than 15 seconds.');
        setAuthTimedOut(true);
      }, 15000);
      return () => clearTimeout(timer);
    } else {
      setAuthTimedOut(false);
    }
  }, [isAuthVerifying]);

  // 1. Initial auth sync (only runs once on mount)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initAuth = async () => {
      console.info('[PortalLayout] Running initAuth (mount)...');
      let activeUser = useStore.getState().currentUser;
      if (!activeUser) {
        console.info('[PortalLayout] No active currentUser cached. Invoking syncUserSession()...');
        activeUser = await syncUserSession();
      } else {
        console.info('[PortalLayout] Using cached currentUser:', activeUser.email);
      }

      setIsAuthVerifying(false);
      if (activeUser) {
        console.info('[PortalLayout] Initial sync complete. Triggering data fetch.');
        const skipThreads = window.location.pathname.includes('/feed');
        fetchData(skipThreads);
      }
    };

    initAuth();
  }, [syncUserSession, fetchData]);

  // 2. Reactive user authorization & route checks
  useEffect(() => {
    if (isAuthVerifying) return;

    const activeUser = useStore.getState().currentUser;

    if (!activeUser) {
      if (useStore.getState().notProvisioned) {
        console.warn('[PortalLayout] Account not provisioned. Redirecting to /not-provisioned.');
        router.push('/not-provisioned');
        return;
      }
      if (useStore.getState().isSuspended) {
        console.warn('[PortalLayout] Account suspended. Redirecting to /account-suspended.');
        router.push('/account-suspended');
        return;
      }
      console.warn('[PortalLayout] Unauthenticated access detected. Redirecting to /login.');
      router.push('/login');
      return;
    }

    if (!activeUser.onboardingCompleted) {
      console.warn('[PortalLayout] User has not completed onboarding. Redirecting to /onboarding.');
      router.push('/onboarding');
      return;
    }

    if (activeUser.status === 'SUSPENDED' || activeUser.suspended) {
      console.warn('[PortalLayout] User account was suspended. Redirecting to /account-suspended.');
      router.push('/account-suspended');
      return;
    }

    if (activeUser.status === 'REJECTED') {
      console.warn('[PortalLayout] User account was rejected. Redirecting to /verification-pending.');
      router.push('/verification-pending');
      return;
    }

    if (
      activeUser.status === 'PENDING' ||
      activeUser.status === 'PENDING_SUPERVISOR_APPROVAL'
    ) {
      console.warn('[PortalLayout] User is pending supervisor approval. Redirecting to /verification-pending.');
      router.push('/verification-pending');
      return;
    }

    if (activeUser.role === 'RESEARCH_SCHOLAR' && (!activeUser.approved || !activeUser.supervisorId)) {
      console.warn('[PortalLayout] Scholar is awaiting supervisor approval or assignment. Redirecting to /verification-pending.');
      router.push('/verification-pending');
      return;
    }

    // Role-based path authorization check
    if (!isRouteAllowedForRole(activeUser.role, pathname)) {
      // Admins who land on a research page (e.g. the post-sign-in default /feed)
      // go to their own dashboard; anything else is a genuine unauthorized visit.
      if (activeUser.role === 'INSTITUTE_ADMIN' && !pathname.startsWith('/admin')) {
        router.replace('/admin/dashboard');
        return;
      }
      console.warn(`[PortalLayout] Access unauthorized for role ${activeUser.role} on path ${pathname}`);
      router.push('/unauthorized');
      return;
    }
  }, [isAuthVerifying, currentUser, pathname, router]);

  // Never render a page the role may not use, even for the moment before the redirect.
  if (showLoader) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
        {authTimedOut ? (
          <div role="alert" className="w-full max-w-sm text-center">
            <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl border border-warning-200 bg-warning-50 text-warning-700">
              <AlertTriangle className="size-5" aria-hidden />
            </div>
            <h1 className="text-base font-semibold text-ink">We couldn&apos;t confirm your session</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Signing in is taking longer than usual. Check your connection and try again.
            </p>
            <Button
              className="mt-5 w-full"
              onClick={() => {
                setAuthTimedOut(false);
                syncUserSession({ force: true });
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5" role="status" aria-live="polite">
            <span className="cb-breathe">
              <Logo size={44} />
            </span>
            <div className="cb-progress w-44" aria-hidden />
            <p className="text-sm text-ink-muted">
              {isSlow ? 'Still connecting. This can take a moment on a slow network…' : 'Loading your workspace…'}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-toast focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>
      <Suspense fallback={<div className="hidden w-sidebar shrink-0 lg:block" />}>
        <Sidebar />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-header border-b border-line bg-surface" />}>
          <Navbar />
        </Suspense>
        <main id="main-content" className="mx-auto w-full max-w-content flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<PortalLoading />}>{children}</Suspense>
        </main>
      </div>
      <PushNotificationPrompt />
      <ToastContainer />
    </div>
  );
}
