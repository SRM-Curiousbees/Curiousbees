'use client';

/**
 * People & access: every provisioned account, filtered by role or status.
 * Admin actions (affiliation, supervisor, role, suspension, deletion) require a
 * reason that the API records in the audit log; permissions are enforced server-side.
 */

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Ban,
  Building,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  GraduationCap,
  History,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProfileImageUrl } from '@/lib/avatar';
import { PageHeader } from '@/components/ui/page-header';
import { Button, IconButton, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { ActionMenu } from '@/components/ui/action-menu';
import { Field, DetailItem } from '@/components/ui/field';
import { RoleBadge } from '@/components/shared/role-badge';

type UserTab = 'ALL' | 'SCHOLARS' | 'SUPERVISORS' | 'ADMINS' | 'SUSPENDED';
type ActionType = 'SUSPEND' | 'REACTIVATE' | 'DEACTIVATE' | 'CHANGE_ROLE' | 'REASSIGN_SUPERVISOR' | 'DELETE';

const TABS: { id: UserTab; label: string; title: string; noun: string; description: string; icon: React.ElementType }[] = [
  { id: 'ALL', label: 'All users', title: 'Users', noun: 'users', description: 'Every account provisioned for the institution.', icon: Users },
  { id: 'SCHOLARS', label: 'Scholars', title: 'Scholars', noun: 'scholars', description: 'Research scholars, their departments and supervisors.', icon: GraduationCap },
  { id: 'SUPERVISORS', label: 'Supervisors', title: 'Supervisors', noun: 'supervisors', description: 'Research supervisors and the scholars they supervise.', icon: UserCheck },
  { id: 'ADMINS', label: 'Administrators', title: 'Administrators', noun: 'administrators', description: 'Institute administrators with access to this console.', icon: Shield },
  { id: 'SUSPENDED', label: 'Suspended', title: 'Suspended accounts', noun: 'suspended accounts', description: 'Accounts that cannot sign in until they are reactivated.', icon: ShieldAlert },
];

const PROFILE_TABS: { id: 'ACCOUNT' | 'RESEARCH' | 'GOVERNANCE'; label: string }[] = [
  { id: 'ACCOUNT', label: 'Account' },
  { id: 'RESEARCH', label: 'Research' },
  { id: 'GOVERNANCE', label: 'Audit history' },
];

const ACTION_COPY: Record<ActionType, { title: string; confirm: string }> = {
  SUSPEND: { title: 'Suspend account', confirm: 'Suspend account' },
  REACTIVATE: { title: 'Reactivate account', confirm: 'Reactivate account' },
  DEACTIVATE: { title: 'Deactivate account', confirm: 'Deactivate account' },
  CHANGE_ROLE: { title: 'Change role', confirm: 'Change role' },
  REASSIGN_SUPERVISOR: { title: 'Reassign supervisor', confirm: 'Reassign supervisor' },
  DELETE: { title: 'Delete user permanently', confirm: 'Delete permanently' },
};

function formatDate(value?: string) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function formatDateTime(value?: string) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime())
    ? d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
}

/** USER_SUSPENDED -> "User suspended" */
function humanize(value?: string) {
  const v = (value || '').toLowerCase().replace(/_/g, ' ').trim();
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : 'Update';
}

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

  const tabParam = searchParams.get('tab') as UserTab;
  const initialTab: UserTab = TABS.some((t) => t.id === tabParam) ? tabParam : 'ALL';
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
  const [actionModal, setActionModal] = useState<{ type: ActionType; user: any } | null>(null);
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

  // The URL is the source of truth for the tab, so the sidebar highlight and
  // shared links always match what is shown.
  useEffect(() => {
    const tabParam = ((searchParams.get('tab') as UserTab) || 'ALL');
    if (TABS.some((t) => t.id === tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
      setPage(1);
    }
  }, [searchParams]);

  const selectTab = (tab: UserTab) => {
    setActiveTab(tab);
    setPage(1);
    router.replace(tab === 'ALL' ? '/admin/users' : `/admin/users?tab=${tab}`, { scroll: false });
  };

  const openAction = (type: ActionType, user: any) => {
    setActionReason('');
    setActionModal({ type, user });
  };

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

  const tabMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const actionTitle = actionModal ? ACTION_COPY[actionModal.type].title : '';
  const isDeleteAction = actionModal?.type === 'DELETE';
  const drawerUser = userProfile?.user;
  const drawerSuspended = drawerUser && (drawerUser.status === 'SUSPENDED' || drawerUser.suspended);
  const firstRow = (page - 1) * limit + 1;
  const lastRow = Math.min(page * limit, pagination.total);

  return (
    <div className="animate-fade-in">
      <PageHeader
        meta="People & access"
        title={tabMeta.title}
        description={tabMeta.description}
      />

      <div role="tablist" aria-label="Account type" className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(tab.id)}
              className={cn(
                '-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition-colors duration-fast',
                isActive
                  ? 'border-brand font-medium text-ink'
                  : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              <tab.icon className="size-4" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearchSubmit} role="search" className="relative w-full lg:max-w-xs">
            <label htmlFor="user-search" className="sr-only">
              Search users
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              id="user-search"
              type="search"
              placeholder="Search name, email or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="cb-input pl-9"
            />
          </form>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <label className="sr-only" htmlFor="filter-faculty">
              Faculty
            </label>
            <select
              id="filter-faculty"
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
              className="cb-input col-span-2 sm:col-span-1 sm:w-48"
            >
              <option value="ALL">All faculties</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="filter-department">
              Department
            </label>
            <select
              id="filter-department"
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="cb-input col-span-2 sm:col-span-1 sm:w-48"
            >
              <option value="ALL">All departments</option>
              {availableFilterDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code ? `${d.code} - ` : ''}
                  {d.name}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="sort-users">
              Sort by
            </label>
            <select id="sort-users" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="cb-input sm:w-36">
              <option value="createdAt">Date joined</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="department">Department</option>
            </select>

            <Button
              variant="secondary"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              aria-label={sortOrder === 'asc' ? 'Sorted ascending. Switch to descending' : 'Sorted descending. Switch to ascending'}
              title="Toggle sort order"
            >
              {sortOrder === 'asc' ? <ArrowUpNarrowWide aria-hidden /> : <ArrowDownWideNarrow aria-hidden />}
              <span className="sm:sr-only">{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div role="status" aria-label="Loading users" className="divide-y divide-line">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search || facultyFilter !== 'ALL' || deptFilter !== 'ALL' ? 'No users match these filters' : `No ${tabMeta.noun} yet`}
            description={
              search || facultyFilter !== 'ALL' || deptFilter !== 'ALL'
                ? 'Try a different search, or clear the faculty and department filters.'
                : 'Accounts appear here once they are provisioned for the institution.'
            }
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{tabMeta.title}</caption>
              <thead>
                <tr className="border-b border-line bg-surface-muted text-xs font-medium text-ink-secondary">
                  <th scope="col" className="px-4 py-2.5 font-medium">Name</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Role</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">Department</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Status</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium xl:table-cell">Supervision</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium xl:table-cell">Joined</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => {
                  const isSuspended = user.status === 'SUSPENDED' || user.suspended;
                  const isSelf = user.id === currentUser?.id;
                  const needsAffiliation =
                    (user.role === 'RESEARCH_SCHOLAR' || user.role === 'RESEARCH_SUPERVISOR') && !user.departmentId;
                  const displayName = user.name || user.email;

                  return (
                    <tr key={user.id} className="transition-colors duration-fast hover:bg-surface-muted">
                      <td className="max-w-[16rem] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={getProfileImageUrl(user)}
                            alt=""
                            className="size-9 shrink-0 rounded-full border border-line bg-surface-muted object-cover"
                          />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => openUserDrawer(user.id)}
                              className="block max-w-full truncate text-left font-medium text-ink hover:text-brand hover:underline"
                            >
                              {user.name || 'Unnamed user'}
                            </button>
                            <p className="truncate text-xs text-ink-muted">{user.email}</p>
                            <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                              <RoleBadge role={user.role} />
                              <StatusBadge status={isSuspended ? 'SUSPENDED' : user.status} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="hidden max-w-[14rem] px-4 py-3 lg:table-cell">
                        <p className="truncate text-ink">{user.departmentRef?.name || user.department || '—'}</p>
                        <p className="truncate text-xs text-ink-muted">{user.departmentRef?.faculty?.name || user.faculty || ''}</p>
                        {needsAffiliation && (
                          <Badge tone="warning" className="mt-1">
                            No department assigned
                          </Badge>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <StatusBadge status={isSuspended ? 'SUSPENDED' : user.status} />
                      </td>
                      <td className="hidden px-4 py-3 text-ink-secondary xl:table-cell">
                        {user.role === 'RESEARCH_SCHOLAR' ? (
                          user.supervisor ? (
                            <span className="text-ink">{user.supervisor.name || user.supervisor.email}</span>
                          ) : (
                            <span className="text-ink-muted">No supervisor</span>
                          )
                        ) : user.role === 'RESEARCH_SUPERVISOR' ? (
                          <span className="tabular-nums">
                            {user._count?.scholars ?? 0} {(user._count?.scholars ?? 0) === 1 ? 'scholar' : 'scholars'}
                          </span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-ink-muted xl:table-cell">
                        <time dateTime={user.createdAt}>{formatDate(user.createdAt)}</time>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hidden sm:inline-flex"
                            onClick={() => openUserDrawer(user.id)}
                            aria-label={`View ${displayName}`}
                          >
                            View
                          </Button>
                          <ActionMenu
                            label={`Actions for ${displayName}`}
                            items={[
                              { label: 'View details', icon: Eye, onSelect: () => openUserDrawer(user.id) },
                              { label: 'Edit affiliation', icon: Building, onSelect: () => openAffiliationModal(user) },
                              ...(user.role === 'RESEARCH_SCHOLAR'
                                ? [{ label: 'Reassign supervisor', icon: UserCog, onSelect: () => openReassignSupervisorModal(user) }]
                                : []),
                              isSuspended
                                ? { label: 'Reactivate account', icon: CheckCircle, onSelect: () => openAction('REACTIVATE', user) }
                                : { label: 'Suspend account', icon: Ban, onSelect: () => openAction('SUSPEND', user) },
                              'separator',
                              {
                                label: 'Delete user',
                                icon: Trash2,
                                tone: 'danger',
                                disabled: isSelf,
                                hint: isSelf ? 'You cannot delete your own account' : undefined,
                                onSelect: () => openAction('DELETE', user),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-line px-4 py-3 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
            <span>
              {pagination.total > 0 ? (
                <>
                  Showing <span className="tabular-nums text-ink">{firstRow}–{lastRow}</span> of{' '}
                  <span className="tabular-nums text-ink">{pagination.total}</span>
                </>
              ) : null}
            </span>
            {pagination.totalPages > 1 && (
              <nav aria-label="Pagination" className="flex items-center gap-2">
                <IconButton label="Previous page" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft />
                </IconButton>
                <span className="tabular-nums text-ink">
                  Page {page} of {pagination.totalPages}
                </span>
                <IconButton label="Next page" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight />
                </IconButton>
              </nav>
            )}
          </div>
        )}
      </Card>

      {/* User details */}
      <Dialog
        open={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        side="right"
        title="User details"
        description="Account, research and audit history. Every change is recorded in the audit log."
      >
        {profileLoading || !drawerUser ? (
          <div role="status" aria-label="Loading user" className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3.5">
              <img
                src={getProfileImageUrl(drawerUser)}
                alt=""
                className="size-12 shrink-0 rounded-full border border-line bg-surface-muted object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-ink">{drawerUser.name || 'Unnamed user'}</p>
                <p className="truncate text-sm text-ink-muted">{drawerUser.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <RoleBadge role={drawerUser.role} />
                  <StatusBadge status={drawerSuspended ? 'SUSPENDED' : drawerUser.status} />
                </div>
              </div>
              <a
                href={`/researchers/${drawerUser.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'shrink-0')}
              >
                Profile
                <ExternalLink aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>

            <div role="tablist" aria-label="User details" className="flex gap-1 border-b border-line">
              {PROFILE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={profileTab === tab.id}
                  onClick={() => setProfileTab(tab.id)}
                  className={cn(
                    '-mb-px h-9 border-b-2 px-3 text-sm transition-colors duration-fast',
                    profileTab === tab.id
                      ? 'border-brand font-medium text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {profileTab === 'ACCOUNT' && (
              <div className="space-y-5">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <DetailItem label="Faculty">{drawerUser.departmentRef?.faculty?.name || drawerUser.faculty || '—'}</DetailItem>
                  <DetailItem label="Department">
                    {drawerUser.departmentRef?.name || drawerUser.department || '—'}
                    {!drawerUser.departmentId && (
                      <Badge tone="warning" className="mt-1 block w-fit">
                        Not linked to a department
                      </Badge>
                    )}
                  </DetailItem>
                  <DetailItem label="Employee / registration ID">{drawerUser.employeeId || 'Not assigned'}</DetailItem>
                  <DetailItem label="Joined">{formatDate(drawerUser.createdAt)}</DetailItem>
                </dl>

                <section aria-labelledby="user-admin-actions" className="space-y-2.5 border-t border-line pt-4">
                  <h3 id="user-admin-actions" className="text-sm font-semibold text-ink">
                    Administrative actions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openAffiliationModal(drawerUser)}>
                      <Building aria-hidden />
                      Edit affiliation
                    </Button>
                    {drawerUser.role === 'RESEARCH_SCHOLAR' && (
                      <Button variant="secondary" size="sm" onClick={() => openReassignSupervisorModal(drawerUser)}>
                        <UserCog aria-hidden />
                        Reassign supervisor
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setNewRole(drawerUser.role);
                        openAction('CHANGE_ROLE', drawerUser);
                      }}
                    >
                      <Shield aria-hidden />
                      Change role
                    </Button>
                    {drawerSuspended ? (
                      <Button variant="secondary" size="sm" onClick={() => openAction('REACTIVATE', drawerUser)}>
                        <CheckCircle aria-hidden />
                        Reactivate account
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => openAction('SUSPEND', drawerUser)}>
                        <Ban aria-hidden />
                        Suspend account
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-danger-700 hover:border-danger-300 hover:bg-danger-50"
                      disabled={drawerUser.id === currentUser?.id}
                      title={drawerUser.id === currentUser?.id ? 'You cannot delete your own account' : undefined}
                      onClick={() => openAction('DELETE', drawerUser)}
                    >
                      <Trash2 aria-hidden />
                      Delete user
                    </Button>
                  </div>
                </section>
              </div>
            )}

            {profileTab === 'RESEARCH' && (
              <div className="space-y-5 text-sm">
                {drawerUser.role === 'RESEARCH_SCHOLAR' && (
                  <section className="space-y-1">
                    <h3 className="text-xs text-ink-muted">Supervisor</h3>
                    {drawerUser.supervisor ? (
                      <p className="font-medium text-ink">
                        {drawerUser.supervisor.name || 'Unnamed'}{' '}
                        <span className="font-normal text-ink-muted">· {drawerUser.supervisor.email}</span>
                      </p>
                    ) : (
                      <p className="text-ink-muted">No supervisor assigned.</p>
                    )}
                  </section>
                )}

                {drawerUser.role === 'RESEARCH_SUPERVISOR' && (
                  <section className="space-y-2">
                    <h3 className="text-xs text-ink-muted">Supervised scholars ({drawerUser.scholars?.length || 0})</h3>
                    {drawerUser.scholars && drawerUser.scholars.length > 0 ? (
                      <ul className="divide-y divide-line rounded-xl border border-line">
                        {drawerUser.scholars.map((s: any) => (
                          <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                            <span className="truncate font-medium text-ink">{s.name || s.email}</span>
                            {s.department && <span className="shrink-0 text-xs text-ink-muted">{s.department}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-ink-muted">No scholars assigned.</p>
                    )}
                  </section>
                )}

                <section className="space-y-2">
                  <h3 className="text-xs text-ink-muted">Recent publications ({drawerUser._count?.publications || 0})</h3>
                  {drawerUser.publications && drawerUser.publications.length > 0 ? (
                    <ul className="divide-y divide-line rounded-xl border border-line">
                      {drawerUser.publications.map((p: any) => (
                        <li key={p.id} className="px-3 py-2.5">
                          <p className="font-medium text-ink">{p.title}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">{[p.publisher, p.year].filter(Boolean).join(' · ')}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-ink-muted">No publications recorded.</p>
                  )}
                </section>
              </div>
            )}

            {profileTab === 'GOVERNANCE' && (
              <div className="text-sm">
                {userProfile.auditLogs && userProfile.auditLogs.length > 0 ? (
                  <ol className="space-y-4">
                    {userProfile.auditLogs.map((log: any) => (
                      <li key={log.id} className="relative border-l-2 border-line pl-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="font-medium text-ink">{humanize(log.action)}</span>
                          <time dateTime={log.createdAt} className="text-xs text-ink-muted">
                            {formatDateTime(log.createdAt)}
                          </time>
                        </div>
                        {log.details && <p className="mt-0.5 text-ink-secondary">{log.details}</p>}
                        <p className="mt-0.5 text-xs text-ink-muted">By {log.actorEmail || 'System'}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState icon={History} title="No recorded changes" description="Administrative changes to this account will be listed here." className="py-8" />
                )}
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Administrative action, with mandatory audit reason */}
      <Dialog
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        dismissible={!actionSubmitting}
        size="md"
        title={actionTitle}
        description={
          actionModal
            ? isDeleteAction
              ? undefined
              : `${actionModal.user.name || actionModal.user.email} · the reason is recorded in the audit log.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setActionModal(null)} disabled={actionSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="user-action-form"
              variant={isDeleteAction ? 'danger' : 'primary'}
              loading={actionSubmitting}
              disabled={!actionReason.trim() || (actionModal?.type === 'REASSIGN_SUPERVISOR' && !newSupervisorId)}
            >
              {actionModal ? ACTION_COPY[actionModal.type].confirm : 'Confirm'}
            </Button>
          </>
        }
      >
        {actionModal && (
          <form id="user-action-form" onSubmit={handleActionSubmit} className="space-y-4">
            {isDeleteAction && (
              <div role="alert" className="flex gap-3 rounded-xl border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger-600" aria-hidden />
                <p>
                  <strong className="font-semibold">{actionModal.user.name || actionModal.user.email}</strong> will be permanently
                  deleted. Supervised scholars are detached from this account. This cannot be undone.
                </p>
              </div>
            )}

            {actionModal.type === 'CHANGE_ROLE' && (
              <Field label="New role" htmlFor="action-role">
                <select id="action-role" value={newRole} onChange={(e) => setNewRole(e.target.value as any)} className="cb-input">
                  <option value="RESEARCH_SCHOLAR">Research Scholar</option>
                  <option value="RESEARCH_SUPERVISOR">Research Supervisor</option>
                  <option value="INSTITUTE_ADMIN">Institute Admin</option>
                </select>
              </Field>
            )}

            {actionModal.type === 'REASSIGN_SUPERVISOR' && (
              <Field label="New supervisor" htmlFor="action-supervisor" required>
                <select
                  id="action-supervisor"
                  value={newSupervisorId}
                  onChange={(e) => setNewSupervisorId(e.target.value)}
                  required
                  className="cb-input"
                >
                  <option value="">Choose a supervisor</option>
                  {supervisorsList.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name || sup.email}
                      {sup.department ? ` (${sup.department})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Reason" htmlFor="action-reason" required hint="Recorded in the audit log with your name.">
              <textarea
                id="action-reason"
                required
                rows={3}
                placeholder={isDeleteAction ? 'Why is this account being deleted?' : 'Why is this change being made?'}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="cb-input resize-y"
              />
            </Field>
          </form>
        )}
      </Dialog>

      {/* Faculty and department affiliation */}
      <Dialog
        open={!!affiliationUser}
        onClose={() => setAffiliationUser(null)}
        dismissible={!affiliationSubmitting}
        size="md"
        title="Edit affiliation"
        description={
          affiliationUser
            ? `${affiliationUser.name || affiliationUser.email} · currently ${
                affiliationUser.departmentRef?.name || affiliationUser.department || 'no department'
              }${
                affiliationUser.departmentRef?.faculty?.name || affiliationUser.faculty
                  ? `, ${affiliationUser.departmentRef?.faculty?.name || affiliationUser.faculty}`
                  : ''
              }`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setAffiliationUser(null)} disabled={affiliationSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="user-affiliation-form"
              loading={affiliationSubmitting}
              disabled={!modalFacultyId || !modalDeptId || !modalAffiliationReason.trim()}
            >
              Save affiliation
            </Button>
          </>
        }
      >
        <form id="user-affiliation-form" onSubmit={handleAffiliationSubmit} className="space-y-4">
          <Field label="Faculty" htmlFor="aff-faculty" required>
            <select
              id="aff-faculty"
              value={modalFacultyId}
              onChange={(e) => {
                setModalFacultyId(e.target.value);
                setModalDeptId(''); // departments depend on the faculty
              }}
              required
              className="cb-input"
            >
              <option value="">Choose a faculty</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Department"
            htmlFor="aff-department"
            required
            error={modalFacultyId && availableModalDepartments.length === 0 ? 'No departments are set up under this faculty yet.' : undefined}
          >
            <select
              id="aff-department"
              value={modalDeptId}
              onChange={(e) => setModalDeptId(e.target.value)}
              disabled={!modalFacultyId}
              required
              className="cb-input"
            >
              <option value="">{modalFacultyId ? 'Choose a department' : 'Choose a faculty first'}</option>
              {availableModalDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code ? `${d.code} - ` : ''}
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reason" htmlFor="aff-reason" required hint="For example: department transfer, onboarding or a correction.">
            <textarea
              id="aff-reason"
              required
              rows={2}
              value={modalAffiliationReason}
              onChange={(e) => setModalAffiliationReason(e.target.value)}
              className="cb-input resize-y"
            />
          </Field>
        </form>
      </Dialog>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Loading users" className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      }
    >
      <AdminUsersContent />
    </Suspense>
  );
}
