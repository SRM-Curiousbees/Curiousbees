'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiFetch } from '@/lib/api-client';
import { 
  Users, 
  Search, 
  MapPin, 
  Sparkles, 
  X,
  Compass,
  GraduationCap,
  Award,
  UserCheck,
  Loader2,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardShell } from '@/components/shared/dashboard-shell';

export default function ScholarConnectionsPage() {
  const { collaborators, currentUser, fetchCollaborators, isLoading } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('');
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [invitee, setInvitee] = useState<any | null>(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [deptRes, facRes] = await Promise.all([
          apiFetch('/api/departments'),
          apiFetch('/api/faculties'),
        ]);
        if (deptRes.ok) {
          const data = await deptRes.json();
          setDepartments(Array.isArray(data) ? data : []);
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
    if (!selectedFaculty) return departments;
    const selectedFacObj = faculties.find((f) => f.name === selectedFaculty || f.id === selectedFaculty);
    if (!selectedFacObj) return departments;
    return departments.filter((d) => d.facultyId === selectedFacObj.id);
  }, [selectedFaculty, departments, faculties]);

  useEffect(() => {
    fetchCollaborators(searchQuery, selectedDept);
  }, [searchQuery, selectedDept, fetchCollaborators]);

  // Pick all query results except current user
  const researchers = collaborators.filter((u: any) => u.email !== currentUser?.email);

  // Extract all unique research focus areas
  const allUniqueInterests = Array.from(
    new Set(researchers.flatMap((r: any) => r.interests?.map((i: any) => i.interest?.name || '') || []))
  ).filter(Boolean);

  const calculateCompatibility = (researcher: any) => {
    if (!currentUser || !currentUser.interests || !researcher.interests) return 60;
    const myInterests = currentUser.interests.map((i: any) => i.interest?.name);
    const peerInterests = researcher.interests.map((i: any) => i.interest?.name);
    const intersection = myInterests.filter((i: any) => peerInterests.includes(i));
    
    if (intersection.length > 0) {
      return 85 + Math.min(intersection.length * 5, 14);
    }
    if (currentUser.department === researcher.department) {
      return 78;
    }
    return 65;
  };

  const filteredResearchers = researchers.filter((r: any) => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.bio && r.bio.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFaculty =
      !selectedFaculty ||
      r.departmentRef?.faculty?.name === selectedFaculty ||
      r.departmentRef?.facultyId === selectedFaculty ||
      r.faculty === selectedFaculty;
    const matchesDept =
      !selectedDept ||
      r.departmentRef?.name === selectedDept ||
      r.departmentId === selectedDept ||
      r.department === selectedDept;
    const researcherInterests = r.interests?.map((i: any) => i.interest?.name || '') || [];
    const matchesInterest = !selectedInterest || researcherInterests.includes(selectedInterest);
    
    return matchesSearch && matchesFaculty && matchesDept && matchesInterest;
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitee) return;
    setInviteSubmitting(true);
    
    setTimeout(() => {
      alert(`Success! Synergy proposal dispatched to ${invitee.name}. You will be notified when they accept.`);
      setInviteSubmitting(false);
      setInviteMessage('');
      setInvitee(null);
    }, 1000);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'CB';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <DashboardShell>
      {/* 🚀 Notion-style Hero Header */}
      <div className="theme-static relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-brand-900 to-brand-800 cb-honeycomb-dark border border-brand-800/15 p-6 md:p-8 shadow-xl text-left">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-12 bottom-0 w-72 h-72 bg-brand-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gold/25 text-gold border border-gold/30 text-xs font-medium capitalize">
              Academic Directory
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight leading-tight">
              Expert Matchmaking & Synergy Directory
            </h1>
            <p className="text-xs sm:text-sm text-white/80 font-medium max-w-xl leading-relaxed">
              Find doctoral co-authors, request supervisor advisor mapping, and discover campus colleagues matching your exact scientific domains.
            </p>
          </div>
        </div>
      </div>

      {/* 🚀 Filter Controls Bar */}
      <div className="cb-card p-5 bg-surface/90 border border-slate-200/80 backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-left">
        <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-4 flex-1">
          <span className="font-label-caps text-xs capitalize text-slate-400 font-medium pt-1">
            Filter Directory:
          </span>

          {/* Search Input field */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-0 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or bio keywords..."
              className="w-full bg-transparent border-0 border-b border-slate-200 focus:border-primary focus:ring-0 pl-7 pb-2 pt-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 transition-colors"
            />
          </div>

          {/* Faculty Select */}
          <div className="relative min-w-[180px]">
            <select
              value={selectedFaculty}
              onChange={(e) => {
                const nextFac = e.target.value;
                setSelectedFaculty(nextFac);
                if (nextFac && selectedDept) {
                  const selectedFacObj = faculties.find((f) => f.name === nextFac || f.id === nextFac);
                  if (selectedFacObj) {
                    const isValid = departments.some((d) => d.name === selectedDept && d.facultyId === selectedFacObj.id);
                    if (!isValid) setSelectedDept('');
                  }
                }
              }}
              className="w-full bg-transparent border-0 border-b border-slate-200 focus:border-primary focus:ring-0 pb-2 pt-2 text-xs font-semibold text-slate-800 transition-colors cursor-pointer pr-8"
            >
              <option value="" className="">All Faculties</option>
              {faculties.map((fac) => (
                <option key={fac.id} value={fac.name} className="">{fac.name}</option>
              ))}
            </select>
          </div>

          {/* Department Select */}
          <div className="relative min-w-[180px]">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-transparent border-0 border-b border-slate-200 focus:border-primary focus:ring-0 pb-2 pt-2 text-xs font-semibold text-slate-800 transition-colors cursor-pointer pr-8"
            >
              <option value="" className="">All Departments</option>
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={dept.name} className="">
                  {dept.code ? `${dept.code} - ` : ''}{dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Focus Domain Select */}
          <div className="relative min-w-[180px]">
            <select
              value={selectedInterest}
              onChange={(e) => setSelectedInterest(e.target.value)}
              className="w-full bg-transparent border-0 border-b border-slate-200 focus:border-primary focus:ring-0 pb-2 pt-2 text-xs font-semibold text-slate-800 transition-colors cursor-pointer pr-8"
            >
              <option value="" className="">All Research Domains</option>
              {allUniqueInterests.map((interest) => (
                <option key={interest} value={interest} className="">#{interest}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || selectedFaculty || selectedDept || selectedInterest) && (
          <button
            onClick={() => { setSearchQuery(''); setSelectedFaculty(''); setSelectedDept(''); setSelectedInterest(''); }}
            className="text-primary hover:text-primary/80 text-xs font-semibold flex items-center gap-1 shrink-0 self-end md:self-auto cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* 🚀 Main Grid Feed */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-slate-400 capitalize font-medium">Syncing directory node data...</p>
          </div>
        ) : filteredResearchers.length === 0 ? (
          <div className="cb-card border border-slate-200/50 rounded-xl py-20 text-center bg-surface/95">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h4 className="text-slate-900 font-bold text-base">No Matching Scholars Found</h4>
            <p className="text-slate-500 text-xs max-w-xs mx-auto mt-2 leading-relaxed font-semibold">
              We couldn't find any researchers matching your specified parameters. Try clearing some filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredResearchers.map((researcher: any) => {
              const compatibilityScore = calculateCompatibility(researcher);
              return (
                <div 
                  key={researcher.id}
                  className="cb-card rounded-xl p-5 flex flex-col justify-between hover:border-primary/50 transition-all group duration-200 text-left bg-surface border border-slate-200/80"
                >
                  <div className="space-y-4">
                    
                    {/* Card Identity Header */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 bg-primary/5 flex items-center justify-center shrink-0">
                          {researcher.image ? (
                            <img src={researcher.image} alt={researcher.name || undefined} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-primary">{getInitials(researcher.name)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                            {researcher.name}
                          </h3>
                          <div className="flex items-center flex-wrap gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold uppercase bg-slate-100 text-slate-600 border border-slate-200 leading-none">
                              {researcher.role === 'SUPERVISOR' ? (
                                <>
                                  <GraduationCap className="w-2.5 h-2.5 mr-0.5" />
                                  Faculty Guide
                                </>
                              ) : (
                                <>
                                  <Award className="w-2.5 h-2.5 mr-0.5" />
                                  PhD Scholar
                                </>
                              )}
                            </span>
                            <span className="text-2xs text-slate-400 font-medium flex items-center shrink-0">
                              <MapPin className="w-3 h-3 mr-0.5 text-slate-400" />
                              {researcher.departmentRef?.faculty?.campus?.name || researcher.campus || 'SRMIST Main Campus'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Compatibility synergy Match badge */}
                      <div className="text-right shrink-0">
                        <div className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-center shadow-sm">
                          <span className="text-xs font-medium text-slate-400 capitalize block leading-none mb-0.5">synergy</span>
                          <span className="text-xs font-mono font-bold text-primary leading-none">{compatibilityScore}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Department Block */}
                    <div>
                      <p className="text-xs font-medium text-slate-400 capitalize leading-none">Academic Department</p>
                      <p className="text-xs text-slate-700 font-semibold leading-normal mt-1 max-w-sm truncate">
                        🏫 {researcher.departmentRef?.name || researcher.department || 'Academic Department Not Specified'}
                        {researcher.departmentRef?.faculty?.name ? ` · ${researcher.departmentRef.faculty.name}` : ''}
                      </p>
                    </div>

                    {/* Bio Paragraph */}
                    <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 min-h-[54px]">
                      {researcher.bio || 'This academic member has recently joined the portal to bootstrap their interdisciplinary research.'}
                    </p>
                  </div>

                  {/* Card Footer actions and tags */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 pt-3 mt-4 gap-3">
                    <div className="flex flex-wrap gap-1">
                      {researcher.interests?.slice(0, 3).map((item: any) => (
                        <span 
                          key={item.interest?.name || item.interestId}
                          className="px-2 py-0.5 bg-slate-50 text-2xs text-slate-550 rounded border border-slate-200/50 font-semibold"
                        >
                          #{item.interest?.name || 'Research'}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => setInvitee(researcher)}
                      className="px-4 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-xs transition-colors shrink-0 self-end sm:self-auto font-bold cursor-pointer"
                    >
                      Invite Synergy
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🚀 Synergy proposal modal drawer */}
      <AnimatePresence>
        {invitee && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              exit={{ opacity: 0 }}
              onClick={() => setInvitee(null)}
              className="fixed inset-0 bg-black/65 z-50 cursor-pointer backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] bg-surface border-t border-slate-200 rounded-t-2xl p-6 shadow-2xl flex flex-col space-y-5 text-left max-w-xl mx-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-slate-800 leading-none">Synergy Proposal</h3>
                    <p className="text-2xs text-slate-400 font-bold uppercase mt-1">Intranet Workspace Collaboration</p>
                  </div>
                </div>
                <button 
                  onClick={() => setInvitee(null)}
                  className="p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-450" />
                </button>
              </div>

              <form onSubmit={handleSendInvite} className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-primary/5 flex items-center justify-center">
                    {invitee.image ? (
                      <img src={invitee.image} alt={invitee.name || undefined} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-primary">{getInitials(invitee.name)}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-none">{invitee.name}</h4>
                    <p className="text-2xs text-slate-500 font-medium mt-1 truncate max-w-[320px]">
                      🏫 {invitee.departmentRef?.name || invitee.department || 'Academic Department Not Specified'}
                      {invitee.departmentRef?.faculty?.name ? ` · ${invitee.departmentRef.faculty.name}` : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-450 capitalize">Synergy Message</label>
                  <textarea
                    rows={4}
                    required
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Describe your synergy hypothesis, share resources you bring, or pitch a co-authored grant proposal..."
                    className="w-full bg-transparent border border-slate-200 rounded-lg p-3 font-sans text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setInvitee(null)}
                    className="px-5 py-2.5 rounded-lg text-xs font-medium capitalize text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-white text-xs font-medium capitalize transition-all flex items-center gap-1.5 cursor-pointer shadow disabled:opacity-50"
                  >
                    {inviteSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 shrink-0" />
                        <span>Send Synergy Proposal</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </DashboardShell>
    );
  }
