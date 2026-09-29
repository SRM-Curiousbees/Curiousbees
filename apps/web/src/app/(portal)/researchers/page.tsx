'use client';

import React, { useState, useEffect } from 'react';
import { useResearchers } from '@/hooks/useResearchers';
import { useStore } from '@/store/useStore';
import { apiFetch } from '@/lib/api-client';
import { 
  Users, 
  Search, 
  MapPin, 
  Network, 
  Loader2, 
  Sparkles, 
  ArrowUpRight,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getProfileImageUrl } from '@/lib/avatar';

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

  const getInitials = (name: string) => {
    if (!name) return 'R';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-32 select-none text-left">
      
      {/* ─── 1. HEADER SECTION ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-surface/90 backdrop-blur-xl border border-slate-200/80 p-6 md:p-8 rounded-3xl shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-brand/10 text-brand rounded-xl border border-blue-100">
              <Network className="w-5 h-5" />
            </span>
            <span className="text-xs font-medium capitalize text-brand">
              SRM RESEARCH COMMUNITY
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight font-display">
            Researchers
          </h1>
          <p className="text-slate-600 max-w-2xl text-sm md:text-base leading-relaxed font-medium">
            Discover Research Supervisors and Scholars across CuriousBees. Explore academic profiles, publications, ongoing investigations, and connect directly.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-4 py-3 rounded-2xl shrink-0">
          <Users className="w-5 h-5 text-brand" />
          <div className="text-xs">
            <p className="font-semibold text-slate-900">{totalCount} Researchers</p>
            <p className="text-slate-500 font-medium">Across CuriousBees</p>
          </div>
        </div>
      </div>

      {/* ─── 2. SUGGESTED PEERS ─── */}
      {suggestedPeers.length > 0 && !searchQuery && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" />
            <h2 className="text-xs font-medium text-slate-900 capitalize">
              Suggested Peers (Shared Focus)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestedPeers.map((peer: any) => (
              <motion.div 
                key={`suggested-${peer.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between relative overflow-hidden group"
              >
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                      <img src={getProfileImageUrl(peer)} alt={peer.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 text-base truncate group-hover:text-brand transition-colors">
                        {peer.name}
                      </h3>
                      <span className={cn(
                        "inline-block text-2xs font-semibold px-2 py-0.5 rounded-full mb-0.5",
                        peer.role === 'RESEARCH_SUPERVISOR' || peer.role === 'SUPERVISOR'
                          ? "bg-amber-50 text-amber-700 border border-amber-200" 
                          : "bg-blue-50 text-brand border border-blue-100"
                      )}>
                        {peer.role === 'RESEARCH_SUPERVISOR' || peer.role === 'SUPERVISOR' ? 'Research Supervisor' : 'Research Scholar'}
                      </span>
                      <p className="text-xs text-slate-500 truncate font-medium">
                        {peer.departmentRef?.name || peer.department || 'SRMIST'}
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-blue-50/70 px-2.5 py-1 rounded-lg border border-blue-100">
                    <BookOpen className="w-3.5 h-3.5" />
                    {peer.sharedInterestCount} Shared Research Interests
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-5 relative z-10">
                  <Link 
                    href={`/researchers/${peer.id}`}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    Profile <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ─── 3. SEARCH & CONTROLS SECTION ─── */}
      <section className="space-y-6">
        <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search researchers by name, department, or research interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-surface text-xs md:text-sm font-semibold transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand focus:bg-surface min-w-[150px] transition-all cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="RESEARCH_SUPERVISOR">Research Supervisors</option>
              <option value="RESEARCH_SCHOLAR">Research Scholars</option>
            </select>

            <select
              value={selectedFacultyId}
              onChange={(e) => {
                const nextFacId = e.target.value;
                setSelectedFacultyId(nextFacId);
                if (nextFacId && selectedDeptId) {
                  const isValid = departments.some((d) => d.id === selectedDeptId && d.facultyId === nextFacId);
                  if (!isValid) setSelectedDeptId('');
                }
              }}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand focus:bg-surface min-w-[160px] max-w-[220px] transition-all cursor-pointer"
            >
              <option value="">All Faculties</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>

            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand focus:bg-surface min-w-[170px] max-w-[240px] transition-all cursor-pointer"
            >
              <option value="">All Departments</option>
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.code ? `${dept.code} - ` : ''}{dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── 4. DIRECTORY GRID ─── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-surface border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="w-24 h-4 bg-slate-200 rounded" />
                    <div className="w-16 h-3 bg-slate-100 rounded" />
                    <div className="w-20 h-3 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="w-full h-8 bg-slate-100 rounded-lg" />
                <div className="w-full h-8 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="bg-surface border border-rose-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Network className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">Unable to load researchers</h3>
              <p className="text-xs text-slate-500">
                {(error as any)?.message || 'An error occurred while connecting to the academic directory.'}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-6 py-2.5 bg-brand hover:bg-brand-strong text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        ) : researchers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {researchers.map((researcher: any) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  key={`dir-${researcher.id}`}
                  className="bg-surface border border-slate-200/80 hover:border-blue-300 rounded-2xl shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                >
                  <Link href={`/researchers/${researcher.id}`} className="p-5 block space-y-4 flex-1 cursor-pointer">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                        <img src={getProfileImageUrl(researcher)} alt={researcher.name} className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 text-base truncate group-hover:text-brand transition-colors">
                          {researcher.name}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className={cn(
                            "inline-block text-2xs font-semibold px-2 py-0.5 rounded-full",
                            researcher.role === 'RESEARCH_SUPERVISOR' || researcher.role === 'SUPERVISOR'
                              ? "bg-amber-50 text-amber-700 border border-amber-200" 
                              : "bg-blue-50 text-brand border border-blue-100"
                          )}>
                            {researcher.role === 'RESEARCH_SUPERVISOR' || researcher.role === 'SUPERVISOR' ? 'Research Supervisor' : 'Research Scholar'}
                          </span>
                          {researcher.alignmentScore ? (
                            <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {researcher.alignmentScore}% Match
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 truncate font-medium">
                          <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
                          <span className="truncate">
                            {researcher.departmentRef?.name || researcher.department || 'SRMIST'}
                            {researcher.departmentRef?.faculty?.name ? ` · ${researcher.departmentRef.faculty.name}` : ''}
                          </span>
                        </div>
                        {(researcher.role === 'RESEARCH_SUPERVISOR' || researcher.role === 'SUPERVISOR') && (
                          <div className="mt-1">
                            {researcher.isAtCapacity ? (
                              <span className="inline-block text-2xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                                Capacity Full ({researcher.currentScholars}/{researcher.maxScholars})
                              </span>
                            ) : (
                              <span className="inline-block text-2xs font-bold text-emerald-600 bg-emerald-50/80 border border-emerald-200 px-2 py-0.5 rounded-md">
                                {researcher.capacityRemaining} Scholar Slot{researcher.capacityRemaining !== 1 ? 's' : ''} Open
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {researcher.bio && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                        {researcher.bio}
                      </p>
                    )}

                    {researcher.sharedInterests?.length > 0 && (
                      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 space-y-1">
                        <span className="text-xs font-medium capitalize text-brand flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> Shared Focus ({researcher.sharedInterestCount})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {researcher.sharedInterests.slice(0, 3).map((item: string) => (
                            <span key={item} className="px-1.5 py-0.5 bg-surface border border-blue-200 text-brand rounded text-2xs font-bold truncate max-w-full">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {researcher.researchInterests?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {researcher.researchInterests.slice(0, 3).map((interest: string) => (
                          <span key={interest} className="px-2 py-0.5 bg-slate-50 border border-slate-200/80 rounded-md text-2xs font-bold text-slate-600 max-w-full truncate">
                            {interest}
                          </span>
                        ))}
                        {researcher.researchInterests.length > 3 && (
                          <span className="px-2 py-0.5 bg-slate-50 border border-slate-200/80 rounded-md text-2xs font-bold text-slate-500">
                            +{researcher.researchInterests.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>

                  <div className="px-5 pb-5 pt-3 border-t border-slate-100">
                    <Link
                      href={`/researchers/${researcher.id}`}
                      className="block w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-center text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
                    >
                      View Profile
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-surface border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-brand">
              <Search className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">
                {searchQuery || selectedDeptId || selectedRole ? 'No Researchers Found' : 'No Researchers Available'}
              </h3>
              <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto font-medium">
                {searchQuery || selectedDeptId || selectedRole
                  ? 'No researchers match your current search or filters. Try adjusting your search criteria.'
                  : 'Research Supervisors and Scholars will appear here once they are available in CuriousBees.'}
              </p>
            </div>
            {(searchQuery || selectedDeptId || selectedRole) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDeptId('');
                  setSelectedRole('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
