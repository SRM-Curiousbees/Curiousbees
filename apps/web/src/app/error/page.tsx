'use client';

import { AlertCircle, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-red-800/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="w-full max-w-md relative z-10 text-center">
        <div className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-3">Service Unavailable</h1>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            We are experiencing technical difficulties validating your session or accessing critical configuration. Please check your connection or try again later.
          </p>
          <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-left">
            <p className="text-xs text-red-300/80 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
              ERR_MIDDLEWARE_INVOCATION_FAILED
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/" className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-red-600/20">
            <Home className="w-4 h-4" />
            Return to Homepage
          </Link>
          <Link href="/login" className="w-full py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
