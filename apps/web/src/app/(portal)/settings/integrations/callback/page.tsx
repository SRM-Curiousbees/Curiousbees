'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';

const SETTINGS_HREF = '/settings?tab=integrations';

/**
 * Google and Zoom send people back here after they approve access. The code is
 * exchanged by the API; tokens never reach the browser.
 */
export default function IntegrationsCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleGoogleCallback, handleZoomCallback, addToast } = useStore();

  const [status, setStatus] = useState<'working' | 'done' | 'failed'>('working');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [providerName, setProviderName] = useState('your account');
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get('code');
    let provider = searchParams.get('provider');
    const stateParam = searchParams.get('state');
    if (!provider && stateParam) {
      try {
        provider = JSON.parse(atob(stateParam))?.provider || null;
      } catch {
        provider = null;
      }
    }
    const isZoom = provider === 'ZOOM_WORKPLACE';
    setProviderName(isZoom ? 'Zoom' : 'Google Workspace');

    const error = searchParams.get('error_description') || searchParams.get('error');
    if (error) {
      setStatus('failed');
      setErrorMessage(error === 'access_denied' ? 'Access was not granted, so nothing was connected.' : error);
      return;
    }
    if (!code) {
      setStatus('failed');
      setErrorMessage('The provider didn’t return an authorization code. Start the connection again from Settings.');
      return;
    }

    (async () => {
      try {
        const redirectUri = `${window.location.origin}/settings/integrations/callback`;
        if (isZoom) await handleZoomCallback(code, redirectUri);
        else await handleGoogleCallback(code, redirectUri);
        addToast(`${isZoom ? 'Zoom' : 'Google Workspace'} connected.`, 'success');
        setStatus('done');
        setTimeout(() => router.replace(SETTINGS_HREF), 1200);
      } catch (err: any) {
        setStatus('failed');
        setErrorMessage(err?.message || 'The connection could not be completed.');
      }
    })();
  }, [searchParams, handleGoogleCallback, handleZoomCallback, addToast, router]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center">
      <Card className="w-full p-8 text-center" role="status" aria-live="polite">
        {status === 'working' && (
          <>
            <Loader2 className="mx-auto size-8 animate-spin text-brand" aria-hidden />
            <h1 className="mt-4 text-lg font-semibold text-ink">Connecting {providerName}</h1>
            <p className="mt-1 text-sm text-ink-muted">This takes a few seconds.</p>
          </>
        )}
        {status === 'done' && (
          <>
            <CheckCircle2 className="mx-auto size-8 text-success-600" aria-hidden />
            <h1 className="mt-4 text-lg font-semibold text-ink">{providerName} connected</h1>
            <p className="mt-1 text-sm text-ink-muted">Taking you back to Settings…</p>
            <Link href={SETTINGS_HREF} className={buttonVariants({ variant: 'secondary', className: 'mt-5' })}>
              Go to Settings
            </Link>
          </>
        )}
        {status === 'failed' && (
          <>
            <AlertTriangle className="mx-auto size-8 text-danger-600" aria-hidden />
            <h1 className="mt-4 text-lg font-semibold text-ink">{providerName} wasn’t connected</h1>
            <p className="mt-1 text-sm text-ink-secondary">{errorMessage}</p>
            <Link href={SETTINGS_HREF} className={buttonVariants({ className: 'mt-5' })}>
              Back to Connected apps
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
