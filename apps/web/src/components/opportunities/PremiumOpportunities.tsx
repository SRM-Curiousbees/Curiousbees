'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateOpportunitySchema } from '@curiousbees/shared-utils';
import { useStore } from '@/store/useStore';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Check, 
  X,
  GraduationCap,
  Bookmark,
  Building,
  Filter,
  ShieldCheck,
  Calendar,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Opportunity } from '@curiousbees/types';

// Predefined taxonomy domains for quick tag selection
const PREDEFINED_DOMAINS = [
  'Artificial Intelligence',
  'Quantum Computing',
  'Bioinformatics',
  'VLSI & Photonics',
  'Cybersecurity',
  'Medical Imaging',
  'Clean Energy',
  'Robotics',
  'Nanotechnology',
  'Cloud Computing',
  'Data Science',
  'Signal Processing'
];

const OPPORTUNITY_TYPES = [
  'PhD Position',
  'Research Assistantship',
  'Research Project',
  'Research Internship',
  'Fellowship',
  'Postdoctoral Position',
  'Lab Position',
  'Research Collaboration',
  'Grant / Funding Opportunity',
  'Other'
];

const FUNDING_OPTIONS = [
  'Fully Funded',
  'Partially Funded',
  'Self Funded',
  'Fellowship Supported',
  'Grant Supported',
  'Stipend Available',
  'Unspecified'
];

const ELIGIBILITY_OPTIONS = [
  'PhD Scholars',
  'Research Scholars',
  'Postgraduate Students',
  'Faculty',
  'Research Assistants',
  'External Researchers'
];

const MODE_OPTIONS = [
  'On Campus',
  'Remote',
  'Hybrid',
  'Field / Laboratory',
  'Other'
];

const APPLICATION_METHODS = [
  'CuriousBees',
  'External Application Link',
  'Email'
];

export function PremiumOpportunities() {
  const { opportunities, fetchOpportunities, createOpportunity, currentUser, addToast } = useStore();
  
  // Data Loading & Error States
  const [loading, setLoading] = useState(opportunities.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Drawer & Modal States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [savedOppIds, setSavedOppIds] = useState<string[]>([]);
  const [appliedOppIds, setAppliedOppIds] = useState<string[]>([]);
  
  // Filtering States
  const [selectedTypeCategory, setSelectedTypeCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedFunding, setSelectedFunding] = useState<string[]>([]);
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [selectedPIs, setSelectedPIs] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Form custom domain tags state
  const [domainTags, setDomainTags] = useState<string[]>([]);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [eligibilityTags, setEligibilityTags] = useState<string[]>(['PhD Scholars']);

  // Fetch opportunities reliably
  const loadOpportunities = React.useCallback(async (showLoading = true) => {
    if (showLoading && opportunities.length === 0) setLoading(true);
    setError(null);
    try {
      await fetchOpportunities();
    } catch (e: any) {
      console.error('Failed to load opportunities:', e);
      setError(e.message || 'Unable to load research opportunities');
    } finally {
      setLoading(false);
    }
  }, [fetchOpportunities, opportunities.length]);

  useEffect(() => {
    loadOpportunities(opportunities.length === 0);
  }, [loadOpportunities]);

  // Lock background body scroll when drawer or detail modal is open
  useEffect(() => {
    if (isDrawerOpen || selectedOpportunity) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen, selectedOpportunity]);

  // Check if current user is authorized to publish (Supervisors & Scholars)
  const canPublish = useMemo(() => {
    if (!currentUser) return false;
    const role = currentUser.role as string;
    return role === 'RESEARCH_SUPERVISOR' || role === 'SUPERVISOR' || role === 'RESEARCH_SCHOLAR' || role === 'SCHOLAR' || role === 'INSTITUTE_ADMIN';
  }, [currentUser]);

  // Derive unique taxonomy options from current data
  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    if (currentUser?.department) depts.add(currentUser.department);
    (opportunities || []).forEach(o => {
      if (o && o.department) depts.add(o.department);
    });
    return Array.from(depts).sort();
  }, [opportunities, currentUser?.department]);

  const uniqueDomains = useMemo(() => {
    const domains = new Set<string>(PREDEFINED_DOMAINS);
    (opportunities || []).forEach(o => {
      if (o && o.researchDomain) {
        o.researchDomain.split(',').map(d => d.trim()).filter(Boolean).forEach(d => domains.add(d));
      }
    });
    return Array.from(domains).sort();
  }, [opportunities]);

  const uniquePIs = useMemo(() => {
    const pis = new Set<string>();
    (opportunities || []).forEach(o => {
      if (o && o.author?.name) pis.add(o.author.name);
    });
    return Array.from(pis).sort();
  }, [opportunities]);

  // Form setup
  const userDept = currentUser?.department || '';
  const todayISO = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(CreateOpportunitySchema),
    defaultValues: {
      title: '',
      description: '',
      department: userDept,
      researchDomain: '',
      opportunityType: 'PhD Position',
      positionsCount: 1,
      funding: 'Fully Funded',
      fundingDetails: '',
      eligibility: ['PhD Scholars'],
      deadline: '',
      mode: 'On Campus',
      applicationMethod: 'CuriousBees',
      applicationUrl: '',
      applicationEmail: ''
    }
  });

  const selectedAppMethod = watch('applicationMethod');

  // Handle Domain Tag addition in drawer
  const handleAddDomainTag = (tag: string) => {
    const cleaned = tag.trim();
    if (cleaned && !domainTags.includes(cleaned)) {
      const next = [...domainTags, cleaned];
      setDomainTags(next);
      setValue('researchDomain', next.join(', '), { shouldValidate: true });
    }
    setCustomDomainInput('');
  };

  const handleRemoveDomainTag = (tag: string) => {
    const next = domainTags.filter(t => t !== tag);
    setDomainTags(next);
    setValue('researchDomain', next.join(', '), { shouldValidate: true });
  };

  // Handle Eligibility Checkboxes
  const toggleEligibility = (option: string) => {
    let next: string[];
    if (eligibilityTags.includes(option)) {
      next = eligibilityTags.filter(t => t !== option);
    } else {
      next = [...eligibilityTags, option];
    }
    setEligibilityTags(next);
    setValue('eligibility', next);
  };

  // Form submission handler
  const onSubmit = async (data: any) => {
    try {
      if (domainTags.length === 0 && !data.researchDomain) {
        addToast('Please select or add at least one research domain tag.', 'error');
        return;
      }

      const domainString = domainTags.length > 0 ? domainTags.join(', ') : data.researchDomain;

      const payload = {
        title: data.title,
        description: data.description,
        department: userDept, // Derived strictly from user profile
        researchDomain: domainString,
        opportunityType: data.opportunityType || 'PhD Position',
        positionsCount: Number(data.positionsCount) || 1,
        funding: data.funding || 'Fully Funded',
        fundingDetails: data.fundingDetails || undefined,
        eligibility: eligibilityTags,
        deadline: data.deadline || undefined,
        mode: data.mode || 'On Campus',
        applicationMethod: data.applicationMethod || 'CuriousBees',
        applicationUrl: data.applicationUrl || undefined,
        applicationEmail: data.applicationEmail || undefined
      };

      await createOpportunity(payload);
      
      addToast('Research opportunity published successfully!', 'success');
      setIsDrawerOpen(false);
      
      reset({
        title: '',
        description: '',
        department: userDept,
        researchDomain: '',
        opportunityType: 'PhD Position',
        positionsCount: 1,
        funding: 'Fully Funded',
        fundingDetails: '',
        eligibility: ['PhD Scholars'],
        deadline: '',
        mode: 'On Campus',
        applicationMethod: 'CuriousBees',
        applicationUrl: '',
        applicationEmail: ''
      });
      setDomainTags([]);
      setEligibilityTags(['PhD Scholars']);

      fetchOpportunities();
    } catch (e: any) {
      addToast(e.message || 'Failed to publish opportunity', 'error');
    }
  };

  // Filter & Personalization Logic
  const userInterestsList = useMemo(() => {
    return (currentUser?.interests || []).map((i: any) => i.interest?.name || i.name || '').filter(Boolean);
  }, [currentUser?.interests]);

  const filteredOpps = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const matched = (opportunities || []).filter((o) => {
      if (!o || !o.title) return false;
      // 1. Text Search across Title, Domain, Description, Supervisor, Dept, Type
      const matchesSearch = !q || 
        o.title.toLowerCase().includes(q) || 
        (o.description || '').toLowerCase().includes(q) ||
        (o.researchDomain || '').toLowerCase().includes(q) ||
        (o.department || '').toLowerCase().includes(q) ||
        (o.opportunityType || '').toLowerCase().includes(q) ||
        (o.author?.name || '').toLowerCase().includes(q);
      
      // 2. Department Filter
      const matchesDept = selectedDepts.length === 0 || selectedDepts.some(sd => {
        const sdBase = sd.split('(')[0].trim().toLowerCase();
        const oppBase = (o.department || '').split('(')[0].trim().toLowerCase();
        return sdBase === oppBase || sdBase.includes(oppBase) || oppBase.includes(sdBase);
      });

      // 3. Domain Filter
      const matchesDomain = selectedDomains.length === 0 || (
        o.researchDomain && selectedDomains.some(sd => o.researchDomain.toLowerCase().includes(sd.toLowerCase()))
      );

      // 4. Type Filter
      const matchesType = !selectedTypeCategory || 
        (o.opportunityType || '').toLowerCase().includes(selectedTypeCategory.toLowerCase()) ||
        (o.researchDomain || '').toLowerCase().includes(selectedTypeCategory.toLowerCase()) ||
        (o.title || '').toLowerCase().includes(selectedTypeCategory.toLowerCase());

      // 5. Funding Filter
      const matchesFunding = selectedFunding.length === 0 || (o.funding && selectedFunding.includes(o.funding));

      // 6. Mode Filter
      const matchesMode = selectedModes.length === 0 || (o.mode && selectedModes.includes(o.mode));

      // 7. Supervisor Filter
      const matchesPI = selectedPIs.length === 0 || (o.author?.name && selectedPIs.includes(o.author.name));

      return matchesSearch && matchesDept && matchesDomain && matchesType && matchesFunding && matchesMode && matchesPI;
    });

    // Personalization sorting: Prioritize posts matching user research interests
    if (userInterestsList.length > 0) {
      return [...matched].sort((a, b) => {
        const aScore = userInterestsList.some(ui => (a.researchDomain || '').toLowerCase().includes(ui.toLowerCase())) ? 1 : 0;
        const bScore = userInterestsList.some(ui => (b.researchDomain || '').toLowerCase().includes(ui.toLowerCase())) ? 1 : 0;
        return bScore - aScore;
      });
    }

    return matched;
  }, [opportunities, searchQuery, selectedDepts, selectedDomains, selectedTypeCategory, selectedFunding, selectedModes, selectedPIs, userInterestsList]);

  // Active filter helper
  const hasActiveFilters = selectedDepts.length > 0 || selectedDomains.length > 0 || selectedTypeCategory !== '' || selectedFunding.length > 0 || selectedModes.length > 0 || selectedPIs.length > 0 || searchQuery !== '';

  const clearAllFilters = () => {
    setSelectedDepts([]);
    setSelectedDomains([]);
    setSelectedTypeCategory('');
    setSelectedFunding([]);
    setSelectedModes([]);
    setSelectedPIs([]);
    setSearchQuery('');
  };

  const toggleFilter = (set: React.Dispatch<React.SetStateAction<string[]>>, list: string[], value: string) => {
    if (list.includes(value)) {
      set(list.filter(item => item !== value));
    } else {
      set([...list, value]);
    }
  };

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isExpired = (deadlineStr: string | Date | null | undefined) => {
    if (!deadlineStr) return false;
    const d = new Date(deadlineStr);
    if (isNaN(d.getTime())) return false;
    return d < new Date();
  };

  const handleOpenDrawer = () => {
    if (!canPublish) {
      addToast('🔒 Access Restricted! Only verified Research Supervisors and Scholars are authorized to publish opportunities.', 'error');
      return;
    }
    setIsDrawerOpen(true);
  };

  const toggleSaveOpportunity = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (savedOppIds.includes(id)) {
      setSavedOppIds(savedOppIds.filter(i => i !== id));
      addToast('Opportunity removed from saved list', 'info');
    } else {
      setSavedOppIds([...savedOppIds, id]);
      addToast('Opportunity saved to your research portal!', 'success');
    }
  };

  const handleApplyAction = (e: React.MouseEvent, opp: Opportunity) => {
    e.stopPropagation();
    if (isExpired(opp.deadline)) {
      addToast('This opportunity application deadline has passed.', 'error');
      return;
    }

    if (opp.applicationMethod === 'External Application Link' && opp.applicationUrl) {
      window.open(opp.applicationUrl.startsWith('http') ? opp.applicationUrl : `https://${opp.applicationUrl}`, '_blank');
      return;
    }

    if (opp.applicationMethod === 'Email' && opp.applicationEmail) {
      window.location.href = `mailto:${opp.applicationEmail}?subject=Application for ${encodeURIComponent(opp.title)}`;
      return;
    }

    // Default CuriousBees direct application
    setAppliedOppIds([...appliedOppIds, opp.id]);
    addToast(`Application / Interest snapshot dispatched to ${opp.author?.name || 'the research lead'}!`, 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 select-none text-left">
      <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6">
        
        {/* ─── 1. HEADER SECTION ────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/90 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium capitalize bg-brand/10 text-brand px-3 py-1 rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Institutional Directory
              </span>
              {currentUser?.department && (
                <span className="text-2xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {currentUser.department.split('(')[0].trim()}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">Research Opportunities</h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">
              Discover funded PhD slots, assistantships, active lab positions, grants, and department research projects.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-surface border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              <Filter className="w-4 h-4 text-slate-500" />
              <span>Filters</span>
            </button>
            {canPublish && (
              <button
                onClick={handleOpenDrawer}
                className="flex items-center gap-2 px-5 py-3 bg-brand hover:bg-brand-strong text-white rounded-2xl text-xs font-medium capitalize shadow-md  transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Publish Opportunity</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── 2. CATEGORY FILTER PILLS ────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {['All Opportunities', 'PhD Positions', 'Assistantships', 'Research Projects', 'Fellowships', 'Lab Positions', 'Grant & Funding', 'Collaborations'].map((cat) => {
            const isSelected = selectedTypeCategory === cat || (!selectedTypeCategory && cat === 'All Opportunities');
            return (
              <button
                key={cat}
                onClick={() => setSelectedTypeCategory(cat === 'All Opportunities' ? '' : cat)}
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer select-none",
                  isSelected
                    ? "bg-brand text-white border-brand shadow-sm "
                    : "bg-surface text-slate-700 border-slate-200/80 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ACTIVE FILTER TAGS ROW */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap bg-surface p-3 rounded-2xl border border-slate-200/80">
            <span className="text-2xs font-semibold uppercase text-slate-400 mr-1">Active Filters:</span>
            {selectedTypeCategory && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-brand rounded-full text-xs font-bold border border-blue-100">
                Type: {selectedTypeCategory}
                <button onClick={() => setSelectedTypeCategory('')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedDepts.map(d => (
              <span key={d} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">
                Dept: {d.split('(')[0].trim()}
                <button onClick={() => toggleFilter(setSelectedDepts, selectedDepts, d)} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {selectedDomains.map(d => (
              <span key={d} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold border border-amber-200">
                Domain: {d}
                <button onClick={() => toggleFilter(setSelectedDomains, selectedDomains, d)} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {selectedFunding.map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
                Funding: {f}
                <button onClick={() => toggleFilter(setSelectedFunding, selectedFunding, f)} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
              </span>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-rose-600 hover:underline ml-auto cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* ─── 3. MAIN LAYOUT (SIDEBAR + CARDS LIST) ────────────── */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start mt-6 w-full">
          
          {/* LEFT SIDEBAR FILTERS */}
          <aside className={`w-full lg:w-80 shrink-0 space-y-5 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, domain, supervisor..."
                className="w-full pl-10 pr-4 py-3 bg-surface border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-2xs transition-all placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>



            {/* Research Domain Filter Card */}
            <div className="bg-surface/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 p-5 shadow-2xs">
              <h3 className="text-xs font-medium capitalize text-slate-400 mb-4">Research Domain</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {uniqueDomains.map((domain) => (
                  <div 
                    key={domain} 
                    onClick={() => toggleFilter(setSelectedDomains, selectedDomains, domain)} 
                    className="flex items-center gap-3 cursor-pointer group py-1"
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      selectedDomains.includes(domain) ? 'bg-gold border-gold' : 'border-slate-300 group-hover:border-gold'
                    }`}>
                      {selectedDomains.includes(domain) && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-brand transition-colors">{domain}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Funding Filter Card */}
            <div className="bg-surface/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 p-5 shadow-2xs">
              <h3 className="text-xs font-medium capitalize text-slate-400 mb-4">Funding Type</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                {FUNDING_OPTIONS.map((f) => (
                  <div 
                    key={f} 
                    onClick={() => toggleFilter(setSelectedFunding, selectedFunding, f)} 
                    className="flex items-center gap-3 cursor-pointer group py-1"
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      selectedFunding.includes(f) ? 'bg-success border-transparent' : 'border-slate-300 group-hover:border-emerald-600'
                    }`}>
                      {selectedFunding.includes(f) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Work Mode Filter */}
            <div className="bg-surface/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 p-5 shadow-2xs">
              <h3 className="text-xs font-medium capitalize text-slate-400 mb-4">Work Mode</h3>
              <div className="space-y-2">
                {MODE_OPTIONS.map((m) => (
                  <div 
                    key={m} 
                    onClick={() => toggleFilter(setSelectedModes, selectedModes, m)} 
                    className="flex items-center gap-3 cursor-pointer group py-1"
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      selectedModes.includes(m) ? 'bg-brand border-brand' : 'border-slate-300 group-hover:border-brand'
                    }`}>
                      {selectedModes.includes(m) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-brand">{m}</span>
                  </div>
                ))}
              </div>
            </div>

          </aside>

          {/* RIGHT OPPORTUNITY CARDS LIST */}
          <div className="flex-1 min-w-0 w-full">
            <AnimatePresence mode="popLayout">
              {loading && opportunities.length === 0 ? (
                /* ── LOADING SKELETON ── */
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 w-full animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-surface/80 rounded-3xl p-6 border border-slate-200/80 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-5 bg-slate-200 rounded-full" />
                        <div className="w-16 h-5 bg-slate-100 rounded-full" />
                      </div>
                      <div className="w-3/4 h-6 bg-slate-200 rounded-lg" />
                      <div className="w-full h-12 bg-slate-100 rounded-lg" />
                      <div className="flex items-center gap-2 pt-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200" />
                        <div className="w-32 h-4 bg-slate-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error && opportunities.length === 0 ? (
                /* ── ERROR RECOVERY STATE ── */
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-surface/90 backdrop-blur-xl border border-rose-200/80 p-12 text-center rounded-3xl shadow-sm flex flex-col items-center justify-center min-h-[360px] w-full"
                >
                  <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4">
                    <Briefcase className="w-7 h-7" />
                  </div>
                  <h4 className="text-slate-900 font-semibold text-lg">Unable to load opportunities</h4>
                  <p className="text-slate-500 text-xs max-w-md mx-auto mt-2 leading-relaxed font-medium">
                    {error || 'A network error occurred while connecting to the research repository.'}
                  </p>
                  <button
                    onClick={() => loadOpportunities(true)}
                    className="mt-6 px-6 py-3 bg-brand hover:bg-brand-strong text-white text-xs font-medium capitalize rounded-2xl shadow-md transition-all cursor-pointer"
                  >
                    Retry Loading
                  </button>
                </motion.div>
              ) : filteredOpps.length === 0 ? (
                /* ── EMPTY STATE ── */
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-surface/90 backdrop-blur-xl border border-slate-200/80 p-12 text-center rounded-3xl shadow-sm flex flex-col items-center justify-center min-h-[360px] w-full"
                >
                  <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-brand mb-4">
                    <Briefcase className="w-7 h-7" />
                  </div>
                  <h4 className="text-slate-900 font-semibold text-lg">No research opportunities yet</h4>
                  <p className="text-slate-500 text-xs max-w-md mx-auto mt-2 leading-relaxed font-medium">
                    New research positions, projects, and collaboration opportunities will appear here. Try adjusting your search filters.
                  </p>
                  {canPublish && (
                    <button
                      onClick={handleOpenDrawer}
                      className="mt-6 px-6 py-3 bg-brand hover:bg-brand-strong text-white text-xs font-medium capitalize rounded-2xl shadow-md transition-all cursor-pointer"
                    >
                      Be the first to publish an opportunity
                    </button>
                  )}
                </motion.div>
              ) : (
                /* ── CARDS GRID ── */
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 w-full">
                  {filteredOpps.map((opp) => {
                    const isSaved = savedOppIds.includes(opp.id);
                    const isApplied = appliedOppIds.includes(opp.id);
                    const expired = isExpired(opp.deadline);
                    const authorInitials = opp.author?.name
                      ? opp.author.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'RS';

                    const domainsList = (opp.researchDomain || '').split(',').map(d => d.trim()).filter(Boolean);

                    return (
                      <motion.div
                        layout
                        key={opp.id}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className={cn(
                          "bg-surface/90 backdrop-blur-xl rounded-3xl p-6 border transition-all flex flex-col justify-between group hover:-translate-y-0.5 shadow-sm hover:shadow-sm",
                          expired ? "border-slate-200 opacity-80" : "border-slate-200/80"
                        )}
                      >
                        <div>
                          {/* Top Badges & Bookmark */}
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-brand border border-blue-100 rounded-xl text-xs font-medium capitalize">
                                {opp.opportunityType || 'PhD Position'}
                              </span>
                              {expired ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-xs font-medium capitalize">
                                  Expired
                                </span>
                              ) : opp.funding ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-2xs font-bold">
                                  {opp.funding}
                                </span>
                              ) : null}
                            </div>
                            
                            <button
                              onClick={(e) => toggleSaveOpportunity(e, opp.id)}
                              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                isSaved ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                              }`}
                            >
                              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500' : ''}`} />
                            </button>
                          </div>

                          {/* Title */}
                          <h3 
                            onClick={() => setSelectedOpportunity(opp)}
                            className="text-base font-semibold text-slate-900 leading-snug mb-3 group-hover:text-brand transition-colors cursor-pointer"
                          >
                            {opp.title}
                          </h3>

                          {/* Supervisor Author Info */}
                          <div className="flex items-center gap-3 mb-4 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100">
                            {opp.author?.image ? (
                              <img src={opp.author.image} className="w-9 h-9 rounded-full object-cover border border-surface shadow-2xs" alt="" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-brand text-white font-semibold text-xs uppercase flex items-center justify-center border border-surface shadow-2xs shrink-0">
                                {authorInitials}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-400 capitalize leading-none mb-1">
                                {(opp.author?.role as string) === 'RESEARCH_SUPERVISOR' || (opp.author?.role as string) === 'SUPERVISOR' ? 'Research Supervisor' : 'Researcher Lead'}
                              </p>
                              <p className="text-xs font-bold text-slate-800 truncate leading-none">{opp.author?.name || 'Faculty Lead'}</p>
                            </div>
                          </div>

                          {/* Metadata Row: Department, Slots, Mode */}
                          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 mb-4 pb-3 border-b border-slate-100">
                            <span className="flex items-center gap-1.5 truncate">
                              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{opp.department?.split('(')[0].trim() || 'SRMIST'}</span>
                            </span>
                            <span className="flex items-center gap-1.5 truncate">
                              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{opp.positionsCount || 1} {opp.positionsCount === 1 ? 'Position' : 'Positions'}</span>
                            </span>
                          </div>

                          {/* Domain Tags */}
                          {domainsList.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {domainsList.map((tag, idx) => (
                                <span key={idx} className="text-2xs font-bold text-brand bg-blue-50/50 px-2.5 py-0.5 rounded-md">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Short Description */}
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-4 font-medium">
                            {opp.description}
                          </p>
                        </div>

                        {/* Card Footer: Deadline & Action Buttons */}
                        <div>
                          {opp.deadline && (
                            <div className="flex items-center gap-1.5 text-2xs font-bold text-slate-500 mb-3">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>Deadline: {formatDate(opp.deadline)}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2.5 pt-2">
                            <button
                              onClick={() => setSelectedOpportunity(opp)}
                              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-brand text-slate-700 hover:text-brand text-xs font-medium capitalize transition-all bg-surface cursor-pointer"
                            >
                              View Opportunity
                            </button>
                            
                            <button
                              onClick={(e) => handleApplyAction(e, opp)}
                              disabled={expired || isApplied}
                              className={cn(
                                "px-3.5 py-2.5 rounded-xl text-xs font-medium capitalize shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1",
                                isApplied
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                                  : expired
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  : "bg-brand hover:bg-brand-strong text-white active:scale-95 "
                              )}
                            >
                              {isApplied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Applied</span>
                                </>
                              ) : expired ? (
                                <span>Expired</span>
                              ) : (
                                <span>Apply</span>
                              )}
                            </button>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* ─── 4. OPPORTUNITY DETAILS MODAL ─────────────────── */}
      <AnimatePresence>
        {selectedOpportunity && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOpportunity(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
            />
            
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-surface rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-left"
              >
                {/* Modal Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-blue-50 text-brand border border-blue-100 rounded-xl text-xs font-medium capitalize">
                        {selectedOpportunity.opportunityType || 'PhD Position'}
                      </span>
                      {isExpired(selectedOpportunity.deadline) && (
                        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-2xs font-semibold uppercase">
                          Expired
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">
                      {selectedOpportunity.title}
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Department of {selectedOpportunity.department?.split('(')[0].trim()}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setSelectedOpportunity(null)}
                    className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
                  
                  {/* Supervisor Card */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {selectedOpportunity.author?.image ? (
                      <img src={selectedOpportunity.author.image} className="w-12 h-12 rounded-full object-cover border border-surface shadow-sm" alt="" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-brand text-white font-semibold text-sm uppercase flex items-center justify-center border border-surface shadow-sm shrink-0">
                        {selectedOpportunity.author?.name ? selectedOpportunity.author.name[0] : 'PI'}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-slate-400 capitalize">Research Supervisor / Lead</p>
                      <h4 className="text-sm font-bold text-slate-900">{selectedOpportunity.author?.name || 'Faculty Lead'}</h4>
                      <p className="text-xs text-slate-500 font-medium">{selectedOpportunity.author?.department || selectedOpportunity.department}</p>
                    </div>
                  </div>

                  {/* Grid Metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-2xs font-semibold uppercase text-slate-400">Funding</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{selectedOpportunity.funding || 'Fully Funded'}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-2xs font-semibold uppercase text-slate-400">Positions</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{selectedOpportunity.positionsCount || 1} Available</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-2xs font-semibold uppercase text-slate-400">Work Mode</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{selectedOpportunity.mode || 'On Campus'}</p>
                    </div>
                  </div>

                  {/* Funding Details if present */}
                  {selectedOpportunity.fundingDetails && (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900">
                      <p className="font-bold mb-1">Funding Details:</p>
                      <p className="font-medium">{selectedOpportunity.fundingDetails}</p>
                    </div>
                  )}

                  {/* Eligibility List */}
                  {selectedOpportunity.eligibility && selectedOpportunity.eligibility.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium capitalize text-slate-400 mb-2">Eligible Candidates</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedOpportunity.eligibility.map((el, i) => (
                          <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                            ✓ {el}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description & Requirements */}
                  <div>
                    <h4 className="text-xs font-medium capitalize text-slate-400 mb-2">Description & Requirements</h4>
                    <div className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {selectedOpportunity.description}
                    </div>
                  </div>

                  {/* Application Method details */}
                  <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs text-slate-700">
                    <p className="font-bold text-brand mb-1">Application Method:</p>
                    <p className="font-medium">
                      {selectedOpportunity.applicationMethod === 'External Application Link' 
                        ? `Submit via portal: ${selectedOpportunity.applicationUrl || 'External Portal'}`
                        : selectedOpportunity.applicationMethod === 'Email'
                        ? `Direct Email Submission to: ${selectedOpportunity.applicationEmail || selectedOpportunity.author?.email}`
                        : 'Direct One-Click Submission through CuriousBees Institutional Portal.'}
                    </p>
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
                  <div className="text-xs text-slate-500 font-semibold">
                    {selectedOpportunity.deadline ? `Deadline: ${formatDate(selectedOpportunity.deadline)}` : 'Rolling admissions'}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedOpportunity(null)}
                      className="px-5 py-2.5 border border-slate-200 rounded-2xl text-xs font-semibold uppercase text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      onClick={(e) => {
                        handleApplyAction(e, selectedOpportunity);
                        setSelectedOpportunity(null);
                      }}
                      disabled={isExpired(selectedOpportunity.deadline)}
                      className="px-6 py-2.5 bg-brand hover:bg-brand-strong text-white text-xs font-medium capitalize rounded-2xl shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isExpired(selectedOpportunity.deadline) ? 'Expired' : 'Apply Now'}
                    </button>
                  </div>
                </div>

              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ─── 5. PUBLISH OPPORTUNITY DRAWER ─────────────────── */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 cursor-pointer"
            />
            
            {/* Drawer Content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:max-w-xl bg-surface border-l border-slate-200 z-50 p-6 sm:p-8 shadow-2xl flex flex-col justify-between overflow-y-auto text-left"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-slate-900 leading-none">Publish Opportunity</h3>
                      <p className="text-xs text-brand font-medium capitalize mt-1">Research Portal</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDrawerOpen(false)} 
                    className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  
                  {/* Position Title */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500 capitalize">
                      Position Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('title')}
                      placeholder="e.g. PhD Position in Quantum Computing and Photonic Devices"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-slate-400"
                    />
                    {errors.title && <p className="text-2xs text-rose-500 font-bold mt-1">{errors.title.message as string}</p>}
                  </div>

                  {/* Opportunity Type Dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500 capitalize">
                      Opportunity Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      {...register('opportunityType')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all cursor-pointer"
                    >
                      {OPPORTUNITY_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>



                  {/* Searchable Research Domains Multi-Tag */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500 capitalize">
                      Research Domains / Taxonomy <span className="text-rose-500">*</span>
                    </label>
                    
                    {/* Selected Domain Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {domainTags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-brand/10 text-brand border border-brand/20 rounded-xl text-xs font-bold">
                          {tag}
                          <button type="button" onClick={() => handleRemoveDomainTag(tag)} className="hover:text-rose-600">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Predefined Domain Quick-Select */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {PREDEFINED_DOMAINS.map((domain) => (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => handleAddDomainTag(domain)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-2xs font-bold border transition-colors cursor-pointer",
                            domainTags.includes(domain) 
                              ? "bg-brand text-white border-brand" 
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          + {domain}
                        </button>
                      ))}
                    </div>

                    {/* Custom Domain Tag Add Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customDomainInput}
                        onChange={(e) => setCustomDomainInput(e.target.value)}
                        placeholder="Add custom domain..."
                        className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddDomainTag(customDomainInput)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>

                  {/* Positions Available & Funding Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Positions Count */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-500 capitalize">
                        Positions Available <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        {...register('positionsCount')}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand"
                      />
                      {errors.positionsCount && <p className="text-2xs text-rose-500 font-bold">{errors.positionsCount.message as string}</p>}
                    </div>

                    {/* Funding Select */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-500 capitalize">
                        Funding Status
                      </label>
                      <select
                        {...register('funding')}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand"
                      >
                        {FUNDING_OPTIONS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Funding Details (Optional) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500 capitalize">
                      Funding Details (Optional)
                    </label>
                    <input
                      type="text"
                      {...register('fundingDetails')}
                      placeholder="e.g. ₹35,000/month fellowship for 3 years"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand"
                    />
                  </div>

                  {/* Multi-Select Eligibility Checkboxes */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500 capitalize">
                      Eligible Candidates
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      {ELIGIBILITY_OPTIONS.map((option) => (
                        <div 
                          key={option}
                          onClick={() => toggleEligibility(option)}
                          className="flex items-center gap-2 cursor-pointer py-1"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            eligibilityTags.includes(option) ? 'bg-brand border-brand' : 'border-slate-300'
                          }`}>
                            {eligibilityTags.includes(option) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-xs font-bold text-slate-700">{option}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Application Deadline & Work Mode */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-500 capitalize">
                        Application Deadline
                      </label>
                      <input
                        type="date"
                        min={todayISO}
                        {...register('deadline')}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-500 capitalize">
                        Work Mode
                      </label>
                      <select
                        {...register('mode')}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand"
                      >
                        {MODE_OPTIONS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description & Requirements */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500 capitalize">
                      Opportunity Description & Requirements <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      {...register('description')}
                      placeholder="Describe the research project, responsibilities, required qualifications, expected outcomes, funding details, and application process..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-slate-400 resize-none"
                    />
                    {errors.description && <p className="text-2xs text-rose-500 font-bold">{errors.description.message as string}</p>}
                  </div>

                  {/* Application Method Select */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500 capitalize">
                      Application Method
                    </label>
                    <select
                      {...register('applicationMethod')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand"
                    >
                      {APPLICATION_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic External Link or Email Field */}
                  {selectedAppMethod === 'External Application Link' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-500 capitalize">
                        Application URL
                      </label>
                      <input
                        type="url"
                        {...register('applicationUrl')}
                        placeholder="https://srmist.edu.in/careers/research-slot-102"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand"
                      />
                    </div>
                  )}

                  {selectedAppMethod === 'Email' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-500 capitalize">
                        Application Email
                      </label>
                      <input
                        type="email"
                        {...register('applicationEmail')}
                        placeholder="supervisor@srmist.edu.in"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand"
                      />
                    </div>
                  )}

                  {/* Submit Buttons Footer */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsDrawerOpen(false)}
                      className="px-5 py-3 border border-slate-200 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-medium capitalize cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-brand hover:bg-brand-strong text-white text-xs font-medium capitalize rounded-2xl shadow-md  transition-all active:scale-95 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span className="w-4 h-4 border-2 border-surface border-t-transparent animate-spin rounded-full" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 shrink-0" />
                          <span>Publish Opportunity</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
