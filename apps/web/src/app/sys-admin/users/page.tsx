'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Filter, ChevronDown, MoreHorizontal,
  UserCheck, UserX, ShieldAlert, Loader2, RefreshCw,
  GraduationCap, BookOpen, Crown
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department?: string;
  approved: boolean;
  createdAt: string;
}

const ROLE_BADGE: Record<string, { label: string; class: string; icon: any }> = {
  SCHOLAR:        { label: 'Scholar',        class: 'bg-blue-50 text-brand border-blue-100', icon: GraduationCap },
  SUPERVISOR:     { label: 'Supervisor',     class: 'bg-blue-50 text-blue-700 border-blue-100',       icon: BookOpen },
  INSTITUTE_ADMIN:{ label: 'Admin',          class: 'bg-amber-50 text-amber-700 border-amber-100',    icon: Crown },
  ADMIN:          { label: 'Admin',          class: 'bg-amber-50 text-amber-700 border-amber-100',    icon: Crown },
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:                    'bg-emerald-50 text-emerald-700 border-emerald-100',
  PENDING_ADMIN_APPROVAL:    'bg-amber-50 text-amber-700 border-amber-100',
  PENDING_SUPERVISOR_APPROVAL:'bg-sky-50 text-sky-700 border-sky-100',
  ONBOARDING:                'bg-slate-50 text-slate-600 border-slate-200',
  REJECTED:                  'bg-red-50 text-red-700 border-red-100',
  SUSPENDED:                 'bg-red-50 text-red-700 border-red-100',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/admin`, {
        headers: { 'x-admin-bypass': 'true' }
      });
      if (res.ok) setUsers(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleAction = async (userId: string, action: 'approve' | 'suspend' | 'unsuspend') => {
    setActionLoading(userId + action);
    setOpenMenu(null);
    try {
      const endpointMap: Record<string, string> = {
        approve: '/api/users/approve-supervisor',
        suspend: '/api/users/suspend',
        unsuspend: '/api/users/unsuspend',
      };
      await fetch(`${API_URL}${endpointMap[action]}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-bypass': 'true' },
        body: JSON.stringify({ userId, supervisorId: userId }),
      });
      await fetchUsers();
    } catch { /* silent */ }
    finally { setActionLoading(null); }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> User Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} registered users across all roles</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-surface border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="SCHOLAR">Scholars</option>
            <option value="SUPERVISOR">Supervisors</option>
            <option value="INSTITUTE_ADMIN">Admins</option>
          </select>
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-slate-200/70 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3.5 text-xs font-medium capitalize text-slate-500">User</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium capitalize text-slate-500">Role</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium capitalize text-slate-500">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium capitalize text-slate-500">Department</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium capitalize text-slate-500">Joined</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((user, i) => {
                  const roleMeta = ROLE_BADGE[user.role] || { label: user.role, class: 'bg-slate-50 text-slate-600 border-slate-200', icon: Users };
                  const RoleIcon = roleMeta.icon;
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 theme-static">
                            {user.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{user.name || '—'}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleMeta.class}`}>
                          <RoleIcon className="w-3 h-3" />{roleMeta.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[user.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {user.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{user.department || '—'}</td>
                      <td className="px-5 py-4 text-sm text-slate-400">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="relative flex justify-end">
                          {actionLoading?.startsWith(user.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          ) : (
                            <>
                              <button
                                onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              <AnimatePresence>
                                {openMenu === user.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                    className="absolute right-0 top-8 w-44 bg-surface border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden"
                                  >
                                    {user.status === 'PENDING_ADMIN_APPROVAL' && (
                                      <button
                                        onClick={() => handleAction(user.id, 'approve')}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors"
                                      >
                                        <UserCheck className="w-4 h-4" /> Approve
                                      </button>
                                    )}
                                    {user.status === 'ACTIVE' && (
                                      <button
                                        onClick={() => handleAction(user.id, 'suspend')}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                      >
                                        <UserX className="w-4 h-4" /> Suspend
                                      </button>
                                    )}
                                    {user.status === 'SUSPENDED' && (
                                      <button
                                        onClick={() => handleAction(user.id, 'unsuspend')}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                                      >
                                        <ShieldAlert className="w-4 h-4" /> Reactivate
                                      </button>
                                    )}
                                    <div className="px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100">
                                      ID: {user.id.slice(0, 8)}…
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
