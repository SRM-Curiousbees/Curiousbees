'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertCircle, Loader2, Lock } from 'lucide-react';

const ADMIN_PIN = '190820';
const SESSION_KEY = 'cb_admin_session';

export default function AdminLoginPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // If already authenticated, redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem(SESSION_KEY);
      if (session === 'authenticated') {
        router.replace('/sys-admin');
      }
    }
  }, [router]);

  const pin = digits.join('');

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const char = value.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setError('');
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
      }
    }
    if (e.key === 'Enter' && pin.length === 6) {
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (pin.length < 6) return;
    setIsLoading(true);
    setError('');

    // Simulate a slight delay for UX
    await new Promise(r => setTimeout(r, 600));

    if (pin === ADMIN_PIN) {
      localStorage.setItem(SESSION_KEY, 'authenticated');
      router.push('/sys-admin');
    } else {
      setIsLoading(false);
      setError('Incorrect PIN. Please try again.');
      setShake(true);
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        setShake(false);
        inputRefs.current[0]?.focus();
      }, 600);
    }
  };

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (pin.length === 6 && !isLoading) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="theme-static min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-600/8 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg ">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">CuriousBees</span>
          </div>
          <p className="text-white/40 text-xs font-medium capitalize">Institute Admin Portal</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl"
        >
          {/* Shimmer top */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent rounded-full" />

          {/* Lock icon */}
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center"
            >
              <Lock className="w-7 h-7 text-blue-400" />
            </motion.div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-white tracking-tight">Admin Access</h1>
            <p className="text-white/40 text-sm mt-1">Enter your 6-digit admin PIN</p>
          </div>

          {/* PIN Inputs */}
          <motion.div
            animate={shake ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex justify-center gap-3 mb-6"
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                id={`admin-pin-${i}`}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                autoFocus={i === 0}
                className="w-12 h-14 text-center text-xl font-bold text-white bg-white/[0.06] border border-white/10 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent focus:bg-white/[0.08]
                  transition-all duration-200 caret-transparent"
              />
            ))}
          </motion.div>

          {/* PIN fill indicator */}
          <div className="flex justify-center gap-1.5 mb-6">
            {digits.map((d, i) => (
              <motion.div
                key={i}
                animate={{ scale: d ? 1 : 0.7, opacity: d ? 1 : 0.25 }}
                transition={{ duration: 0.15 }}
                className="w-1.5 h-1.5 rounded-full bg-blue-400"
              />
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 mb-5"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <button
            id="admin-pin-submit"
            onClick={handleSubmit}
            disabled={pin.length < 6 || isLoading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
              text-white text-sm font-semibold flex items-center justify-center gap-2
              transition-all duration-200 shadow-lg  cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock Admin Panel'}
          </button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-4 text-xs text-white/15 font-medium capitalize"
        >
          SRMIST • Restricted Access • Institutional Use Only
        </motion.p>
      </div>
    </div>
  );
}
