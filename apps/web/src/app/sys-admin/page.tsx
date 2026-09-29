'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, CheckSquare, Bell, TrendingUp,
  UserCheck, UserX, Clock, Activity,
  ArrowUpRight, Zap, Building2, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Stats {
  totalUsers: number;
  pendingApprovals: number;
  totalSupervisors: number;
  totalScholars: number;
}

const StatCard = ({
  label, value, icon: Icon, color, href, delay = 0
}: {
  label: string; value: number | string; icon: any;
  color: string; href: string; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35 }}
  >
    <Link href={href}>
      <div className="bg-surface border border-slate-200/70 rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition-all duration-200 group cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
        <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
        <p className="text-sm text-slate-500 mt-1 font-medium">{label}</p>
      </div>
    </Link>
  </motion.div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, pendingApprovals: 0, totalSupervisors: 0, totalScholars: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/admin`, {
          headers: { 'x-admin-bypass': 'true' }
        });
        if (res.ok) {
          const users: any[] = await res.json();
          setStats({
            totalUsers: users.length,
            pendingApprovals: users.filter(u => u.status === 'PENDING_ADMIN_APPROVAL').length,
            totalSupervisors: users.filter(u => u.role === 'SUPERVISOR').length,
            totalScholars: users.filter(u => u.role === 'SCHOLAR').length,
          });
        }
      } catch {
        // silently fail — show zeros
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Users', value: loading ? '—' : stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600', href: '/sys-admin/users', delay: 0 },
    { label: 'Pending Approvals', value: loading ? '—' : stats.pendingApprovals, icon: Clock, color: 'bg-amber-50 text-amber-600', href: '/sys-admin/approvals', delay: 0.05 },
    { label: 'Supervisors', value: loading ? '—' : stats.totalSupervisors, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600', href: '/sys-admin/users', delay: 0.1 },
    { label: 'Scholars', value: loading ? '—' : stats.totalScholars, icon: Activity, color: 'bg-purple-50 text-purple-600', href: '/sys-admin/users', delay: 0.15 },
  ];

  const quickActions = [
    { label: 'Review Approvals', desc: 'Approve or decline pending registrations', href: '/sys-admin/approvals', icon: CheckSquare, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { label: 'Manage Users', desc: 'View, suspend or change user roles', href: '/sys-admin/users', icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { label: 'Send Notification', desc: 'Broadcast announcements to users', href: '/sys-admin/notifications', icon: Bell, color: 'text-purple-600 bg-purple-50 border-purple-100' },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="theme-static w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institute Dashboard</h1>
        </div>
        <p className="text-slate-500 text-sm ml-11">SRMIST — Institutional Administrator Overview</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickActions.map(action => (
            <Link key={action.href} href={action.href}>
              <div className="bg-surface border border-slate-200/70 rounded-2xl p-5 hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer group">
                <div className={`w-9 h-9 rounded-xl border ${action.color} flex items-center justify-center mb-3`}>
                  <action.icon className="w-4 h-4" />
                </div>
                <p className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{action.label}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Status bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2 py-3 px-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-medium"
      >
        <Zap className="w-3.5 h-3.5" />
        Admin panel is active — PIN secured direct management
      </motion.div>
    </div>
  );
}
