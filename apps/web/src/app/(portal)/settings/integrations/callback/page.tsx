'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function IntegrationsCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleGoogleCallback, handleZoomCallback, addToast } = useStore();

  const [status, setStatus] = useState<'PROCESSING' | 'SUCCESS' | 'ERROR'>('PROCESSING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get('code');
    let provider = searchParams.get('provider');
    const stateParam = searchParams.get('state');
    if (!provider && stateParam) {
      try {
        const decoded = JSON.parse(atob(stateParam));
        if (decoded?.provider) {
          provider = decoded.provider;
        }
      } catch (e) {
        provider = 'GOOGLE_WORKSPACE';
      }
    }
    const error = searchParams.get('error') || searchParams.get('error_description');

    if (error) {
      setStatus('ERROR');
      setErrorMessage(error);
      return;
    }

    if (!code) {
      setStatus('ERROR');
      setErrorMessage('No authorization code was returned by the provider.');
      return;
    }

    const exchange = async () => {
      try {
        const redirectUri = `${window.location.origin}/settings/integrations/callback`;
        
        if (provider === 'ZOOM_WORKPLACE') {
          await handleZoomCallback(code, redirectUri);
          addToast('Your Zoom account has been successfully linked to CuriousBees.', 'success');
        } else {
          await handleGoogleCallback(code, redirectUri);
          addToast('Your Google Workspace account has been successfully linked to CuriousBees.', 'success');
        }

        setStatus('SUCCESS');
        setTimeout(() => {
          router.push('/settings/integrations');
        }, 1500);
      } catch (err: any) {
        setStatus('ERROR');
        setErrorMessage(err.message || 'Failed to exchange authorization tokens.');
      }
    };

    exchange();
  }, [searchParams, handleGoogleCallback, handleZoomCallback, addToast, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="cb-card max-w-md w-full p-8 bg-surface border border-slate-200/80 rounded-2xl shadow-sm text-center space-y-5">
        {status === 'PROCESSING' && (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display font-bold text-lg text-slate-900">Finalizing Authorization</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Establishing secure server-side handshake and storing encrypted tokens...
              </p>
            </div>
          </>
        )}

        {status === 'SUCCESS' && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display font-bold text-lg text-slate-900">Integration Connected</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Redirecting back to your research collaboration settings...
              </p>
            </div>
            <button
              onClick={() => router.push('/settings/integrations')}
              className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline cursor-pointer pt-2"
            >
              <span>Go to Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {status === 'ERROR' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display font-bold text-lg text-slate-900">Connection Failed</h3>
              <p className="text-xs text-red-600 font-medium leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => router.push('/settings/integrations')}
              className="w-full py-2.5 bg-primary text-white rounded-lg text-xs font-medium capitalize hover:bg-primary/95 transition-all cursor-pointer"
            >
              Return to Integrations
            </button>
          </>
        )}
      </div>
    </div>
  );
}
