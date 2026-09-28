'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { ShieldX, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AccessDeniedPage() {
  const { logout } = useStore();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#e6e6fa] text-center">
      {/* Background gradients and mesh blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 honeycomb-bg opacity-[0.25] mix-blend-multiply" />
        <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-[#0C4DA2]/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-lg relative z-10 flex flex-col items-center">
        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white/85 backdrop-blur-xl border border-white/50 rounded-[32px] p-8 md:p-12 w-full shadow-2xl relative overflow-hidden"
        >
          {/* Top Gradient Banner */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 to-[#0C4DA2]" />

          {/* Icon */}
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-red-500/10 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }} />
            <div className="relative w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 shadow-md">
              <ShieldX className="w-8 h-8 text-red-500" />
            </div>
          </div>

          {/* Text Content */}
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900 mb-3 tracking-tight">
            Access Denied
          </h1>
          <p className="text-sm text-slate-600 mb-8 font-sans font-medium leading-relaxed max-w-[90%] mx-auto">
            CuriousBees is restricted to authorized accounts. Please sign in using an authorized email address.
          </p>

          {/* Sign Out Button */}
          <button
            onClick={() => logout()}
            className="w-full bg-[#0C4DA2] hover:bg-[#003370] text-white font-extrabold text-xs py-4 px-6 rounded-2xl transition-all shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Try Another Account</span>
            <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Footer Branding */}
        <div className="mt-8 flex items-center gap-2.5 opacity-60">
          <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <ShieldX className="w-3.5 h-3.5 text-red-500" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">SRMIST Research Portal</span>
        </div>
      </div>
    </div>
  );
}
