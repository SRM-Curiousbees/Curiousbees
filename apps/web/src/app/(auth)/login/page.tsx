'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Loader2,
  GraduationCap,
  Users,
  ShieldCheck,
  Quote,
  Sparkles,
  Shield
} from 'lucide-react';
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
      ? 'Authentication callback failed. Please try signing in again.'
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
      setErrorMessage(err?.message || 'Google authentication could not be initiated.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden bg-[#03132B] selection:bg-amber-400 selection:text-blue-950 font-sans">
      
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#0C4DA2]/20 rounded-full blur-[150px]" />
        <div className="absolute -bottom-40 -right-40 w-[650px] h-[650px] bg-[#FFC828]/10 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-[1140px] relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full rounded-[32px] overflow-hidden bg-white shadow-[0_30px_90px_rgba(0,0,0,0.55)] border border-white/10 flex flex-col lg:flex-row min-h-[660px]"
        >
          
          {/* =========================================================================
              LEFT PANEL — INSTITUTIONAL RESEARCH SHOWCASE
             ========================================================================= */}
          <div className="w-full lg:w-[58%] p-8 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden text-white bg-[#051838]">
            
            {/* Background University Campus Architectural Image with Gradient Overlay */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-105 pointer-events-none"
              style={{ backgroundImage: `url('/srm_campus_bg.jpg')` }}
            />
            {/* Multi-stop dark navy gradient overlay to keep text hyper-legible */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#03132B] via-[#051B3B]/95 to-[#062046]/85 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020B1A] via-transparent to-[#03132B]/80 pointer-events-none" />

            {/* TOP HEADER: Brand Logo */}
            <div className="relative z-10 flex items-center justify-between">
              <Logo size={44} showText={true} variant="light" />
            </div>

            {/* MIDDLE CONTENT: Headline, Subtitle, 4 Pillars, Quote */}
            <div className="relative z-10 my-8 space-y-6 text-left">
              
              {/* Main Headline */}
              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-display font-extrabold text-white leading-[1.18] tracking-tight">
                  A Unified Research <br />
                  Ecosystem for <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">
                    SRMIST Researchers
                  </span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-lg">
                  Connecting doctoral scholars, research supervisors, and institutional leadership to collaborate, innovate, and create impact.
                </p>
              </div>

              {/* 4 Feature Pillars Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                
                {/* Pillar 1 */}
                <div className="flex flex-col items-center text-center p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300 mb-2 shadow-xs">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 leading-tight">
                    Research <br />Collaboration
                  </span>
                </div>

                {/* Pillar 2 */}
                <div className="flex flex-col items-center text-center p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300 mb-2 shadow-xs">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 leading-tight">
                    Supervisor <br />Connect
                  </span>
                </div>

                {/* Pillar 3 */}
                <div className="flex flex-col items-center text-center p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300 mb-2 shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 leading-tight">
                    Research <br />Analytics
                  </span>
                </div>

                {/* Pillar 4 */}
                <div className="flex flex-col items-center text-center p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300 mb-2 shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 leading-tight">
                    Institutional <br />Governance
                  </span>
                </div>

              </div>

              {/* Research Quote Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md flex items-start gap-3.5 shadow-inner">
                <Quote className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-slate-200 italic font-medium leading-relaxed">
                    &ldquo;Research is to see what everybody else has seen, and to think what nobody else has thought.&rdquo;
                  </p>
                  <p className="text-[11px] font-bold text-amber-400">
                    — Albert Szent-Györgyi
                  </p>
                </div>
              </div>

            </div>

            {/* BOTTOM FOOTER: SRM Brand Identity */}
            <div className="relative z-10 pt-5 border-t border-white/10 flex items-center justify-start gap-5 sm:gap-6">
              {/* SRM Institutional Emblem & Name */}
              <div className="shrink-0">
                <SRMLogo variant="full" theme="light" size={52} />
              </div>

              <div className="h-10 w-px bg-white/20 hidden sm:block shrink-0" />

              <p className="text-xs sm:text-[13px] font-semibold text-slate-200 text-left leading-snug tracking-wide hidden sm:block">
                <span className="text-white font-bold">Driving Research Excellence</span>
                <span className="block text-slate-300 font-medium mt-0.5">Across SRMIST</span>
              </p>
            </div>

          </div>

          {/* =========================================================================
              RIGHT PANEL — AUTHENTICATION CARD
             ========================================================================= */}
          <div className="w-full lg:w-[42%] p-8 sm:p-10 lg:p-12 flex flex-col justify-between bg-white dark:bg-[#0B1728] text-slate-900 dark:text-[#F5F7FA]">
            
            <div className="my-auto flex flex-col justify-center w-full max-w-sm mx-auto space-y-6">
              
              {/* Center Top Shield Icon */}
              <div className="flex justify-center">
                <div className="w-13 h-13 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="text-center space-y-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#0C4DA2] dark:text-[#3B82F6] block">
                  WELCOME BACK
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight">
                  Sign in to CuriousBees
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A7B3C5] font-medium leading-relaxed max-w-xs mx-auto">
                  Use your Google account to access your research workspace securely.
                </p>
              </div>

              {/* Error Callout */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-2xl p-3.5 text-left text-xs font-semibold text-rose-800 dark:text-rose-300"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p>{errorMessage}</p>
                </motion.div>
              )}

              {/* Primary Google OAuth Button */}
              <div className="pt-1">
                <motion.button
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-13 sm:h-14 px-5 rounded-2xl bg-white dark:bg-[#101D30] border border-slate-200 dark:border-white/[0.12] text-slate-800 dark:text-[#F5F7FA] hover:bg-slate-50/80 dark:hover:bg-[#172942] hover:border-slate-300 dark:hover:border-white/[0.20] disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm font-bold flex items-center justify-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2.5 text-[#0C4DA2] dark:text-[#3B82F6]">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-xs font-extrabold uppercase tracking-wider">Connecting...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </motion.button>
              </div>

            </div>

            {/* BOTTOM FOOTER */}
            <div className="text-center pt-6 text-[10px] text-slate-400 dark:text-[#718096] font-extrabold tracking-widest uppercase flex items-center justify-center gap-1.5 border-t border-slate-100 dark:border-white/[0.08]">
              <Shield className="w-3.5 h-3.5 text-slate-400 dark:text-[#718096]" />
              <span>SRMIST INSTITUTIONAL SSO</span>
            </div>

          </div>

        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#03132B]">
        <div className="w-10 h-10 border-4 border-[#0C4DA2] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
