'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  Video, 
  MessageSquare, 
  Calendar, 
  ArrowLeft,
  Loader2,
  Lock,
  Sparkles,
  Layers,
  Radio
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function IntegrationsSettingsPage() {
  const router = useRouter();
  const { 
    currentUser, 
    integrationConnections, 
    fetchIntegrationStatus, 
    getGoogleAuthUrl, 
    getZoomAuthUrl, 
    disconnectIntegration, 
    addToast 
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<'GOOGLE' | 'ZOOM' | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<'GOOGLE_WORKSPACE' | 'ZOOM_WORKPLACE' | null>(null);

  useEffect(() => {
    fetchIntegrationStatus().finally(() => setLoading(false));
  }, [fetchIntegrationStatus]);

  const googleConn = integrationConnections?.google;
  const zoomConn = integrationConnections?.zoom;

  const handleConnectGoogle = async () => {
    try {
      setConnectingProvider('GOOGLE');
      const callbackUrl = `${window.location.origin}/settings/integrations/callback`;
      const res = await getGoogleAuthUrl(callbackUrl);
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err: any) {
      addToast(err.message || 'Could not initialize Google Workspace authorization.', 'error');
      setConnectingProvider(null);
    }
  };

  const handleConnectZoom = async () => {
    try {
      setConnectingProvider('ZOOM');
      const callbackUrl = `${window.location.origin}/settings/integrations/callback`;
      const res = await getZoomAuthUrl(callbackUrl);
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err: any) {
      addToast(err.message || 'Could not initialize Zoom authorization.', 'error');
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (provider: 'GOOGLE_WORKSPACE' | 'ZOOM_WORKPLACE') => {
    if (!confirm(`Are you sure you want to disconnect ${provider === 'GOOGLE_WORKSPACE' ? 'Google Workspace' : 'Zoom Workplace'}?`)) {
      return;
    }
    try {
      setDisconnectingProvider(provider);
      await disconnectIntegration(provider);
      addToast(`${provider === 'GOOGLE_WORKSPACE' ? 'Google Workspace' : 'Zoom'} has been unlinked. Workspace records remain preserved.`, 'info');
    } catch (err: any) {
      addToast(err.message || 'Failed to disconnect integration.', 'error');
    } finally {
      setDisconnectingProvider(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-left py-4 select-none">
      
      {/* 🔙 BACK & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer mb-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-3">
            <span>Research Collaboration Integrations</span>
            <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold uppercase bg-primary/10 text-primary border border-primary/20">
              Enterprise Hub
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1 max-w-2xl">
            Connect institutional communication tools to Curious Nexus workspaces. CuriousBees remains the system of record while external platforms power your meetings and chat.
          </p>
        </div>
        
        <button
          onClick={() => { setLoading(true); fetchIntegrationStatus().finally(() => setLoading(false)); }}
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-surface hover:bg-slate-50 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : 'text-slate-500'}`} />
          <span>Sync Status</span>
        </button>
      </div>

      {/* 🛡️ PRIVACY & SYSTEM OF RECORD NOTICE */}
      <div className="cb-card p-5 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 border border-primary/15 rounded-xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-slate-900 capitalize font-mono flex items-center gap-2">
            <span>Zero-Retention Architecture</span>
            <span className="text-2xs bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded font-sans font-semibold">Privacy First</span>
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            CuriousBees manages your research milestones, projects, files, and memberships. No chat messages, audio streams, or meeting recordings are ever copied into or stored in CuriousBees databases.
          </p>
        </div>
      </div>

      {/* 🧩 INTEGRATION CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ─── GOOGLE WORKSPACE CARD ─── */}
        <div className="cb-card p-6 bg-surface border border-slate-200/80 rounded-2xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-surface border border-slate-200 flex items-center justify-center shadow-xs p-2.5">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base text-slate-900">Google Workspace</h3>
                    <span className="text-xs font-medium capitalize bg-primary/10 text-primary px-2 py-0.5 rounded">Primary</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Chat Spaces · Meet · Calendar</p>
                </div>
              </div>

              {/* Status Badge */}
              {googleConn?.status === 'CONNECTED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Connected</span>
                </span>
              ) : googleConn?.status === 'EXPIRED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Reauth Required</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                  <Radio className="w-3.5 h-3.5 text-slate-400" />
                  <span>Not Connected</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enables automated creation of dedicated Google Chat research spaces for your Nexus collaborations and scheduled Google Meet conference calls.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                <MessageSquare className="w-3 h-3 text-blue-600" />
                <span>Google Chat Spaces</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                <Video className="w-3 h-3 text-emerald-600" />
                <span>Google Meet</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                <Calendar className="w-3 h-3 text-amber-600" />
                <span>Google Calendar</span>
              </span>
            </div>

            {googleConn?.externalAccountEmail && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Authorized Account</span>
                <span className="font-mono font-bold text-slate-800">{googleConn.externalAccountEmail}</span>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {googleConn?.status === 'CONNECTED' ? (
              <>
                <button
                  onClick={handleConnectGoogle}
                  disabled={connectingProvider === 'GOOGLE'}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  {connectingProvider === 'GOOGLE' ? 'Re-authorizing...' : 'Manage Permissions'}
                </button>
                <button
                  onClick={() => handleDisconnect('GOOGLE_WORKSPACE')}
                  disabled={disconnectingProvider === 'GOOGLE_WORKSPACE'}
                  className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  {disconnectingProvider === 'GOOGLE_WORKSPACE' ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={connectingProvider === 'GOOGLE'}
                className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-xs font-medium capitalize shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {connectingProvider === 'GOOGLE' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting Google...</span>
                  </>
                ) : (
                  <>
                    <span>Connect Google Workspace</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ─── ZOOM WORKPLACE CARD ─── */}
        <div className="cb-card p-6 bg-surface border border-slate-200/80 rounded-2xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-xs p-2.5 text-blue-500">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base text-slate-900">Zoom Workplace</h3>
                    <span className="text-xs font-medium capitalize bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">Secondary</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Zoom Meetings Video Conferencing</p>
                </div>
              </div>

              {/* Status Badge */}
              {zoomConn?.status === 'CONNECTED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Connected</span>
                </span>
              ) : zoomConn?.status === 'EXPIRED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Reauth Required</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                  <Radio className="w-3.5 h-3.5 text-slate-400" />
                  <span>Not Connected</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Provides scheduled Zoom Meetings and direct participant join URLs inside research workspaces for teams preferring Zoom for video discussions.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                <Video className="w-3 h-3 text-blue-500" />
                <span>Zoom Meetings</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Passcode & Host Control</span>
              </span>
            </div>

            {zoomConn?.externalAccountEmail && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Authorized Account</span>
                <span className="font-mono font-bold text-slate-800">{zoomConn.externalAccountEmail}</span>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {zoomConn?.status === 'CONNECTED' ? (
              <>
                <button
                  onClick={handleConnectZoom}
                  disabled={connectingProvider === 'ZOOM'}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  {connectingProvider === 'ZOOM' ? 'Re-authorizing...' : 'Manage Permissions'}
                </button>
                <button
                  onClick={() => handleDisconnect('ZOOM_WORKPLACE')}
                  disabled={disconnectingProvider === 'ZOOM_WORKPLACE'}
                  className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  {disconnectingProvider === 'ZOOM_WORKPLACE' ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectZoom}
                disabled={connectingProvider === 'ZOOM'}
                className="w-full py-2.5 bg-brand hover:bg-brand-strong text-white rounded-lg text-xs font-medium capitalize shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {connectingProvider === 'ZOOM' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting Zoom...</span>
                  </>
                ) : (
                  <>
                    <span>Connect Zoom Workplace</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 🌐 EXTERNAL MEETING FALLBACK NOTE */}
      <div className="cb-card p-5 bg-surface border border-slate-200/80 rounded-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Custom Institutional Meeting Links (Teams / Webex)</h4>
            <p className="text-xs text-slate-500">
              Nexus workspaces also support custom external conference URLs without requiring OAuth.
            </p>
          </div>
        </div>
        <span className="text-2xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-md shrink-0">
          Always Available
        </span>
      </div>

    </div>
  );
}
