'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, ShieldOff, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function AccountRejectedPage() {
  const router = useRouter();
  const { currentUser, logout } = useStore();

  const handleSignOut = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="theme-static min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-red-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-rose-600/6 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      {/* Sign out button */}
      <button
        onClick={handleSignOut}
        className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] text-white/40 hover:text-white/70 text-xs font-semibold transition-all cursor-pointer z-20"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Sign Out</span>
      </button>

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg ">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">CuriousBees</span>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl text-center"
        >
          {/* Red shimmer top border */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent rounded-full" />

          {/* Icon */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.4 }}
            className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-400/20 flex items-center justify-center mx-auto mb-6"
          >
            <ShieldOff className="w-8 h-8 text-red-400" />
          </motion.div>

          {/* Status badge */}
          <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-400/20 px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-xs font-medium text-red-300 capitalize">Registration Declined</span>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight mb-3">Your Account Was Not Approved</h1>

          <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
            Your registration request was reviewed and could not be approved at this time. This may be due to incomplete information or a policy decision.
          </p>

          {/* Account info box */}
          {currentUser?.email && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-400/15 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/30 font-medium capitalize">Registered email</p>
                <p className="text-sm font-semibold text-white/80 truncate">{currentUser.email}</p>
              </div>
            </motion.div>
          )}

          {/* What to do */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left space-y-2.5"
          >
            <p className="text-xs font-medium text-white/30 capitalize">What can you do?</p>
            {[
              'Contact the Institutional Administrator for clarification',
              'Ensure you are using your official SRMIST email address',
              'Re-register with complete and accurate information',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5 shrink-0" />
                <p className="text-xs text-white/40 leading-relaxed">{item}</p>
              </div>
            ))}
          </motion.div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              href="mailto:research.admin@srmist.edu.in?subject=CuriousBees%20Registration%20Appeal"
              className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/[0.04] text-white/60 hover:text-white/80 text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Contact Administrator</span>
            </motion.a>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              onClick={handleSignOut}
              className="w-full py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-white/50 hover:text-white/80 text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </motion.button>
          </div>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center mt-5 text-xs text-white/15 font-medium capitalize">
          SRMIST • Institutional Research Portal
        </motion.p>
      </div>
    </div>
  );
}
