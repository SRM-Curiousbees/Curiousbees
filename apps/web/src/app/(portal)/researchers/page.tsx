'use client';

import React, { useState, useEffect } from 'react';
import { useResearchers } from '@/hooks/useResearchers';
import { useStore } from '@/store/useStore';
import { apiFetch } from '@/lib/api-client';
import { Search, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getProfileImageUrl, handleAvatarError } from '@/lib/avatar';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const isSupervisorRole = (role?: string) => role === 'RESEARCH_SUPERVISOR' || role === 'SUPERVISOR';

function ResearcherCard({ researcher }: { researcher: any }) {
  const supervisor = isSupervisorRole(researcher.role);
  const dept = researcher.departmentRef?.name || researcher.department;
  const faculty = researcher.departmentRef?.faculty?.name;
  return (
    <Link
      href={`/researchers/${researcher.id}`}
      className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-xs transition-[border-color,box-shadow] duration-base hover:border-line-strong hover:shadow-md"
    >
      <div className="flex items-start gap-3.5">
        <img
          src={getProfileImageUrl(researcher)}
          alt=""
          referrerPolicy="no-referrer"
          onError={(e) => handleAvatarError(e, researcher.name)}
          className="size-12 shrink-0 rounded-full border border-line bg-surface-muted object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink group-hover:text-brand">{researcher.name}</p>
          <p className="mt-0.5 truncate text-sm text-ink-muted">{[dept, faculty].filter(Boolean).join(' · ') || (supervisor ? 'Research supervisor' : 'Research scholar')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={supervisor ? 'warning' : 'brand'}>{supervisor ? 'Supervisor' : 'Scholar'}</Badge>
            {supervisor &&
              researcher.maxScholars != null &&
              (researcher.isAtCapacity ? (
                <Badge tone="neutral">At capacity</Badge>
              ) : (
                <Badge tone="success">
                  {researcher.capacityRemaining} {researcher.capacityRemaining === 1 ? 'place' : 'places'} open
                </Badge>
              ))}
            {researcher.alignmentScore ? <Badge tone="sea">{researcher.alignmentScore}% match</Badge> : null}
          </div>
        </div>
      </div>
      {researcher.bio && <p className="mt-4 line-clamp-2 text-sm text-ink-secondary">{researcher.bio}</p>}
      {(researcher.researchInterests?.length || 0) > 0 && (
        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {researcher.researchInterests.slice(0, 3).map((interest: string) => (
            <span
              key={interest}
              className={cn(
                'max-w-full truncate rounded-md border px-2 py-0.5 text-xs',
                researcher.sharedInterests?.includes(interest) ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-line bg-surface-muted text-ink-secondary',
              )}
            >
              {interest}
            </span>
          ))}
          {researcher.researchInterests.length > 3 && <span className="px-1 py-0.5 text-xs text-ink-muted">+{researcher.researchInterests.length - 3}</span>}
        </div>
      )}
    </Link>
  );
}

export default function ResearchersDiscoveryPage() {
  const { currentUser } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [deptRes, facRes] = await Promise.all([
          apiFetch('/api/departments'),
          apiFetch('/api/faculties'),
        ]);
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(Array.isArray(deptData) ? deptData : []);
        }
        if (facRes.ok) {
          const facData = await facRes.json();
          setFaculties(Array.isArray(facData) ? facData : []);
        }
      } catch (err) {
        console.error('Failed to load institutional master data', err);
      }
    }
    loadMasterData();
  }, []);

  const availableDepartments = React.useMemo(() => {
    if (!selectedFacultyId) return departments;
    return departments.filter((d) => d.facultyId === selectedFacultyId);
  }, [selectedFacultyId, departments]);

  // Fetch from backend API using relational departmentId and facultyId
  const { data, isLoading, isError, error, refetch } = useResearchers({
    q: searchQuery,
    facultyId: selectedFacultyId || undefined,
    departmentId: selectedDeptId || undefined,
    role: selectedRole,
    limit: 50
  });

  const researchers = (data as any)?.items?.filter((r: any) => r.id !== currentUser?.id) || [];
  const totalCount = (data as any)?.pagination?.total ?? researchers.length;
  
  // Suggest peers based on shared interests > 0
  const suggestedPeers = researchers
    .filter((r: any) => r.sharedInterestCount > 0)
    .sort((a: any, b: any) => b.sharedInterestCount - a.sharedInterestCount)
    .slice(0, 3);

  const hasFilters = !!(searchQuery || selectedDeptId || selectedRole || selectedFacultyId);

  return (
    <div>
      <PageHeader
        meta="Discover"
        title="Researchers"
        description="Supervisors and scholars across SRMIST. Search by name, department or research interest."
      />

      {suggestedPeers.length > 0 && !hasFilters && (
        <section aria-labelledby="suggested-title" className="mb-8">
          <h2 id="suggested-title" className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
            <Sparkles className="size-4 text-brand" aria-hidden />
            Shares your research interests
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {suggestedPeers.map((peer: any) => (
              <li key={`suggested-${peer.id}`}>
                <ResearcherCard researcher={peer} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <label htmlFor="researcher-search" className="sr-only">
              Search researchers
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              id="researcher-search"
              type="search"
              placeholder="Name, department or research interest"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="cb-input pl-9"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex">
            <label className="sr-only" htmlFor="filter-role">
              Role
            </label>
            <select id="filter-role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="cb-input lg:w-40">
              <option value="">All roles</option>
              <option value="RESEARCH_SUPERVISOR">Supervisors</option>
              <option value="RESEARCH_SCHOLAR">Scholars</option>
            </select>
            <label className="sr-only" htmlFor="filter-fac">
              Faculty
            </label>
            <select
              id="filter-fac"
              value={selectedFacultyId}
              onChange={(e) => {
                const nextFacId = e.target.value;
                setSelectedFacultyId(nextFacId);
                if (nextFacId && selectedDeptId) {
                  const isValid = departments.some((d) => d.id === selectedDeptId && d.facultyId === nextFacId);
                  if (!isValid) setSelectedDeptId('');
                }
              }}
              className="cb-input lg:w-52"
            >
              <option value="">All faculties</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filter-dept">
              Department
            </label>
            <select id="filter-dept" value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)} className="cb-input lg:w-52">
              <option value="">All departments</option>
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.code ? `${dept.code} - ` : ''}
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {!isLoading && !isError && (
        <p className="mb-3 text-sm text-ink-muted" aria-live="polite">
          <span className="tabular-nums text-ink">{totalCount}</span> {totalCount === 1 ? 'researcher' : 'researchers'}
          {hasFilters ? ' match your filters' : ''}
        </p>
      )}

      {isLoading ? (
        <div role="status" aria-label="Loading researchers" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex gap-3.5">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
              </div>
              <Skeleton className="mt-4 h-3 w-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <EmptyState
            icon={Users}
            title="The directory didn't load"
            description={(error as any)?.message || 'Check your connection and try again.'}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : researchers.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {researchers.map((researcher: any) => (
            <li key={`dir-${researcher.id}`}>
              <ResearcherCard researcher={researcher} />
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <EmptyState
            icon={Search}
            title={hasFilters ? 'No researchers match' : 'No researchers yet'}
            description={
              hasFilters ? 'Try a broader search, or clear the role, faculty and department filters.' : 'Supervisors and scholars appear here once their accounts are set up.'
            }
            action={
              hasFilters && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDeptId('');
                    setSelectedFacultyId('');
                    setSelectedRole('');
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        </Card>
      )}
    </div>
  );
}
