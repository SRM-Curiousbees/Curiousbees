'use client';

/**
 * Sidebar.tsx — Institutional Governance & Role-Aware Navigation
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  MessageSquare,
  Briefcase,
  User,
  LogOut,
  Calendar as CalendarIcon,
  Users,
  Building,
  Shield,
  X,
  BookOpen,
  BarChart3,
  GraduationCap,
  Network,
  BookMarked,
  Settings as SettingsIcon,
  UserCheck,
  ShieldAlert,
  FileText,
  Mail,
  Lock,
  History,
  FolderGit2,
  MapPin,
  FileCheck2,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProfileImageUrl } from '@/lib/avatar';
import Logo from '@/components/Logo';
import type { UserRole } from '@curiousbees/types';

interface NavSection {
  title?: string;
  items: {
    name: string;
    href: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const getAdminNavSections = (): NavSection[] => [
  {
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'PEOPLE & ACCESS',
    items: [
      { name: 'Scholars', href: '/admin/users?tab=SCHOLARS', icon: GraduationCap },
      { name: 'Supervisors', href: '/admin/users?tab=SUPERVISORS', icon: UserCheck },
      { name: 'Administrators', href: '/admin/users?tab=ADMINS', icon: Shield },
      { name: 'Roles & Permissions', href: '/admin/roles-permissions', icon: Lock },
      { name: 'Suspended Accounts', href: '/admin/users?tab=SUSPENDED', icon: ShieldAlert },
    ],
  },
  {
    title: 'INSTITUTION',
    items: [
      { name: 'Faculties & Depts', href: '/admin/faculties-departments', icon: Building },
      { name: 'Campuses', href: '/admin/campuses', icon: MapPin },
      { name: 'Directory', href: '/admin/directory', icon: Users },
    ],
  },
  {
    title: 'RESEARCH GOVERNANCE',
    items: [
      { name: 'Research Activity', href: '/admin/research-activity', icon: BarChart3 },
      { name: 'Workspaces', href: '/admin/research-workspaces', icon: FolderGit2 },
      { name: 'Publications', href: '/admin/publications', icon: BookOpen },
      { name: 'Compliance', href: '/admin/compliance', icon: FileCheck2 },
    ],
  },
  {
    title: 'CONTENT MODERATION',
    items: [
      { name: 'Posts & Discussions', href: '/admin/posts', icon: MessageSquare },
      { name: 'Publication Review', href: '/admin/publication-moderation', icon: BookMarked },
      { name: 'Reports & Queue', href: '/admin/moderation', icon: ShieldAlert },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { name: 'Announcements', href: '/admin/announcements', icon: FileText },
      { name: 'Notification Center', href: '/admin/notifications', icon: MessageSquare },
      { name: 'Email Delivery (Brevo)', href: '/admin/email-delivery', icon: Mail },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { name: 'Institutional Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'SECURITY & AUDIT',
    items: [
      { name: 'Audit Center', href: '/admin/audit', icon: History },
      { name: 'Security Events', href: '/admin/security', icon: Lock },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { name: 'System Settings', href: '/admin/settings', icon: SettingsIcon },
    ],
  },
];

const getStandardNavItems = (role: UserRole) => {
  if (role === 'RESEARCH_SUPERVISOR') {
    return [
      { name: 'Research Feed', href: '/feed', icon: MessageSquare },
      { name: 'Supervision Panel', href: '/my-scholars', icon: UserCheck },
      { name: 'Research Workspaces', href: '/workspace', icon: FolderGit2 },
      { name: 'Publications', href: '/publications', icon: BookOpen },
      { name: 'Opportunities', href: '/opportunities', icon: Briefcase },
      { name: 'Curious Nexus', href: '/nexus', icon: Network },
      { name: 'Events', href: '/events', icon: CalendarIcon },
      { name: 'Researchers', href: '/researchers', icon: Users },
      { name: 'Settings', href: '/settings', icon: SettingsIcon },
    ];
  }

  // Default: Research Scholar
  return [
    { name: 'Research Feed', href: '/feed', icon: MessageSquare },
    { name: 'My Research', href: '/my-research', icon: BookMarked },
    { name: 'Research Workspaces', href: '/workspace', icon: FolderGit2 },
    { name: 'Publications', href: '/publications', icon: BookOpen },
    { name: 'Opportunities', href: '/opportunities', icon: Briefcase },
    { name: 'Curious Nexus', href: '/nexus', icon: Network },
    { name: 'Events', href: '/events', icon: CalendarIcon },
    { name: 'Researchers', href: '/researchers', icon: Users },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];
};

function NavItem({
  name,
  href,
  icon: Icon,
  active,
  onClick,
  hoveredItem,
  setHoveredItem,
}: {
  name: string;
  href: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
  hoveredItem: string | null;
  setHoveredItem: (name: string | null) => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHoveredItem(name)}
      onMouseLeave={() => setHoveredItem(null)}
      className={cn(
        'relative flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 select-none group',
        active
          ? 'bg-[#0C4DA2]/10 dark:bg-blue-600/15 text-[#0C4DA2] dark:text-[#F5F7FA] font-black'
          : 'text-slate-600 dark:text-[#A7B3C5] hover:bg-slate-100/80 dark:hover:bg-[#132238] hover:text-slate-900 dark:hover:text-[#F5F7FA]'
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-indicator"
          className="absolute left-1 top-2 bottom-2 w-[3px] bg-[#0C4DA2] dark:bg-[#3B82F6] rounded-full z-10"
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        />
      )}

      <Icon
        className={cn(
          'w-4 h-4 shrink-0 transition-transform duration-150 relative z-10 group-hover:scale-105',
          active
            ? 'text-[#0C4DA2] dark:text-[#3B82F6]'
            : 'text-slate-400 dark:text-[#718096] group-hover:text-slate-900 dark:group-hover:text-[#F5F7FA]'
        )}
      />
      <span
        className={cn(
          'truncate leading-none relative z-10 text-[13px]',
          active
            ? 'text-[#0C4DA2] dark:text-[#F5F7FA] font-extrabold tracking-tight'
            : 'text-slate-600 dark:text-[#A7B3C5] group-hover:text-slate-900 dark:group-hover:text-[#F5F7FA]'
        )}
      >
        {name}
      </span>
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, logout } = useStore();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const role = currentUser?.role || 'RESEARCH_SCHOLAR';
  const isAdmin = role === 'INSTITUTE_ADMIN';

  const isActive = (href: string) => {
    const [pathPart, queryPart] = href.split('?');
    if (pathname !== pathPart) return false;
    if (!queryPart) return true;

    // Check query tab parameter
    const params = new URLSearchParams(queryPart);
    const targetTab = params.get('tab');
    const currentTab = searchParams.get('tab');
    return targetTab === currentTab;
  };

  return (
    <div className="flex flex-col h-full py-4 bg-white dark:bg-[#07111F] border-r border-slate-200/80 dark:border-white/[0.08] select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 mb-2">
        <Logo showText={true} size={30} />
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-[#132238] transition-colors cursor-pointer md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Admin Governance Subheader Badge */}
      {isAdmin && (
        <div className="px-5 mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-[#0E1E33] border border-slate-200/60 dark:border-white/[0.08] rounded-lg">
            <Shield className="w-3.5 h-3.5 text-[#0C4DA2] dark:text-[#3B82F6]" />
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-700 dark:text-slate-300">
              Institutional Governance
            </span>
          </div>
        </div>
      )}

      {/* Navigation Zone */}
      <nav className="flex-1 overflow-y-auto px-3.5 flex flex-col gap-3 scrollbar-thin">
        {isAdmin ? (
          getAdminNavSections().map((section, idx) => (
            <div key={idx} className="space-y-0.5">
              {section.title && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => (
                <NavItem
                  key={item.href + item.name}
                  {...item}
                  active={isActive(item.href)}
                  onClick={onClose}
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
              ))}
            </div>
          ))
        ) : (
          <div className="flex flex-col gap-0.5 mt-2">
            {getStandardNavItems(role).map((item) => (
              <NavItem
                key={item.href + item.name}
                {...item}
                active={pathname === item.href || pathname.startsWith(item.href + '/')}
                onClick={onClose}
                hoveredItem={hoveredItem}
                setHoveredItem={setHoveredItem}
              />
            ))}
          </div>
        )}
      </nav>

      {/* User Mini-Profile & Logout */}
      <div className="px-3.5 pt-3 mt-auto border-t border-slate-100 dark:border-white/[0.08]">
        {currentUser && (
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0B1728] border border-slate-200/60 dark:border-white/[0.08] mb-2 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
              <img
                src={getProfileImageUrl(currentUser)}
                alt={currentUser.name || 'User'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-900 dark:text-[#F5F7FA] truncate leading-tight">
                {currentUser.name || 'Administrator'}
              </p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#718096] truncate">
                {isAdmin
                  ? 'Institute Admin'
                  : role === 'RESEARCH_SUPERVISOR'
                  ? 'Research Supervisor'
                  : 'Research Scholar'}
              </p>
            </div>
          </div>
        )}

        {role === 'RESEARCH_SUPERVISOR' && (
          <Link
            href="/my-scholars"
            onClick={onClose}
            className={cn(
              'p-2.5 rounded-xl transition-all flex items-center gap-3 border mb-2 cursor-pointer',
              pathname === '/my-scholars'
                ? 'bg-[#0C4DA2] dark:bg-[#2563EB] text-white border-[#0C4DA2] dark:border-transparent shadow-sm'
                : 'bg-[#0C4DA2]/10 dark:bg-blue-600/15 hover:bg-[#0C4DA2]/15 text-[#0C4DA2] dark:text-[#3B82F6] border-[#0C4DA2]/25 dark:border-blue-500/30'
            )}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#0C4DA2] dark:bg-[#2563EB] text-white shadow-sm">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-black leading-tight">Supervision Panel</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#718096]">Manage Scholars & Advisory</p>
            </div>
          </Link>
        )}

        <button
          onClick={() => {
            logout();
            onClose?.();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-extrabold text-slate-500 dark:text-[#718096] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 transition-all cursor-pointer text-left"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Exit Portal</span>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { showMobileSidebar, setMobileSidebar } = useStore();

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col shrink-0 sticky top-0 h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {showMobileSidebar && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebar(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10"
            >
              <SidebarContent onClose={() => setMobileSidebar(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
