'use client';

import { useEffect } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console (or locally through our custom stack)
    console.error('Next.js Route Segment Error Captured:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-400 mb-6 animate-pulse">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            An unexpected error occurred while rendering this page view. We have recorded the issue.
          </p>

          {error.message && (
            <div className="w-full text-left bg-slate-950 border border-slate-800/80 rounded-lg p-4 mb-6 font-mono text-xs text-red-400/90 overflow-x-auto max-h-40">
              <span className="font-semibold text-slate-500">Error:</span> {error.message}
              {error.digest && (
                <div className="mt-1">
                  <span className="font-semibold text-slate-500">Digest:</span> {error.digest}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => reset()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/15"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700 transition-all duration-200"
            >
              <Home className="w-4 h-4" />
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
