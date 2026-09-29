'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, LayoutDashboard, Users, CheckSquare,
  Bell, LogOut, ChevronRight, Building2, Menu, X
} from 'lucide-react';

const SESSION_KEY = 'cb_admin_session';

const NAV_ITEMS = [
  { href: '/sys-admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/sys-admin/users', label: 'User Management', icon: Users },
  { href: '/sys-admin/approvals', label: 'Approval Requests', icon: CheckSquare },
  { href: '/sys-admin/notifications', label: 'Notifications', icon: Bell },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session !== 'authenticated') {
      router.replace('/sys-admin-login');
    } else {
      setAuthenticated(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    router.push('/sys-admin-login');
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/30 z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`theme-static fixed top-0 left-0 h-full w-64 bg-slate-900 z-40 flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative md:flex`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg  shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-tight leading-none">CuriousBees</p>
            <p className="text-white/40 text-xs font-medium capitalize mt-0.5">Admin Panel</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto md:hidden text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Institute badge */}
        <div className="mx-4 mt-4 mb-2 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-400/15 flex items-center gap-2.5">
          <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <p className="text-white text-xs font-semibold leading-none">SRMIST</p>
            <p className="text-white/40 text-2xs mt-0.5">Institute Administrator</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <p className="text-white/25 text-xs font-medium capitalize px-3 mb-2">Navigation</p>
          {NAV_ITEMS.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                  ${active
                    ? 'bg-brand/20 text-blue-300 border border-blue-500/20'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                  }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : 'text-white/35 group-hover:text-white/60'}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 text-blue-400/60" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 border-t border-white/[0.05] pt-3">
          <button
            id="admin-logout-btn"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-red-400 hover:bg-danger-strong/10 transition-all duration-200 w-full cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-3.5 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Admin</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 capitalize">
              {pathname === '/sys-admin' ? 'Dashboard' : pathname.replace('/sys-admin/', '').replace(/-/g, ' ')}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500 font-medium">Live</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
