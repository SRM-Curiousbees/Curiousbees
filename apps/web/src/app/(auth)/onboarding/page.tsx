'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { 
  LogOut, 
  ShieldAlert,
  Loader2,
  Shield,
  GraduationCap,
  Briefcase,
  Search,
  Users,
  UserCheck,
  Building,
  Hash,
  Award,
  BookOpen,
  ChevronDown,
  ArrowRight,
  Sparkles,
  X,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import SRMLogo from '@/components/SRMLogo';
import { MAX_SCHOLARS_PER_SUPERVISOR } from '@curiousbees/constants';


const RESEARCH_DOMAINS = [
  "AI Hallucination",
  "AI Injection",
  "AI-Assisted Coding",
  "Additive Manufacturing (3D Printing)",
  "Agriculture and Precision Farming",
  "Analytical Intelligence and Machine Learning",
  "Applied Mathematics and Modeling",
  "Astrophysics and Cosmology",
  "Augmented and Virtual Reality",
  "Autonomous Vehicles and Drones",
  "Behavioral Economics",
  "Big Data Mining",
  "Bioinformatics and Systems Biology",
  "Biomedical Engineering",
  "Biometrics",
  "Biomimicry and Bio-inspired Design",
  "Blockchain",
  "Brain-Computer Interfaces (BCI)",
  "Climate Change and Environmental Modeling",
  "Cloud Computing and Virtualization",
  "Cognitive Computing",
  "Computational Linguistics",
  "Computer Vision",
  "Conversational AI and Chatbot",
  "Cryptography and Network Security",
  "Cybersecurity and Crypto",
  "Cybersecurity and Privacy",
  "Data Science and Statistics",
  "Deep Learning",
  "DevSecOps and Automated Engineering",
  "Digital Humanities",
  "E-commerce and Digital Marketing",
  "Edge AI",
  "Edge Computing",
  "Embedded Systems and VLSI",
  "Epidemiology and Public Health",
  "Ethics of Technology",
  "Explainable AI (XAI)",
  "Financial Technology (FinTech)",
  "Fluid Dynamics and Heat Transfer",
  "Game Development and Design",
  "Gen AI",
  "Genomics and Biotechnology",
  "Geoinformatics and Remote Sensing",
  "Health Information",
  "High-Performance Computing (HPC)",
  "Human Computer Interaction",
  "ILP",
  "Internet of Things",
  "LLM",
  "Mixed Reality (MR)",
  "Mobile and Web App",
  "Multi-Agent Systems",
  "NLP",
  "Nanotechnology and Advanced Materials",
  "Neuromorphic Computing",
  "Neuroscience",
  "Operations Research and Supply Chain",
  "Pharmacology and Oncology",
  "Power Systems and Smart Grids",
  "Precision Medicine",
  "Privacy-Preserving Machine Learning",
  "Prompt Engineering and Optimization",
  "Quantum Computing",
  "Reinforcement Learning",
  "Robotics and Autonomous Systems",
  "Sociology and Urban Planning",
  "Software Engineering and DevOps",
  "Space Systems Engineering",
  "Statistical Thermodynamics",
  "Structural Engineering and Materials",
  "Sustainable Energy and Cleantech",
  "Synthetic Biology",
  "Telecommunications and 5G/6G Networks",
  "Water Resources Engineering"
];

export default function OnboardingPage() {
  const router = useRouter();
  const { 
    currentUser, 
    syncUserSession, 
    logout 
  } = useStore();

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<'SCHOLAR' | 'SUPERVISOR'>('SCHOLAR');
  
  // Academic selections
  const [faculties, setFaculties] = useState<any[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  
  // Role-specific fields
  // Supervisor
  
  // Scholar / Research Area
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [domainSearch, setDomainSearch] = useState('');
  const domainListRef = useRef<HTMLDivElement>(null);

  
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);

  // Derived: Check if role is pre-assigned by admin
  const userRoleStr = String(currentUser?.role || '');
  const hasAssignedRole = Boolean(currentUser?.role);
  const assignedRoleLabel = 
    userRoleStr.includes('SUPERVISOR')
      ? 'Research Supervisor'
      : userRoleStr.includes('SCHOLAR')
      ? 'Research Scholar'
      : null;

  // Check if they are already onboarded and pre-select role
  useEffect(() => {
    if (currentUser) {
      const r = String(currentUser.role || '');
      // Pre-select role if already assigned in DB
      if (r.includes('SUPERVISOR')) {
        setRole('SUPERVISOR');
      } else {
        setRole('SCHOLAR');
      }

      if (currentUser.onboardingCompleted) {
        if (r.includes('SUPERVISOR') && !currentUser.departmentId) {
          return;
        }

        if (currentUser.role === 'RESEARCH_SCHOLAR') {
          if (currentUser.approved && currentUser.supervisorId && currentUser.status === 'ACTIVE') {
            router.replace('/feed');
          } else {
            router.replace('/verification-pending');
          }
          return;
        }

        if (currentUser.role === 'RESEARCH_SUPERVISOR') {
          if (currentUser.approved && currentUser.status === 'ACTIVE') {
            router.replace('/supervisor');
          } else {
            router.replace('/verification-pending');
          }
          return;
        }

        if (currentUser.role === 'INSTITUTE_ADMIN') {
          router.replace('/admin/dashboard');
          return;
        }

        router.replace('/verification-pending');
      }
    }
  }, [currentUser, router]);

  // Fetch faculties on mount
  useEffect(() => {
    const fetchFaculties = async () => {
      setLoadingFaculties(true);
      try {
        const { apiFetch } = await import('@/lib/api-client');
        const res = await apiFetch('/api/faculties', { skipAuth: true });
        if (res.ok) {
          const data = await res.json();
          setFaculties(data);
          if (currentUser?.faculty) {
            const fac = currentUser.faculty;
            const match = data.find((f: any) => f.name.toLowerCase().includes(fac.toLowerCase()) || fac.toLowerCase().includes(f.name.toLowerCase()));
            if (match) {
              setSelectedFacultyId(match.id);
            }
          }
        } else {
          setErrorMsg('Failed to fetch faculties from the server.');
        }
      } catch (e) {
        console.error('Failed to load faculties:', e);
        setErrorMsg('Network error while fetching faculties.');
      } finally {
        setLoadingFaculties(false);
      }
    };
    fetchFaculties();
  }, [currentUser]);

  // Fetch departments when faculty changes
  useEffect(() => {
    if (!selectedFacultyId) {
      setDepartments([]);
      setSelectedDepartmentId('');
      return;
    }
    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const { apiFetch } = await import('@/lib/api-client');
        const res = await apiFetch(`/api/departments?facultyId=${selectedFacultyId}`, { skipAuth: true });
        if (res.ok) {
          const data = await res.json();
          setDepartments(data);
          if (currentUser?.department) {
            const deptName = currentUser.department;
            const match = data.find((d: any) => d.name.toLowerCase().includes(deptName.toLowerCase()) || deptName.toLowerCase().includes(d.name.toLowerCase()));
            if (match) {
              setSelectedDepartmentId(match.id);
            }
          }
        } else {
          setErrorMsg('Failed to fetch departments from the server.');
        }
      } catch (e) {
        console.error('Failed to load departments:', e);
        setErrorMsg('Network error while fetching departments.');
      } finally {
        setLoadingDepartments(false);
      }
    };
    fetchDepartments();
  }, [selectedFacultyId, currentUser]);

  // Fetch supervisors when department/faculty is selected (for scholars)
  useEffect(() => {
    if (role !== 'SCHOLAR' || !selectedFacultyId || !selectedDepartmentId) {
      setSupervisors([]);
      setSelectedSupervisorId('');
      return;
    }
    const fetchSupervisors = async () => {
      setLoadingSupervisors(true);
      try {
        const { apiFetch } = await import('@/lib/api-client');
        const res = await apiFetch(`/api/supervisors?facultyId=${selectedFacultyId}&departmentId=${selectedDepartmentId}`, { skipAuth: true });
        if (res.ok) {
          const data = await res.json();
          setSupervisors(data);
        }
      } catch (e) {
        console.error('Failed to load supervisors:', e);
      } finally {
        setLoadingSupervisors(false);
      }
    };
    fetchSupervisors();
  }, [role, selectedFacultyId, selectedDepartmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setErrorMsg('Please select a role.');
      return;
    }
    if (!selectedFacultyId || !selectedDepartmentId) {
      setErrorMsg('Please select your Faculty and Department.');
      return;
    }

    const finalResearchArea = selectedDomains.join(', ');

    if (role === 'SUPERVISOR') {
      if (!finalResearchArea) {
        setErrorMsg('Please select at least one Research Area.');
        return;
      }
      if (!currentUser?.departmentId && (!selectedFacultyId || !selectedDepartmentId)) {
        setErrorMsg('Please select your Faculty and Department.');
        return;
      }
    } else {
      if (!selectedFacultyId || !selectedDepartmentId) {
        setErrorMsg('Please select your Faculty and Department.');
        return;
      }
      if (!finalResearchArea) {
        setErrorMsg('Please select at least one Research Area.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { apiFetch } = await import('@/lib/api-client');
      const endpoint = role === 'SUPERVISOR' 
        ? '/api/users/onboarding/supervisor' 
        : '/api/users/onboarding/scholar';

      const body = role === 'SUPERVISOR' 
        ? {
            ...(selectedFacultyId && { facultyId: selectedFacultyId }),
            ...(selectedDepartmentId && { departmentId: selectedDepartmentId }),
            researchArea: finalResearchArea,
            maxScholars: MAX_SCHOLARS_PER_SUPERVISOR,
          }
        : {
            facultyId: selectedFacultyId,
            departmentId: selectedDepartmentId,
            researchArea: finalResearchArea,
            ...(selectedSupervisorId ? { supervisorId: selectedSupervisorId } : {}),
          };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to complete onboarding');
      }

      await syncUserSession({ force: true });
      if (role === 'SUPERVISOR') {
        router.replace('/feed');
      } else {
        router.replace('/verification-pending');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to submit onboarding details.');
      setIsSubmitting(false);
    }
  };

  const toggleDomain = useCallback((domain: string) => {
    const currentScroll = domainListRef.current?.scrollTop;
    setSelectedDomains(prev => 
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
    if (currentScroll !== undefined && domainListRef.current) {
      requestAnimationFrame(() => {
        if (domainListRef.current) {
          domainListRef.current.scrollTop = currentScroll;
        }
      });
    }
  }, []);

  const filteredDomains = useMemo(() => 
    RESEARCH_DOMAINS.filter(d => d.toLowerCase().includes(domainSearch.toLowerCase())),
    [domainSearch]
  );

  const researchAreaSelectionBlock = (
    <div className="space-y-3 text-left">
      <label className="block text-xs font-medium text-blue-950/70 capitalize">
        Research Area / Domain (Select Multiple)
      </label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-blue-400 group-focus-within:text-yellow-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search research areas..."
          value={domainSearch}
          onChange={(e) => setDomainSearch(e.target.value)}
          className="w-full cb-input py-2.5 pl-10 pr-4 text-xs border border-blue-200/60 rounded-xl focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-400/50 bg-surface/50 font-semibold text-blue-950 transition-all placeholder:text-blue-300 hover:border-blue-300"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2.5 border border-blue-100 rounded-xl bg-blue-50/30 shadow-inner custom-scrollbar">
        {filteredDomains.length > 0 ? (
          filteredDomains.map(domain => (
            <label key={domain} className="flex items-start gap-2.5 cursor-pointer p-2 hover:bg-surface rounded-lg transition-all duration-200 hover:shadow-sm text-xs font-bold text-blue-900/80 hover:text-blue-950 group">
              <input 
                type="checkbox" 
                checked={selectedDomains.includes(domain)} 
                onChange={() => toggleDomain(domain)}
                className="mt-0.5 w-3.5 h-3.5 rounded-sm border-blue-300 text-blue-600 focus:ring-yellow-400/40 focus:ring-offset-0 bg-surface transition-all cursor-pointer"
              />
              <span className="leading-tight pt-[1px]">{domain}</span>
            </label>
          ))
        ) : (
          <div className="col-span-full py-8 text-center text-xs font-semibold text-blue-400">
            No research areas found matching "{domainSearch}"
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="theme-static bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 min-h-screen flex items-start justify-center p-6 pt-12 pb-12 relative overflow-y-auto font-sans w-full">
      {/* Decorative background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Top Header Bar with SRM Logo */}
      <div className="fixed top-6 left-6 right-6 flex items-center justify-between z-30 pointer-events-none">
        <div className="pointer-events-auto">
          <SRMLogo size={42} variant="full" theme="light" />
        </div>
        <button 
          onClick={() => { logout(); router.push('/login'); }}
          className="pointer-events-auto flex items-center space-x-1.5 px-4 py-2 border border-white/10 rounded-full text-xs font-bold text-white/70 hover:text-yellow-400 hover:bg-white/5 hover:border-yellow-400/30 transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-md"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Centered Glass Container Card */}
      <main className="w-full max-w-lg relative z-10">
        <div className="bg-surface/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center space-y-5">
          
          {/* Logo container box */}
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-blue-100 shadow-md bg-surface flex items-center justify-center">
            <Logo showText={false} size={38} />
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-semibold text-2xl text-blue-950 tracking-tight leading-tight">
              {role === 'SUPERVISOR' && currentUser?.name ? (
                `Welcome, ${/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)/i.test(currentUser.name.trim()) ? currentUser.name.trim() : `Dr. ${currentUser.name.trim()}`}`
              ) : (
                'Complete Your Profile'
              )}
            </h1>
            <p className="text-xs text-blue-600/70 font-semibold max-w-sm">
              {role === 'SUPERVISOR'
                ? 'Complete your research profile to start collaborating.'
                : 'Setup your institutional profile to start collaborating.'}
            </p>
          </div>

          {/* Step Progress Indicator */}
          <div className="w-full flex items-center justify-between px-2 pt-1 pb-2 border-b border-blue-100/60">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                currentStep === 1 ? "theme-static bg-yellow-400 text-blue-950 shadow-md scale-105" : "bg-brand text-white"
              )}>
                {selectedDomains.length > 0 && currentStep === 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : "1"}
              </span>
              <span className={cn(
                "text-xs font-bold transition-colors",
                currentStep === 1 ? "text-blue-950 font-semibold" : "text-blue-900/60 group-hover:text-blue-950"
              )}>
                Research Areas
              </span>
            </button>

            <div className="h-0.5 flex-1 mx-4 bg-blue-200/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-400 transition-all duration-500 ease-out" 
                style={{ width: currentStep === 1 ? '50%' : '100%' }}
              />
            </div>

            <button
              type="button"
              disabled={selectedDomains.length === 0}
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 group disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                currentStep === 2 ? "theme-static bg-yellow-400 text-blue-950 shadow-md scale-105" : "bg-blue-100 text-blue-900/40"
              )}>
                2
              </span>
              <span className={cn(
                "text-xs font-bold transition-colors",
                currentStep === 2 ? "text-blue-950 font-semibold" : "text-blue-900/60 group-hover:text-blue-950"
              )}>
                Profile & Faculty
              </span>
            </button>
          </div>

          {/* STEP 1: Dedicated Research Area Selection */}
          {currentStep === 1 ? (
            <div className="w-full space-y-6">
              <div className="space-y-1.5 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/15 border border-yellow-400/30 text-yellow-600 text-xs font-medium capitalize mb-1">
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  <span>Step 1 of 2</span>
                </div>
                <h2 className="font-display font-semibold text-xl text-blue-950 tracking-tight">
                  Select Your Research Domains
                </h2>
                <p className="text-xs text-blue-900/60 font-semibold max-w-sm mx-auto">
                  Choose your primary areas of research interest and expertise to personalize your academic collaboration network.
                </p>
              </div>

              {/* Search & Selection Controls */}
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-blue-950/70 capitalize">
                    Available Domains ({RESEARCH_DOMAINS.length})
                  </label>
                  <span className={cn(
                    "text-2xs font-semibold px-2.5 py-0.5 rounded-full shadow-sm transition-all",
                    selectedDomains.length > 0 ? "bg-brand text-white" : "bg-blue-100 text-blue-400"
                  )}>
                    {selectedDomains.length} Selected
                  </span>
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-blue-400 group-focus-within:text-yellow-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search 75+ research areas..."
                    value={domainSearch}
                    onChange={(e) => setDomainSearch(e.target.value)}
                    className="w-full cb-input py-2.5 pl-10 pr-10 text-xs border border-blue-200/60 rounded-xl focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-400/50 bg-surface/60 font-semibold text-blue-950 transition-all placeholder:text-blue-300 hover:border-blue-300"
                  />
                  {domainSearch && (
                    <button
                      type="button"
                      onClick={() => setDomainSearch('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-400 hover:text-blue-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Selected summary — always rendered, fixed height, no layout shift */}
                <div className="flex items-center gap-2 p-2 rounded-xl border transition-all h-10" style={{ minHeight: '40px' }}>
                  {selectedDomains.length > 0 ? (
                    <>
                      <span className="text-2xs font-semibold text-blue-950/70 shrink-0">
                        {selectedDomains.length} picked:
                      </span>
                      <div className="flex gap-1 flex-1 overflow-hidden">
                        {selectedDomains.slice(0, 3).map(d => (
                          <span key={d} className="text-2xs bg-brand text-white font-bold px-1.5 py-0.5 rounded truncate max-w-[120px]">{d}</span>
                        ))}
                        {selectedDomains.length > 3 && (
                          <span className="text-2xs bg-blue-200 text-blue-950 font-bold px-1.5 py-0.5 rounded shrink-0">+{selectedDomains.length - 3}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDomains([])}
                        className="text-2xs font-bold text-blue-500 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                      >
                        Clear
                      </button>
                    </>
                  ) : (
                    <span className="text-2xs font-semibold text-blue-300 mx-auto">Select domains from the list below</span>
                  )}
                </div>

                {/* Domain checklist grid with ref and scroll preservation */}
                <div 
                  ref={domainListRef}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 h-[280px] overflow-y-auto p-2 border border-blue-100 rounded-xl bg-blue-50/30 shadow-inner custom-scrollbar"
                >
                  {filteredDomains.length > 0 ? (
                    filteredDomains.map(domain => {
                      const isSelected = selectedDomains.includes(domain);
                      return (
                        <button
                          type="button"
                          key={domain} 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleDomain(domain);
                          }}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer px-2.5 py-2 rounded-lg transition-colors text-xs font-bold border select-none w-full text-left outline-none focus:ring-2 focus:ring-yellow-400/50",
                            isSelected
                              ? "bg-brand text-white border-blue-500 shadow-sm"
                              : "bg-surface/80 hover:bg-surface text-blue-900/80 hover:text-blue-950 border-transparent hover:border-blue-200"
                          )}
                        >
                          <div className={cn(
                            "w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0",
                            isSelected ? "theme-static bg-yellow-400 border-yellow-400 text-blue-950" : "border-blue-300 bg-surface"
                          )}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="leading-snug truncate">{domain}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-full py-8 text-center text-xs font-semibold text-blue-400">
                      No research areas found matching &quot;{domainSearch}&quot;
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={selectedDomains.length === 0}
                onClick={() => setCurrentStep(2)}
                className="theme-static w-full py-3.5 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-blue-950 font-semibold text-sm uppercase tracking-wide rounded-xl transition-all duration-300 disabled:opacity-40 disabled:hover:bg-yellow-400 cursor-pointer shadow-xl hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span>Continue to Profile Setup</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          ) : (
            /* STEP 2: Profile & Academic Registration */
            <form onSubmit={handleSubmit} className="w-full space-y-6 text-left animate-in fade-in slide-in-from-right-4 duration-300">

              {/* Selected Domains Summary Card with Edit Button */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-medium capitalize text-blue-950/60 block mb-1">
                    Selected Research Domains ({selectedDomains.length})
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden text-ellipsis">
                    {selectedDomains.slice(0, 3).map((d) => (
                      <span key={d} className="text-2xs bg-brand text-white font-bold px-2 py-0.5 rounded">
                        {d}
                      </span>
                    ))}
                    {selectedDomains.length > 3 && (
                      <span className="text-2xs bg-blue-200 text-blue-950 font-bold px-1.5 py-0.5 rounded">
                        +{selectedDomains.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-surface border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all shrink-0 cursor-pointer shadow-sm"
                >
                  Edit
                </button>
              </div>



              {role && (
                <div className="space-y-4">
                  {/* Academic Registry */}
                  {role === 'SUPERVISOR' && (currentUser?.faculty || currentUser?.department) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                      <div className="text-left">
                        <span className="text-xs font-medium capitalize text-blue-400 block mb-1">Faculty</span>
                        <span className="text-xs font-semibold text-blue-950">{currentUser.faculty || 'School of Computing'}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-medium capitalize text-blue-400 block mb-1">Department</span>
                        <span className="text-xs font-semibold text-blue-950">{currentUser.department || 'Computer Applications'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-medium text-blue-950/70 capitalize" htmlFor="faculty-select">
                          Faculty
                        </label>
                        <div className="relative group">
                          <select
                            id="faculty-select"
                            value={selectedFacultyId}
                            onChange={(e) => setSelectedFacultyId(e.target.value)}
                            className="w-full cb-input py-2.5 pl-4 pr-10 text-xs border border-blue-200/60 rounded-xl bg-surface/50 font-bold text-blue-950 focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-400/50 appearance-none transition-all hover:border-blue-300"
                          >
                            <option value="">Select Faculty...</option>
                            {faculties.map((f) => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                          {loadingFaculties ? (
                            <span className="absolute right-3 top-3 pointer-events-none">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            </span>
                          ) : (
                            <span className="absolute right-3 top-3 pointer-events-none transition-transform group-hover:translate-y-0.5">
                              <ChevronDown className="w-4 h-4 text-blue-400" />
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-medium text-blue-950/70 capitalize" htmlFor="department-select">
                          Department
                        </label>
                        <div className="relative group">
                          <select
                            id="department-select"
                            value={selectedDepartmentId}
                            onChange={(e) => setSelectedDepartmentId(e.target.value)}
                            disabled={!selectedFacultyId}
                            className="w-full cb-input py-2.5 pl-4 pr-10 text-xs border border-blue-200/60 rounded-xl bg-surface/50 font-bold text-blue-950 focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-400/50 appearance-none disabled:bg-slate-50/50 disabled:text-slate-400 disabled:border-slate-200 transition-all hover:border-blue-300"
                          >
                            <option value="">Select Department...</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          {loadingDepartments ? (
                            <span className="absolute right-3 top-3 pointer-events-none">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            </span>
                          ) : (
                            <span className="absolute right-3 top-3 pointer-events-none transition-transform group-hover:translate-y-0.5">
                              <ChevronDown className="w-4 h-4 text-blue-400" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scholar Details */}
                  {role === 'SCHOLAR' && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2 text-left">
                        <label className="block text-xs font-medium text-blue-950/70 capitalize">
                          Select Research Supervisor
                        </label>
                        {(!selectedFacultyId || !selectedDepartmentId) ? (
                          <div className="border border-blue-100 rounded-xl p-6 bg-blue-50/50 text-center flex flex-col items-center gap-2">
                            <Users className="w-6 h-6 text-blue-300" />
                            <p className="text-xs text-blue-900/60 font-bold max-w-xs">Select your Faculty and Department above to view available supervisors.</p>
                          </div>
                        ) : (
                          <div className="border border-blue-100 rounded-xl max-h-[160px] overflow-y-auto bg-surface/50 p-1.5 shadow-inner custom-scrollbar space-y-1">
                            {loadingSupervisors ? (
                              <div className="p-6 text-center text-xs text-blue-900/60 font-bold flex flex-col items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                <span>Loading supervisors...</span>
                              </div>
                            ) : supervisors.length > 0 ? (
                              supervisors.map((sup) => {
                                const atCapacity = sup.currentScholars >= sup.maxScholars;
                                return (
                                  <div
                                    key={sup.id}
                                    onClick={() => !atCapacity && setSelectedSupervisorId(sup.id)}
                                    className={cn(
                                      "flex items-center justify-between p-3 rounded-lg transition-all duration-200 text-xs",
                                      atCapacity 
                                        ? "opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border border-transparent"
                                        : selectedSupervisorId === sup.id 
                                          ? 'bg-brand text-white shadow-md transform scale-[1.01] border border-blue-500' 
                                          : 'hover:bg-surface text-blue-950 cursor-pointer border border-transparent hover:border-blue-100 hover:shadow-sm'
                                    )}
                                  >
                                    <div className="min-w-0">
                                      <h4 className="font-semibold flex items-center gap-2">
                                        <span>{sup.name}</span>
                                        <span className={cn(
                                          "text-xs px-2 py-0.5 rounded-full capitalize border",
                                          selectedSupervisorId === sup.id 
                                            ? "bg-brand/50 text-white border-blue-400/30"
                                            : atCapacity 
                                              ? "bg-red-50 text-red-600 border-red-200" 
                                              : "bg-blue-50 text-blue-600 border-blue-200"
                                        )}>
                                          {sup.designation}
                                        </span>
                                      </h4>
                                      <span className={cn(
                                        "text-2xs font-bold block mt-1.5",
                                        selectedSupervisorId === sup.id ? 'text-blue-100' : 'text-blue-900/50'
                                      )}>
                                        Capacity: {sup.currentScholars} / {sup.maxScholars} scholars mapped
                                      </span>
                                    </div>
                                    <div className="shrink-0 flex items-center">
                                      {selectedSupervisorId === sup.id && (
                                        <UserCheck className="w-5 h-5 text-yellow-400 ml-2" />
                                      )}
                                      {atCapacity && (
                                        <span className="text-xs bg-red-100 text-red-700 font-medium capitalize px-2.5 py-1 rounded-full border border-red-200">
                                          Full Capacity
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-8 text-xs text-blue-900/40 flex flex-col items-center justify-center space-y-2 font-bold">
                                <Users className="w-5 h-5 opacity-40" />
                                <span>No supervisors registered in this department.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl flex items-center space-x-2 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="py-3.5 px-4 bg-surface hover:bg-blue-50 border border-blue-200 text-blue-950 font-semibold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting || 
                    (role === 'SUPERVISOR' && selectedDomains.length === 0) ||
                    (role === 'SCHOLAR' && (!selectedFacultyId || !selectedDepartmentId || selectedDomains.length === 0))
                  }
                  className="theme-static flex-1 py-3.5 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-blue-950 font-semibold text-sm uppercase tracking-wide rounded-xl transition-all duration-300 disabled:opacity-40 disabled:hover:bg-yellow-400 cursor-pointer shadow-xl hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4.5 h-4.5 animate-spin mr-2 text-blue-900" />
                      <span>Registering Profile...</span>
                    </>
                  ) : (
                    <span>Complete Registration</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Intranet notice */}
          <div className="pt-6 border-t border-blue-100/50 flex items-center justify-center gap-2 text-blue-900/30 select-none">
            <Shield className="w-4 h-4 shrink-0" />
            <p className="text-xs font-medium capitalize">
              SRMIST Institutional Security Standard
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
