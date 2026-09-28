'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings, User, ChevronRight, ShieldCheck, Sparkles, GraduationCap } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { RoleBadge } from './role-badge';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getProfileImageUrl } from '@/lib/avatar';

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside safely
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!currentUser) return null;

  const isProfileActive = pathname === '/profile' || pathname.startsWith('/profile/');
  const isSettingsActive = pathname === '/settings' || pathname.startsWith('/settings/') || pathname.endsWith('/settings');

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    router.push('/login');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-[#0C4DA2]/30 transition-all cursor-pointer select-none group"
        title="User Profile Menu"
        aria-label="Toggle user profile menu"
      >
        <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden shadow-md border-2 border-white group-hover:scale-105 transition-transform flex items-center justify-center">
          <img src={getProfileImageUrl(currentUser)} alt={currentUser.name || 'Avatar'} className="w-full h-full object-cover" />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-72 bg-white/95 dark:bg-[#101D30]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.10] rounded-3xl z-50 overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 p-2.5 flex flex-col select-none text-left"
          >
            {/* Header info */}
            <div className="p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-[#0B1728] dark:to-[#132238] rounded-2xl border border-slate-100/80 dark:border-white/[0.08] mb-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border-2 border-white dark:border-slate-700 shadow-sm flex items-center justify-center">
                  <img src={getProfileImageUrl(currentUser)} alt="" className="w-full h-full object-cover rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-[#F5F7FA] truncate leading-snug">{currentUser.name || 'Researcher'}</p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-[#A7B3C5] truncate">{currentUser.email}</p>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <RoleBadge role={currentUser.role} size="sm" />
                <span className="text-[10px] font-extrabold text-[#0C4DA2] dark:text-[#3B82F6] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0C4DA2] dark:text-[#3B82F6]" />
                  <span>Verified</span>
                </span>
              </div>
            </div>

            {/* Menu Links */}
            <div className="flex flex-col gap-1">
              {currentUser.role === 'RESEARCH_SUPERVISOR' && (
                <button
                  onClick={() => handleNavigate('/my-scholars')}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 text-xs rounded-2xl transition-all w-full text-left cursor-pointer group",
                    pathname.startsWith('/my-scholars')
                      ? "bg-[#EEF4FF] dark:bg-blue-600/20 text-[#0C4DA2] dark:text-[#3B82F6] font-black border border-[#0C4DA2]/20 dark:border-blue-500/30"
                      : "font-bold text-slate-700 dark:text-[#A7B3C5] hover:text-[#0C4DA2] dark:hover:text-[#F5F7FA] hover:bg-blue-50/50 dark:hover:bg-[#132238]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-[#0C4DA2] dark:text-[#3B82F6] group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold text-[#0C4DA2] dark:text-[#3B82F6]">Supervision Panel</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#0C4DA2] dark:text-[#3B82F6] group-hover:translate-x-0.5 transition-all" />
                </button>
              )}

              <button
                onClick={() => handleNavigate('/profile')}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 text-xs rounded-2xl transition-all w-full text-left cursor-pointer group",
                  isProfileActive
                    ? "bg-[#EEF4FF] dark:bg-blue-600/20 text-[#0C4DA2] dark:text-[#3B82F6] font-black border border-[#0C4DA2]/20 dark:border-blue-500/30"
                    : "font-bold text-slate-700 dark:text-[#A7B3C5] hover:text-[#0C4DA2] dark:hover:text-[#F5F7FA] hover:bg-blue-50/50 dark:hover:bg-[#132238]"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <User className={cn("w-4 h-4 transition-colors", isProfileActive ? "text-[#0C4DA2] dark:text-[#3B82F6]" : "text-slate-400 dark:text-[#718096] group-hover:text-[#0C4DA2] dark:group-hover:text-[#3B82F6]")} />
                  <span>My Profile</span>
                </div>
                <ChevronRight className={cn("w-3.5 h-3.5 transition-all", isProfileActive ? "text-[#0C4DA2] dark:text-[#3B82F6]" : "text-slate-300 dark:text-slate-600 group-hover:text-[#0C4DA2] dark:group-hover:text-[#3B82F6] group-hover:translate-x-0.5")} />
              </button>

              <button
                onClick={() => handleNavigate('/settings')}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 text-xs rounded-2xl transition-all w-full text-left cursor-pointer group",
                  isSettingsActive
                    ? "bg-[#EEF4FF] dark:bg-blue-600/20 text-[#0C4DA2] dark:text-[#3B82F6] font-black border border-[#0C4DA2]/20 dark:border-blue-500/30 shadow-xs"
                    : "font-bold text-slate-700 dark:text-[#A7B3C5] hover:text-[#0C4DA2] dark:hover:text-[#F5F7FA] hover:bg-blue-50/50 dark:hover:bg-[#132238]"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className={cn("w-4 h-4 transition-colors", isSettingsActive ? "text-[#0C4DA2] dark:text-[#3B82F6]" : "text-slate-400 dark:text-[#718096] group-hover:text-[#0C4DA2] dark:group-hover:text-[#3B82F6]")} />
                  <span>Settings</span>
                </div>
                <ChevronRight className={cn("w-3.5 h-3.5 transition-all", isSettingsActive ? "text-[#0C4DA2] dark:text-[#3B82F6]" : "text-slate-300 dark:text-slate-600 group-hover:text-[#0C4DA2] dark:group-hover:text-[#3B82F6] group-hover:translate-x-0.5")} />
              </button>

              <div className="h-px bg-slate-100 dark:bg-white/[0.08] my-1 w-full" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl transition-all w-full text-left cursor-pointer group"
              >
                <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-400 group-hover:scale-110 transition-transform" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

