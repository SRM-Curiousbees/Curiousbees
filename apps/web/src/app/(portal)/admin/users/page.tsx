'use client';

/**
 * User Management & Governance Console — People & Access Module
 */

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import {
  Users,
  GraduationCap,
  UserCheck,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Building,
  UserCog,
  AlertTriangle,
  History,
  BookOpen,
  FolderGit2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getProfileImageUrl } from '@/lib/avatar';

type UserTab = 'ALL' | 'SCHOLARS' | 'SUPERVISORS' | 'ADMINS' | 'SUSPENDED';

function AdminUsersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    currentUser,
    fetchAdminUsersPaginated,
    fetchAdminUserGovernanceProfile,
    updateAdminUserAffiliation,
    suspendUser,
    reactivateUser,
    deactivateUser,
    changeUserRole,
    reassignSupervisor,
    deleteAdminUser,
    fetchAdminFaculties,
    fetchAdminDepartments,
  } = useStore();

  const initialTab = (searchParams.get('tab') as UserTab) || 'ALL';
  const [activeTab, setActiveTab] = useState<UserTab>(initialTab);

  // Filters
  const [search, setSearch] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Data state
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Selected User Drawer state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState<'ACCOUNT' | 'RESEARCH' | 'GOVERNANCE'>('ACCOUNT');

  // Action Modals State
  const [actionModal, setActionModal] = useState<{
    type: 'SUSPEND' | 'REACTIVATE' | 'DEACTIVATE' | 'CHANGE_ROLE' | 'REASSIGN_SUPERVISOR' | 'DELETE';
    user: any;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [newRole, setNewRole] = useState<'RESEARCH_SCHOLAR' | 'RESEARCH_SUPERVISOR' | 'INSTITUTE_ADMIN'>('RESEARCH_SCHOLAR');
  const [newSupervisorId, setNewSupervisorId] = useState('');
  const [supervisorsList, setSupervisorsList] = useState<any[]>([]);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // User Affiliation Modal State
  const [affiliationUser, setAffiliationUser] = useState<any | null>(null);
  const [modalFacultyId, setModalFacultyId] = useState('');
  const [modalDeptId, setModalDeptId] = useState('');
  const [modalAffiliationReason, setModalAffiliationReason] = useState('');
  const [affiliationSubmitting, setAffiliationSubmitting] = useState(false);

  // Filtered departments based on selected faculty filter
  const availableFilterDepartments = useMemo(() => {
    if (facultyFilter === 'ALL') return departments;
    const selectedFac = faculties.find((f) => f.name === facultyFilter || f.id === facultyFilter);
    if (!selectedFac) return departments;
    return departments.filter((d) => d.facultyId === selectedFac.id);
  }, [facultyFilter, departments, faculties]);

  // Departments available in the Affiliation modal based on selected modal faculty
  const availableModalDepartments = useMemo(() => {
    if (!modalFacultyId) return [];
    return departments.filter((d) => d.facultyId === modalFacultyId);
  }, [modalFacultyId, departments]);

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams.get('tab') as UserTab;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Load lookup options
  useEffect(() => {
    Promise.allSettled([
      fetchAdminFaculties().then((res) => setFaculties(res || [])),
      fetchAdminDepartments().then((res) => setDepartments(res || [])),
    ]);
  }, [fetchAdminFaculties, fetchAdminDepartments]);

  // Query users
  const loadUsers = async () => {
    setLoading(true);
    try {
      let roleQuery = 'ALL';
      let statusQuery = 'ALL';

      if (activeTab === 'SCHOLARS') roleQuery = 'RESEARCH_SCHOLAR';
      else if (activeTab === 'SUPERVISORS') roleQuery = 'RESEARCH_SUPERVISOR';
      else if (activeTab === 'ADMINS') roleQuery = 'INSTITUTE_ADMIN';
      else if (activeTab === 'SUSPENDED') statusQuery = 'SUSPENDED';

      const res = await fetchAdminUsersPaginated({
        role: roleQuery,
        status: statusQuery,
        faculty: facultyFilter,
        departmentId: deptFilter,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      setUsers(res.items || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err) {
      console.error('Error fetching users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [activeTab, facultyFilter, deptFilter, page, sortBy, sortOrder]);

  // Handle Search on Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  // Open Drawer and load full governance profile
  const openUserDrawer = async (userId: string) => {
    setSelectedUserId(userId);
    setProfileLoading(true);
    try {
      const res = await fetchAdminUserGovernanceProfile(userId);
      setUserProfile(res);
    } catch (err) {
      console.error('Error fetching user governance profile', err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Load supervisors list when needed
  const openReassignSupervisorModal = async (user: any) => {
    setActionModal({ type: 'REASSIGN_SUPERVISOR', user });
    setActionReason('');
    setNewSupervisorId('');
    try {
      const res = await fetchAdminUsersPaginated({ role: 'RESEARCH_SUPERVISOR', limit: 100 });
      setSupervisorsList(res.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Action Handler
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;

    setActionSubmitting(true);
    try {
      if (actionModal.type === 'SUSPEND') {
        await suspendUser(actionModal.user.id, actionReason);
      } else if (actionModal.type === 'REACTIVATE') {
        await reactivateUser(actionModal.user.id, actionReason);
      } else if (actionModal.type === 'DEACTIVATE') {
        await deactivateUser(actionModal.user.id, actionReason);
      } else if (actionModal.type === 'CHANGE_ROLE') {
        await changeUserRole(actionModal.user.id, newRole, actionReason);
      } else if (actionModal.type === 'REASSIGN_SUPERVISOR') {
        await reassignSupervisor(actionModal.user.id, newSupervisorId, actionReason);
      } else if (actionModal.type === 'DELETE') {
        await deleteAdminUser(actionModal.user.id, actionReason);
      }

      if (actionModal.type === 'DELETE' && selectedUserId === actionModal.user.id) {
        setSelectedUserId(null);
      } else if (selectedUserId === actionModal.user.id) {
        await openUserDrawer(actionModal.user.id);
      }

      setActionModal(null);
      setActionReason('');
      await loadUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setActionSubmitting(false);
    }
  };

  // Open Affiliation Modal
  const openAffiliationModal = (targetUser: any) => {
    setAffiliationUser(targetUser);
    const existingFacultyId =
      targetUser.departmentRef?.facultyId ||
      faculties.find((f) => f.name === targetUser.faculty || f.id === targetUser.faculty)?.id ||
      '';
    setModalFacultyId(existingFacultyId);
    const existingDeptId = targetUser.departmentId || '';
    setModalDeptId(existingDeptId);
    setModalAffiliationReason('');
  };

  // Submit Affiliation Update Handler
  const handleAffiliationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affiliationUser || !modalFacultyId || !modalDeptId) return;

    setAffiliationSubmitting(true);
    try {
      await updateAdminUserAffiliation(affiliationUser.id, {
        facultyId: modalFacultyId,
        departmentId: modalDeptId,
        reason: modalAffiliationReason || 'Institutional reorganization / administrative correction',
      });

      if (selectedUserId === affiliationUser.id) {
        await openUserDrawer(affiliationUser.id);
      }

      setAffiliationUser(null);
      await loadUsers();
    } catch (err) {
      console.error('Failed to update user affiliation', err);
    } finally {
      setAffiliationSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/[0.08] pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-[#F5F7FA] tracking-tight">
            User Management & Access Control
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#A7B3C5] font-semibold mt-0.5">
            Institutional directory of scholars, supervisors, and administrative accounts with audited governance.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 dark:border-white/[0.08] overflow-x-auto scrollbar-none pb-1">
        {[
          { id: 'ALL', label: 'All Users', icon: Users },
          { id: 'SCHOLARS', label: 'Scholars', icon: GraduationCap },
          { id: 'SUPERVISORS', label: 'Supervisors', icon: UserCheck },
          { id: 'ADMINS', label: 'Administrators', icon: Shield },
          { id: 'SUSPENDED', label: 'Suspended Accounts', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setPage(1);
              }}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap',
                isActive
                  ? 'bg-[#0C4DA2] text-white dark:bg-[#2563EB] shadow-2xs'
                  : 'text-slate-600 dark:text-[#A7B3C5] hover:bg-slate-100 dark:hover:bg-[#132238] hover:text-slate-900 dark:hover:text-[#F5F7FA]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#07111F] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search by name, email, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#0B1728] border border-slate-200/80 dark:border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 dark:text-[#F5F7FA] placeholder:text-slate-400 dark:placeholder:text-[#718096] focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]/20"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Faculty filter */}
          <select
            value={facultyFilter}
            onChange={(e) => {
              const nextFaculty = e.target.value;
              setFacultyFilter(nextFaculty);
              setPage(1);
              if (nextFaculty !== 'ALL') {
                const selectedFac = faculties.find((f) => f.name === nextFaculty || f.id === nextFaculty);
                if (selectedFac && deptFilter !== 'ALL') {
                  const stillValid = departments.some((d) => d.id === deptFilter && d.facultyId === selectedFac.id);
                  if (!stillValid) setDeptFilter('ALL');
                }
              }
            }}
            className="bg-slate-50 dark:bg-[#0B1728] border border-slate-200/80 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-[#A7B3C5] focus:outline-none"
          >
            <option value="ALL">All Faculties</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>

          {/* Department filter */}
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-[#0B1728] border border-slate-200/80 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-[#A7B3C5] focus:outline-none max-w-[200px]"
          >
            <option value="ALL">All Departments</option>
            {availableFilterDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code ? `${d.code} - ` : ''}{d.name}
              </option>
            ))}
          </select>

          {/* Sort field */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-50 dark:bg-[#0B1728] border border-slate-200/80 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-[#A7B3C5] focus:outline-none"
          >
            <option value="createdAt">Joined Date</option>
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="department">Department</option>
          </select>

          {/* Sort order button */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B1728] text-slate-600 dark:text-[#A7B3C5] hover:bg-slate-100 dark:hover:bg-[#132238] transition-colors cursor-pointer"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white dark:bg-[#07111F] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#0C4DA2]" />
            <p className="text-xs font-bold">Querying users directory...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-[#F5F7FA]">No users found</h3>
            <p className="text-xs text-slate-400 dark:text-[#718096] max-w-sm">
              Try adjusting your search criteria or selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#0B1728] text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department / Faculty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Supervisor / Scholars</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right min-w-[200px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs font-medium">
                {users.map((user) => {
                  const isSuspended = user.status === 'SUSPENDED' || user.suspended;
                  const isSuperadmin = user.email?.toLowerCase() === 'r.matheshwaran.io@gmail.com';
                  const isSelf = user.id === currentUser?.id;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-[#0B1728] transition-colors"
                    >
                      {/* Avatar + Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
                            <img
                              src={getProfileImageUrl(user)}
                              alt={user.name || 'User'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => openUserDrawer(user.id)}
                              className="font-bold text-slate-900 dark:text-[#F5F7FA] hover:text-[#0C4DA2] dark:hover:text-[#3B82F6] truncate text-left block cursor-pointer"
                            >
                              {user.name || 'Unnamed User'}
                            </button>
                            <p className="text-[11px] text-slate-400 dark:text-[#718096] truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border',
                            user.role === 'INSTITUTE_ADMIN'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                              : user.role === 'RESEARCH_SUPERVISOR'
                              ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                          )}
                        >
                          {user.role === 'INSTITUTE_ADMIN'
                            ? 'Admin'
                            : user.role === 'RESEARCH_SUPERVISOR'
                            ? 'Supervisor'
                            : 'Scholar'}
                        </span>
                      </td>

                      {/* Department / Faculty */}
                      <td className="py-3 px-4">
                        <p className="text-slate-800 dark:text-[#F5F7FA] font-semibold truncate max-w-[180px]">
                          {user.departmentRef?.name || user.department || '—'}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-[#718096] truncate">
                          {user.departmentRef?.faculty?.name || user.faculty || '—'}
                        </p>
                        {(user.role === 'RESEARCH_SCHOLAR' || user.role === 'RESEARCH_SUPERVISOR') && !user.departmentId && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 mt-1">
                            Unassigned Affiliation
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1',
                            isSuspended
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                              : user.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              isSuspended ? 'bg-rose-600' : user.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-amber-600'
                            )}
                          />
                          {isSuspended ? 'Suspended' : user.status}
                        </span>
                      </td>

                      {/* Supervisor / Scholars */}
                      <td className="py-3 px-4 text-slate-600 dark:text-[#A7B3C5]">
                        {user.role === 'RESEARCH_SCHOLAR' ? (
                          user.supervisor ? (
                            <span className="font-semibold text-slate-800 dark:text-[#F5F7FA]">
                              {user.supervisor.name || user.supervisor.email}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No Supervisor</span>
                          )
                        ) : user.role === 'RESEARCH_SUPERVISOR' ? (
                          <span className="font-bold text-teal-600 dark:text-teal-400">
                            {user._count?.scholars ?? 0} Scholars
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-4 text-slate-400 dark:text-[#718096] text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Button */}
                          <button
                            onClick={() => openUserDrawer(user.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#132238] hover:bg-slate-200 dark:hover:bg-[#1c3254] transition-colors cursor-pointer"
                            title="Inspect User Governance Profile"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            <span>View</span>
                          </button>

                          {/* Affiliation Button */}
                          <button
                            onClick={() => openAffiliationModal(user)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer border border-indigo-200/80 dark:border-indigo-800/50"
                            title="Manage Faculty & Department Affiliation"
                          >
                            <Building className="w-3.5 h-3.5" />
                            <span>Affiliation</span>
                          </button>

                          {/* Reassign Supervisor (Scholars only) */}
                          {user.role === 'RESEARCH_SCHOLAR' && (
                            <button
                              onClick={() => openReassignSupervisorModal(user)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#0C4DA2]/10 text-[#0C4DA2] dark:bg-blue-600/20 dark:text-[#3B82F6] hover:bg-[#0C4DA2]/20 transition-colors cursor-pointer"
                              title="Reassign Supervisor"
                            >
                              Reassign
                            </button>
                          )}

                          {/* Suspend / Reactivate */}
                          {isSuspended ? (
                            <button
                              onClick={() => setActionModal({ type: 'REACTIVATE', user })}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Reactivate Account"
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => setActionModal({ type: 'SUSPEND', user })}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                              title="Suspend Account"
                            >
                              Suspend
                            </button>
                          )}

                          {/* Delete User Action */}
                          <button
                            onClick={() => {
                              setActionModal({ type: 'DELETE', user });
                              setActionReason('');
                            }}
                            disabled={isSuperadmin || isSelf}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                            title={
                              isSelf
                                ? 'Cannot delete your own account'
                                : isSuperadmin
                                ? 'Superadmin account is protected'
                                : 'Permanently Delete User'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="py-3 px-4 bg-slate-50/70 dark:bg-[#0B1728] border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-500 dark:text-[#A7B3C5]">
            <span>
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, pagination.total)} of{' '}
              {pagination.total} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#07111F] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-black text-slate-800 dark:text-[#F5F7FA]">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#07111F] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* USER GOVERNANCE DETAIL DRAWER */}
      <AnimatePresence>
        {selectedUserId && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserId(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: 500 }}
              animate={{ x: 0 }}
              exit={{ x: 500 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg h-full bg-white dark:bg-[#07111F] shadow-2xl border-l border-slate-200/80 dark:border-white/[0.08] flex flex-col z-10"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0C4DA2]/10 text-[#0C4DA2] dark:bg-blue-600/20 dark:text-[#3B82F6] flex items-center justify-center font-bold">
                    <UserCog className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-[#F5F7FA]">
                      User Governance Profile
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-[#718096]">
                      Institutional Identity & Audited Record
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {userProfile?.user?.id && (
                    <a
                      href={`/researchers/${userProfile.user.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#0C4DA2] dark:text-[#3B82F6] bg-[#0C4DA2]/10 dark:bg-blue-600/15 hover:bg-[#0C4DA2]/20 transition-colors"
                      title="Open Public Researcher Profile"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Public Profile</span>
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#132238] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Subtabs */}
              <div className="flex border-b border-slate-100 dark:border-white/[0.08] px-5 gap-4 text-xs font-bold">
                {['ACCOUNT', 'RESEARCH', 'GOVERNANCE'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setProfileTab(tab as any)}
                    className={cn(
                      'py-2.5 border-b-2 transition-colors cursor-pointer',
                      profileTab === tab
                        ? 'border-[#0C4DA2] text-[#0C4DA2] dark:border-[#3B82F6] dark:text-[#3B82F6] font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Drawer Content Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
                {profileLoading || !userProfile ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0C4DA2]" />
                    <p className="text-xs font-bold">Loading user governance record...</p>
                  </div>
                ) : (
                  <>
                    {/* Hero Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1728] border border-slate-200/80 dark:border-white/[0.08] flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
                        <img
                          src={getProfileImageUrl(userProfile.user)}
                          alt={userProfile.user.name || 'User'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-slate-900 dark:text-[#F5F7FA] truncate">
                          {userProfile.user.name || 'Unnamed User'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-[#A7B3C5] truncate">
                          {userProfile.user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                            {userProfile.user.role}
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',
                              userProfile.user.status === 'SUSPENDED' || userProfile.user.suspended
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            )}
                          >
                            {userProfile.user.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {profileTab === 'ACCOUNT' && (
                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white dark:bg-[#07111F] border border-slate-200/80 dark:border-white/[0.08] rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Faculty / College</span>
                            <span className="font-bold text-slate-800 dark:text-[#F5F7FA]">
                              {userProfile.user.departmentRef?.faculty?.name || userProfile.user.faculty || 'SRMIST'}
                            </span>
                          </div>
                          <div className="p-3 bg-white dark:bg-[#07111F] border border-slate-200/80 dark:border-white/[0.08] rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Department</span>
                            <span className="font-bold text-slate-800 dark:text-[#F5F7FA]">
                              {userProfile.user.departmentRef?.name || userProfile.user.department || '—'}
                            </span>
                            {!userProfile.user.departmentId && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 mt-1">
                                No Relational Affiliation
                              </span>
                            )}
                          </div>
                          <div className="p-3 bg-white dark:bg-[#07111F] border border-slate-200/80 dark:border-white/[0.08] rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Employee / Reg ID</span>
                            <span className="font-bold text-slate-800 dark:text-[#F5F7FA]">
                              {userProfile.user.employeeId || 'Not Assigned'}
                            </span>
                          </div>
                          <div className="p-3 bg-white dark:bg-[#07111F] border border-slate-200/80 dark:border-white/[0.08] rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Joined Platform</span>
                            <span className="font-bold text-slate-800 dark:text-[#F5F7FA]">
                              {new Date(userProfile.user.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Quick Administrative Action Trigger Buttons */}
                        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08] space-y-2">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                            Governance Interventions
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openAffiliationModal(userProfile.user)}
                              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-900/60 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <Building className="w-3.5 h-3.5" />
                              <span>Update Affiliation</span>
                            </button>
                            {userProfile.user.role === 'RESEARCH_SCHOLAR' && (
                              <button
                                onClick={() => openReassignSupervisorModal(userProfile.user)}
                                className="px-3 py-2 rounded-xl bg-[#0C4DA2]/10 hover:bg-[#0C4DA2]/20 text-[#0C4DA2] dark:bg-blue-600/20 dark:text-[#3B82F6] font-bold text-xs cursor-pointer"
                              >
                                Reassign Supervisor
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setActionModal({ type: 'CHANGE_ROLE', user: userProfile.user });
                                setNewRole(userProfile.user.role);
                                setActionReason('');
                              }}
                              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#132238] dark:hover:bg-[#172a44] text-slate-800 dark:text-[#F5F7FA] font-bold text-xs cursor-pointer"
                            >
                              Change Role
                            </button>
                            {userProfile.user.status === 'SUSPENDED' || userProfile.user.suspended ? (
                              <button
                                onClick={() => setActionModal({ type: 'REACTIVATE', user: userProfile.user })}
                                className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs cursor-pointer"
                              >
                                Reactivate Account
                              </button>
                            ) : (
                              <button
                                onClick={() => setActionModal({ type: 'SUSPEND', user: userProfile.user })}
                                className="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs cursor-pointer"
                              >
                                Suspend Account
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setActionModal({ type: 'DELETE', user: userProfile.user });
                                setActionReason('');
                              }}
                              disabled={
                                userProfile.user.email?.toLowerCase() === 'r.matheshwaran.io@gmail.com' ||
                                userProfile.user.id === currentUser?.id
                              }
                              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete User</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {profileTab === 'RESEARCH' && (
                      <div className="space-y-4 text-xs">
                        {userProfile.user.role === 'RESEARCH_SCHOLAR' && (
                          <div className="p-3.5 bg-slate-50 dark:bg-[#0B1728] rounded-xl border border-slate-200/80 dark:border-white/[0.08] space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Supervisor</span>
                            {userProfile.user.supervisor ? (
                              <div className="font-bold text-slate-900 dark:text-[#F5F7FA]">
                                {userProfile.user.supervisor.name || 'Unnamed'} ({userProfile.user.supervisor.email})
                              </div>
                            ) : (
                              <p className="text-slate-400 italic">No supervisor currently assigned.</p>
                            )}
                          </div>
                        )}

                        {userProfile.user.role === 'RESEARCH_SUPERVISOR' && (
                          <div className="p-3.5 bg-slate-50 dark:bg-[#0B1728] rounded-xl border border-slate-200/80 dark:border-white/[0.08] space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Supervised Scholars ({userProfile.user.scholars?.length || 0})
                            </span>
                            {userProfile.user.scholars && userProfile.user.scholars.length > 0 ? (
                              <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                                {userProfile.user.scholars.map((s: any) => (
                                  <div key={s.id} className="py-1.5 flex items-center justify-between">
                                    <span className="font-bold text-slate-800 dark:text-[#F5F7FA]">{s.name || s.email}</span>
                                    <span className="text-[10px] font-bold text-slate-400">{s.department || 'SRMIST'}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-400 italic">No scholars currently assigned.</p>
                            )}
                          </div>
                        )}

                        {/* Recent Publications */}
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                            Recent Publications ({userProfile.user._count?.publications || 0})
                          </h4>
                          {userProfile.user.publications && userProfile.user.publications.length > 0 ? (
                            <div className="space-y-1.5">
                              {userProfile.user.publications.map((p: any) => (
                                <div
                                  key={p.id}
                                  className="p-2.5 bg-white dark:bg-[#07111F] border border-slate-200/80 dark:border-white/[0.08] rounded-xl"
                                >
                                  <p className="font-bold text-slate-800 dark:text-[#F5F7FA] truncate">{p.title}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{p.publisher || 'Published'} • {p.year}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">No publications authored yet.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {profileTab === 'GOVERNANCE' && (
                      <div className="space-y-3 text-xs">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                          Audit Trail & Governance Events
                        </h4>
                        {userProfile.auditLogs && userProfile.auditLogs.length > 0 ? (
                          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                            {userProfile.auditLogs.map((log: any) => (
                              <div key={log.id} className="py-2.5 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800 dark:text-[#F5F7FA]">{log.action}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(log.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-[#A7B3C5] leading-relaxed">
                                  {log.details || 'No additional details.'}
                                </p>
                                <div className="text-[10px] text-slate-400">
                                  Actor: {log.actorEmail || 'System'}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">No governance events recorded for this user.</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACTION CONFIRMATION MODALS WITH MANDATORY AUDIT REASON */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#07111F] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-[#F5F7FA]">
              <AlertTriangle
                className={cn(
                  'w-5 h-5 shrink-0',
                  actionModal.type === 'DELETE' ? 'text-rose-500' : 'text-amber-500'
                )}
              />
              <h3 className="text-base font-black">
                {actionModal.type === 'SUSPEND' && 'Suspend User Account'}
                {actionModal.type === 'REACTIVATE' && 'Reactivate User Account'}
                {actionModal.type === 'DEACTIVATE' && 'Deactivate User Account'}
                {actionModal.type === 'CHANGE_ROLE' && 'Change User Role'}
                {actionModal.type === 'REASSIGN_SUPERVISOR' && 'Reassign Supervisor'}
                {actionModal.type === 'DELETE' && 'Permanently Delete User'}
              </h3>
            </div>

            {actionModal.type === 'DELETE' ? (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl space-y-1 text-xs text-rose-800 dark:text-rose-200">
                <p className="font-bold">Warning: This action is permanent and irreversible.</p>
                <p className="text-[11px] leading-relaxed">
                  The account for <strong>{actionModal.user.name || actionModal.user.email}</strong> will be permanently deleted from the database. Any supervised scholars will be detached. This administrative action will be recorded in the audit trail.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-[#A7B3C5] leading-relaxed">
                Target User: <strong className="text-slate-900 dark:text-[#F5F7FA]">{actionModal.user.name || actionModal.user.email}</strong>
                <br />
                This administrative action is authoritative and will be permanently recorded in the institutional audit log.
              </p>
            )}

            <form onSubmit={handleActionSubmit} className="space-y-3.5">
              {actionModal.type === 'CHANGE_ROLE' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Select New Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[#0B1728] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-[#F5F7FA]"
                  >
                    <option value="RESEARCH_SCHOLAR">Research Scholar</option>
                    <option value="RESEARCH_SUPERVISOR">Research Supervisor</option>
                    <option value="INSTITUTE_ADMIN">Institute Admin</option>
                  </select>
                </div>
              )}

              {actionModal.type === 'REASSIGN_SUPERVISOR' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Select New Supervisor
                  </label>
                  <select
                    value={newSupervisorId}
                    onChange={(e) => setNewSupervisorId(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-[#0B1728] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-[#F5F7FA]"
                  >
                    <option value="">-- Choose Supervisor --</option>
                    {supervisorsList.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name || sup.email} ({sup.department || 'SRMIST'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Mandatory Reason for Audit Log <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={
                    actionModal.type === 'DELETE'
                      ? 'State the reason for permanently deleting this user account...'
                      : 'Explain why this administrative intervention is being made...'
                  }
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0B1728] border border-slate-200 dark:border-white/[0.08] rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-[#F5F7FA] focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#132238] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting || !actionReason.trim()}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-extrabold text-white transition-all disabled:opacity-50 cursor-pointer',
                    actionModal.type === 'DELETE'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-[#0C4DA2] hover:bg-[#042654] dark:bg-[#2563EB]'
                  )}
                >
                  {actionSubmitting
                    ? 'Processing...'
                    : actionModal.type === 'DELETE'
                    ? 'Permanently Delete User'
                    : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER AFFILIATION MANAGEMENT MODAL */}
      {affiliationUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#07111F] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-[#F5F7FA]">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black">Manage Institutional Affiliation</h3>
                <p className="text-[11px] text-slate-400 dark:text-[#718096]">
                  Assign authoritative Faculty / College and Department
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-[#A7B3C5] leading-relaxed">
              Target User: <strong className="text-slate-900 dark:text-[#F5F7FA]">{affiliationUser.name || affiliationUser.email}</strong>
              <br />
              <span className="text-[11px] text-slate-400">
                Current Affiliation: {affiliationUser.departmentRef?.faculty?.name || affiliationUser.faculty || 'Unassigned'} / {affiliationUser.departmentRef?.name || affiliationUser.department || 'Unassigned'}
              </span>
            </p>

            <form onSubmit={handleAffiliationSubmit} className="space-y-3.5">
              {/* Faculty Dropdown */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Faculty / College <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modalFacultyId}
                  onChange={(e) => {
                    const newFacId = e.target.value;
                    setModalFacultyId(newFacId);
                    setModalDeptId(''); // Cascade reset on faculty change
                  }}
                  required
                  className="w-full bg-slate-50 dark:bg-[#0B1728] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-[#F5F7FA] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- Choose Faculty / College --</option>
                  {faculties.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Dropdown (Filtered by selected Faculty) */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modalDeptId}
                  onChange={(e) => setModalDeptId(e.target.value)}
                  disabled={!modalFacultyId}
                  required
                  className="w-full bg-slate-50 dark:bg-[#0B1728] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-[#F5F7FA] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {modalFacultyId ? '-- Choose Department --' : 'Select Faculty First'}
                  </option>
                  {availableModalDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code ? `${d.code} - ` : ''}{d.name}
                    </option>
                  ))}
                </select>
                {modalFacultyId && availableModalDepartments.length === 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                    No departments configured under this faculty yet.
                  </p>
                )}
              </div>

              {/* Reason for Audit Log */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Reason for Affiliation Change <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g., Departmental transfer, initial institutional onboarding, correction..."
                  value={modalAffiliationReason}
                  onChange={(e) => setModalAffiliationReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0B1728] border border-slate-200 dark:border-white/[0.08] rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-[#F5F7FA] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAffiliationUser(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#132238] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={affiliationSubmitting || !modalFacultyId || !modalDeptId || !modalAffiliationReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {affiliationSubmitting ? 'Saving...' : 'Save Affiliation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#0C4DA2] animate-spin" />
        </div>
      }
    >
      <AdminUsersContent />
    </Suspense>
  );
}
