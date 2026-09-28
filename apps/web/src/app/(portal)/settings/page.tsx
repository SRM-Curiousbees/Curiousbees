'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { apiFetch } from '@/lib/api-client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateProfileSchema } from '@curiousbees/shared-utils';
import {
  User,
  Tag,
  Plus,
  X,
  Lock,
  Loader2,
  Check,
  ShieldCheck,
  Layers,
  Bell,
  Sun,
  Moon,
  Monitor,
  Palette,
  ExternalLink,
  RefreshCw,
  Video,
  MessageSquare,
  Calendar,
  Key,
  Mail,
  GraduationCap,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Radio,
  Building,
  HelpCircle,
  Clock,
  LogOut,
  ChevronRight,
  Globe,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { RoleBadge } from '@/components/shared/role-badge';
import { getProfileImageUrl } from '@/lib/avatar';

function UnifiedSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'identity';

  const {
    currentUser,
    updateProfile,
    interestsList,
    theme,
    setTheme,
    toggleTheme,
    integrationConnections,
    fetchIntegrationStatus,
    getGoogleAuthUrl,
    getZoomAuthUrl,
    disconnectIntegration,
    addToast,
    logout
  } = useStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [newInterestInput, setNewInterestInput] = useState('');
  
  // Integrations state
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<'GOOGLE' | 'ZOOM' | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<'GOOGLE_WORKSPACE' | 'ZOOM_WORKPLACE' | null>(null);

  // Appearance & UI Preferences state (persisted in localStorage)
  const [feedSortPreference, setFeedSortPreference] = useState<'latest' | 'top'>('latest');
  const [compactCards, setCompactCards] = useState<boolean>(false);
  const [autoExpandAbstracts, setAutoExpandAbstracts] = useState<boolean>(false);

  // Notifications preferences state (persisted locally / profile)
  const [notifPreferences, setNotifPreferences] = useState({
    researchPapers: true,
    collaborations: true,
    advisoryMilestones: true,
    opportunities: true,
    events: true,
    emailDigest: 'instant', // 'instant' | 'daily' | 'weekly' | 'none'
    soundEffects: true
  });

  // Supervisor specific state
  const [supervisionCapacity, setSupervisionCapacity] = useState<number>(6);
  const [acceptingScholars, setAcceptingScholars] = useState<boolean>(true);
  const [labName, setLabName] = useState<string>('SRM Center for Advanced Intelligence & Systems');
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await apiFetch('/api/departments');
        if (res.ok) {
          const data = await res.json();
          setDepartments(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load departments', err);
      }
    }
    loadDepts();
  }, []);

  // Setup form validation
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      name: currentUser?.name || '',
      role: currentUser?.role || 'RESEARCH_SCHOLAR',
      department: currentUser?.department || '',
      bio: currentUser?.bio || '',
    }
  });

  // Sync profile details on load
  useEffect(() => {
    if (currentUser) {
      reset({
        name: currentUser.name || '',
        role: currentUser.role || 'RESEARCH_SCHOLAR',
        department: currentUser.department || '',
        bio: currentUser.bio || '',
      });
      setSelectedInterests(currentUser.interests?.map((i: any) => i.interest?.name || '') || []);
    }
  }, [currentUser, reset]);

  // Load preferences from local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFeedSort = localStorage.getItem('cb_pref_feed_sort') as 'latest' | 'top';
      if (savedFeedSort) setFeedSortPreference(savedFeedSort);

      const savedCompact = localStorage.getItem('cb_pref_compact_cards');
      if (savedCompact !== null) setCompactCards(savedCompact === 'true');

      const savedAutoExpand = localStorage.getItem('cb_pref_auto_abstracts');
      if (savedAutoExpand !== null) setAutoExpandAbstracts(savedAutoExpand === 'true');

      const savedNotifs = localStorage.getItem('cb_pref_notifications');
      if (savedNotifs) {
        try {
          setNotifPreferences(JSON.parse(savedNotifs));
        } catch (e) {}
      }
    }
  }, []);

  // Fetch integrations when tab is active
  useEffect(() => {
    if (activeTab === 'integrations') {
      setLoadingIntegrations(true);
      fetchIntegrationStatus().finally(() => setLoadingIntegrations(false));
    }
  }, [activeTab, fetchIntegrationStatus]);

  const handleProfileSubmit = async (data: any) => {
    const payload = {
      ...data,
      interests: selectedInterests
    };

    try {
      await updateProfile(payload);
      addToast('Profile & account settings saved successfully!', 'success');
    } catch (e: any) {
      addToast(`Error updating settings: ${e.message}`, 'error');
    }
  };

  const handleAddInterest = (name: string) => {
    const cleaned = name.trim();
    if (cleaned && !selectedInterests.includes(cleaned)) {
      if (selectedInterests.length >= 8) {
        addToast('You can select up to 8 research domains only.', 'info');
        return;
      }
      setSelectedInterests([...selectedInterests, cleaned]);
    }
    setNewInterestInput('');
  };

  const handleRemoveInterest = (name: string) => {
    setSelectedInterests(selectedInterests.filter(t => t !== name));
  };

  const handleConnectGoogle = async () => {
    try {
      setConnectingProvider('GOOGLE');
      const callbackUrl = `${window.location.origin}/settings/integrations/callback`;
      const res = await getGoogleAuthUrl(callbackUrl);
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err: any) {
      addToast(err.message || 'Could not initialize Google Workspace authorization.', 'error');
      setConnectingProvider(null);
    }
  };

  const handleConnectZoom = async () => {
    try {
      setConnectingProvider('ZOOM');
      const callbackUrl = `${window.location.origin}/settings/integrations/callback`;
      const res = await getZoomAuthUrl(callbackUrl);
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err: any) {
      addToast(err.message || 'Could not initialize Zoom authorization.', 'error');
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (provider: 'GOOGLE_WORKSPACE' | 'ZOOM_WORKPLACE') => {
    if (!confirm(`Are you sure you want to unlink ${provider === 'GOOGLE_WORKSPACE' ? 'Google Workspace' : 'Zoom Workplace'}?`)) {
      return;
    }
    try {
      setDisconnectingProvider(provider);
      await disconnectIntegration(provider);
      addToast(`${provider === 'GOOGLE_WORKSPACE' ? 'Google Workspace' : 'Zoom'} unlinked successfully.`, 'info');
    } catch (err: any) {
      addToast(err.message || 'Failed to disconnect integration.', 'error');
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const saveFeedSort = (val: 'latest' | 'top') => {
    setFeedSortPreference(val);
    localStorage.setItem('cb_pref_feed_sort', val);
    addToast(`Feed default sorting updated to ${val === 'latest' ? 'Most Recent' : 'Top Trending'}`, 'success');
  };

  const toggleCompactMode = () => {
    const nextVal = !compactCards;
    setCompactCards(nextVal);
    localStorage.setItem('cb_pref_compact_cards', String(nextVal));
    addToast(`Card layout set to ${nextVal ? 'Compact view' : 'Comfortable view'}`, 'info');
  };

  const toggleAutoExpand = () => {
    const nextVal = !autoExpandAbstracts;
    setAutoExpandAbstracts(nextVal);
    localStorage.setItem('cb_pref_auto_abstracts', String(nextVal));
  };

  const handleNotifToggle = (key: keyof typeof notifPreferences) => {
    setNotifPreferences(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('cb_pref_notifications', JSON.stringify(updated));
        window.dispatchEvent(new Event('cb-preferences-updated'));
      }
      return updated;
    });
    addToast('Notification preferences updated.', 'info');
  };

  const handleDigestChange = (val: string) => {
    setNotifPreferences(prev => {
      const updated = { ...prev, emailDigest: val };
      if (typeof window !== 'undefined') {
        localStorage.setItem('cb_pref_notifications', JSON.stringify(updated));
        window.dispatchEvent(new Event('cb-preferences-updated'));
      }
      return updated;
    });
    addToast(`Email digest frequency set to: ${val}`, 'success');
  };

  const googleConn = integrationConnections?.google;
  const zoomConn = integrationConnections?.zoom;
  const isSupervisor = currentUser?.role === 'RESEARCH_SUPERVISOR';
  const isAdmin = currentUser?.role === 'INSTITUTE_ADMIN';

  const tabs = [
    { id: 'identity', label: 'Identity & Bio', icon: User, desc: 'Personal & academic profile metadata' },
    { id: 'domains', label: 'Research Focus', icon: Tag, desc: 'Domains, tags & matchmaking index' },
    { id: 'integrations', label: 'Connected Apps', icon: Layers, desc: 'Google Workspace & Zoom meetings' },
    { id: 'appearance', label: 'Appearance & UI', icon: Palette, desc: 'Themes, feed sorting & density' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Email digests, channels & alert rules' },
    ...(isSupervisor ? [{ id: 'supervision', label: 'Advisory Panel', icon: GraduationCap, desc: 'Scholar intake capacity & lab settings' }] : [])
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 text-left select-none font-sans">
      
      {/* ─── PAGE HEADER & USER HERO PILL ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0C4DA2] to-blue-500 p-0.5 shadow-md shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-white overflow-hidden flex items-center justify-center">
              <img
                src={getProfileImageUrl(currentUser)}
                alt={currentUser?.name || 'User'}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 font-display tracking-tight">
                {currentUser?.name || 'Researcher Settings'}
              </h1>
              {currentUser?.role && <RoleBadge role={currentUser.role} size="sm" />}
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#0C4DA2] bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-[#0C4DA2]" />
                <span>SRMIST Verified</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {currentUser?.email} · {currentUser?.department || 'SRM Institute of Science and Technology'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Link
            href="/profile"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>View Public Profile</span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin/settings"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0C4DA2] hover:bg-[#083570] rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Institute Global Settings</span>
            </Link>
          )}
        </div>
      </div>

      {/* ─── MAIN SETTINGS WORKBENCH (TABS + FORM) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT TAB MENU (3 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-1.5 bg-white border border-slate-200/90 p-2.5 rounded-2xl shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1.5">
            Settings Navigation
          </p>

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 cursor-pointer group relative ${
                  isActive
                    ? 'bg-[#0C4DA2] text-white shadow-sm shadow-[#0C4DA2]/20 font-black'
                    : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-900 font-bold'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:text-[#0C4DA2] group-hover:bg-blue-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs leading-none">{tab.label}</span>
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-white/80" />
                    )}
                  </div>
                  <p className={`text-[10px] truncate mt-1 ${isActive ? 'text-blue-100 font-normal' : 'text-slate-400 font-medium'}`}>
                    {tab.desc}
                  </p>
                </div>
              </button>
            );
          })}

          <div className="h-px bg-slate-100 my-1 w-full" />

          <button
            onClick={logout}
            className="flex items-center gap-3 p-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer w-full text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-100/60 text-rose-600 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <span>Sign Out of CuriousBees</span>
          </button>
        </div>

        {/* RIGHT CONTENT PANE (8 COLS) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs min-h-[520px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* TAB 1: ACADEMIC IDENTITY & BIO */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'identity' && (
              <motion.div
                key="tab-identity"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <form onSubmit={handleSubmit(handleProfileSubmit)} className="space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-5">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display flex items-center gap-2">
                          <User className="w-4 h-4 text-[#0C4DA2]" />
                          <span>Academic Identity & Credentials</span>
                        </h2>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Personalize your public researcher bio and institutional department affiliation.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        Live Sync
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                          Full Academic Name
                        </label>
                        <input
                          type="text"
                          {...register('name')}
                          className="cb-input font-medium"
                          placeholder="E.g. Dr. Ramesh Kumar"
                        />
                        {errors.name && (
                          <p className="text-[10px] text-rose-500 font-bold mt-1">
                            {errors.name.message as string}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                          Institutional Primary Email
                        </label>
                        <input
                          type="email"
                          disabled
                          value={currentUser?.email || ''}
                          className="cb-input bg-slate-50/80 text-slate-500 border-slate-200 cursor-not-allowed font-mono text-xs"
                        />
                        <p className="text-[9px] text-slate-400 font-semibold">Managed via SRMIST institutional identity system</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                          Academic Department
                        </label>
                        <select
                          {...register('department')}
                          disabled
                          className="cb-input bg-slate-50/80 text-slate-500 border-slate-200 cursor-not-allowed font-medium"
                        >
                          <option value="">{currentUser?.department || 'Select Academic Department'}</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.name}>{dept.name}</option>
                          ))}
                        </select>
                        <p className="text-[9px] text-slate-400 font-semibold">Managed via SRMIST institutional identity system</p>
                        {errors.department && (
                          <p className="text-[10px] text-rose-500 font-bold mt-1">
                            {errors.department.message as string}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                          Institutional Role
                        </label>
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            {currentUser?.role === 'RESEARCH_SUPERVISOR' ? 'Faculty Research Supervisor' : currentUser?.role === 'INSTITUTE_ADMIN' ? 'Institutional Administrator' : 'PhD Research Scholar'}
                          </span>
                          <RoleBadge role={currentUser?.role || 'RESEARCH_SCHOLAR'} size="sm" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        Research Biography & Objective
                      </label>
                      <textarea
                        rows={4}
                        {...register('bio')}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 font-sans text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-[#0C4DA2] focus:ring-2 focus:ring-[#0C4DA2]/10 outline-none transition-all"
                        placeholder="Detail your scientific focus, active lab specifications, computational tools, and primary academic goals..."
                      />
                      {errors.bio && (
                        <p className="text-[10px] text-rose-500 font-bold mt-1">
                          {errors.bio.message as string}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 mt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-[#0C4DA2] text-white hover:bg-[#083570] rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Profile...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* TAB 2: RESEARCH FOCUS & DOMAINS */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'domains' && (
              <motion.div
                key="tab-domains"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#0C4DA2]" />
                      <span>Research Focus Areas & Matchmaking Tags</span>
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Specify scientific domains that index your node in co-author matchmaking directories and Curious Nexus workspaces.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        Active Pinned Domains ({selectedInterests.length}/8)
                      </label>
                      <span className="text-[10px] text-slate-400 font-bold">Max 8 Tags</span>
                    </div>

                    <div className="flex flex-wrap gap-2 p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl min-h-[58px] items-center">
                      {selectedInterests.length === 0 ? (
                        <p className="text-slate-400 text-xs italic font-medium">
                          No research focus tags pinned yet. Type below or select from recommended disciplines.
                        </p>
                      ) : (
                        selectedInterests.map((interest) => (
                          <span
                            key={interest}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0C4DA2]/10 border border-[#0C4DA2]/25 text-[#0C4DA2]"
                          >
                            <span>{interest}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveInterest(interest)}
                              className="text-[#0C4DA2]/60 hover:text-rose-600 p-0.5 rounded-full hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="relative mt-2">
                      <input
                        type="text"
                        value={newInterestInput}
                        onChange={(e) => setNewInterestInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInterest(newInterestInput);
                          }
                        }}
                        placeholder="Type scientific discipline (e.g. Deep Reinforcement Learning) and press Enter..."
                        className="cb-input pl-9 pr-12 font-medium"
                      />
                      <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <button
                        type="button"
                        onClick={() => handleAddInterest(newInterestInput)}
                        className="absolute right-2 top-2 p-1.5 rounded-lg bg-[#0C4DA2] text-white hover:bg-[#083570] transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Suggested University Research Clusters</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {interestsList
                        .filter(item => !selectedInterests.includes(item))
                        .map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAddInterest(tag)}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-[#0C4DA2] hover:border-[#0C4DA2]/30 transition-all cursor-pointer shadow-xs flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3 text-slate-400" />
                            <span>{tag}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => handleProfileSubmit({ name: currentUser?.name, bio: currentUser?.bio, department: currentUser?.department })}
                    className="px-5 py-2.5 bg-[#0C4DA2] text-white hover:bg-[#083570] rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Focus Domains</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* TAB 3: CONNECTED APPS & INTEGRATIONS */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'integrations' && (
              <motion.div
                key="tab-integrations"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#0C4DA2]" />
                        <span>Connected Collaboration Tools</span>
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Link external conferencing & chat tools to power Curious Nexus workspaces automatically.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoadingIntegrations(true);
                        fetchIntegrationStatus().finally(() => setLoadingIntegrations(false));
                      }}
                      className="p-2 text-slate-500 hover:text-[#0C4DA2] rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Refresh connection statuses"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingIntegrations ? 'animate-spin text-[#0C4DA2]' : ''}`} />
                    </button>
                  </div>

                  {/* 🛡️ PRIVACY BOX */}
                  <div className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 border border-[#0C4DA2]/20 rounded-2xl flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#0C4DA2] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide font-mono">
                        Zero-Retention Architecture
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5 font-medium">
                        CuriousBees orchestrates meeting metadata & memberships. No conversation transcripts, audio streams, or meeting recordings are ever stored on CuriousBees servers.
                      </p>
                    </div>
                  </div>

                  {/* INTEGRATIONS CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Google Workspace */}
                    <div className="p-5 border border-slate-200/90 rounded-2xl bg-white shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shadow-xs">
                              <svg className="w-full h-full" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-xs font-black text-slate-900">Google Workspace</h3>
                              <p className="text-[10px] text-slate-500 font-medium">Chat Spaces · Meet</p>
                            </div>
                          </div>

                          {googleConn?.status === 'CONNECTED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Connected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              <span>Unlinked</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                          Automated creation of dedicated Google Chat research spaces & Google Meet calls in workspaces.
                        </p>
                      </div>

                      <div>
                        {googleConn?.status === 'CONNECTED' ? (
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                              {googleConn.externalAccountEmail}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDisconnect('GOOGLE_WORKSPACE')}
                              disabled={disconnectingProvider === 'GOOGLE_WORKSPACE'}
                              className="text-[10px] font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              Disconnect
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleConnectGoogle}
                            disabled={connectingProvider === 'GOOGLE'}
                            className="w-full py-2 bg-[#0C4DA2] hover:bg-[#083570] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            {connectingProvider === 'GOOGLE' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <span>Connect Google</span>
                                <ExternalLink className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Zoom Workplace */}
                    <div className="p-5 border border-slate-200/90 rounded-2xl bg-white shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-[#2D8CFF]/10 border border-[#2D8CFF]/20 flex items-center justify-center p-2 text-[#2D8CFF] shadow-xs">
                              <Video className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-xs font-black text-slate-900">Zoom Workplace</h3>
                              <p className="text-[10px] text-slate-500 font-medium">Video Conferencing</p>
                            </div>
                          </div>

                          {zoomConn?.status === 'CONNECTED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Connected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              <span>Unlinked</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                          Instant participant joining and recurring video syncs inside research collaboration rooms.
                        </p>
                      </div>

                      <div>
                        {zoomConn?.status === 'CONNECTED' ? (
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                              {zoomConn.externalAccountEmail}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDisconnect('ZOOM_WORKPLACE')}
                              disabled={disconnectingProvider === 'ZOOM_WORKPLACE'}
                              className="text-[10px] font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              Disconnect
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleConnectZoom}
                            disabled={connectingProvider === 'ZOOM'}
                            className="w-full py-2 bg-[#2D8CFF] hover:bg-[#1a75e0] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            {connectingProvider === 'ZOOM' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <span>Connect Zoom</span>
                                <ExternalLink className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href="/settings/integrations"
                    className="text-xs font-bold text-[#0C4DA2] hover:underline flex items-center gap-1"
                  >
                    <span>Open Full Integrations Management Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* TAB 4: APPEARANCE & UI PREFERENCES */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'appearance' && (
              <motion.div
                key="tab-appearance"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#0C4DA2]" />
                      <span>Interface & Theme Preferences</span>
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Tailor the visual aesthetics, density, and research feed presentation for your workflow.
                    </p>
                  </div>

                  {/* Theme Mode Selector */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Color Palette & Theme Mode
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTheme('light');
                          addToast('Standard Light theme activated', 'success');
                        }}
                        className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 select-none ${
                          theme === 'light'
                            ? 'border-[#0C4DA2] bg-blue-50/50 text-[#0C4DA2] shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Sun className="w-5 h-5 text-amber-500" />
                          {theme === 'light' && <Check className="w-4 h-4 text-[#0C4DA2] stroke-[2.5]" />}
                        </div>
                        <div>
                          <p className="text-xs font-black">Light Mode</p>
                          <p className="text-[10px] text-slate-400 font-medium">Standard Academic Clean</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTheme('dark');
                          addToast('Dark Studio theme activated', 'success');
                        }}
                        className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 select-none ${
                          theme === 'dark'
                            ? 'border-[#0C4DA2] bg-blue-50/50 text-[#0C4DA2] shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Moon className="w-5 h-5 text-indigo-500" />
                          {theme === 'dark' && <Check className="w-4 h-4 text-[#0C4DA2] stroke-[2.5]" />}
                        </div>
                        <div>
                          <p className="text-xs font-black">Dark Mode</p>
                          <p className="text-[10px] text-slate-400 font-medium">Low Light Studio</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Research Feed Sorting Preference */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Default Research Feed Ordering
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => saveFeedSort('latest')}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between select-none ${
                          feedSortPreference === 'latest'
                            ? 'border-[#0C4DA2] bg-blue-50/50 text-[#0C4DA2] font-black shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-[#0C4DA2]" />
                          <div>
                            <p className="text-xs">Latest Submissions</p>
                            <p className="text-[10px] text-slate-400 font-normal">Strict chronological order</p>
                          </div>
                        </div>
                        {feedSortPreference === 'latest' && <Check className="w-4 h-4 text-[#0C4DA2] stroke-[2.5]" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => saveFeedSort('top')}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between select-none ${
                          feedSortPreference === 'top'
                            ? 'border-[#0C4DA2] bg-blue-50/50 text-[#0C4DA2] font-black shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <div>
                            <p className="text-xs">Top Discussions</p>
                            <p className="text-[10px] text-slate-400 font-normal">Ranked by citation & engagement</p>
                          </div>
                        </div>
                        {feedSortPreference === 'top' && <Check className="w-4 h-4 text-[#0C4DA2] stroke-[2.5]" />}
                      </button>
                    </div>
                  </div>

                  {/* UI Density & Toggle Settings */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Reading Comfort
                    </label>

                    <div className="space-y-2">
                      <div 
                        onClick={toggleCompactMode}
                        className="p-3.5 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/80 rounded-2xl flex items-center justify-between cursor-pointer transition-all select-none"
                      >
                        <div className="pr-4">
                          <p className="text-xs font-bold text-slate-800">Compact Layout Mode</p>
                          <p className="text-[10px] text-slate-500 font-medium">Reduce padding on publication list and feed items for high-density monitors</p>
                        </div>
                        <button
                          type="button"
                          aria-label="Toggle compact layout mode"
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                            compactCards ? 'bg-[#0C4DA2]' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              compactCards ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div 
                        onClick={toggleAutoExpand}
                        className="p-3.5 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/80 rounded-2xl flex items-center justify-between cursor-pointer transition-all select-none"
                      >
                        <div className="pr-4">
                          <p className="text-xs font-bold text-slate-800">Auto-expand Paper Abstracts</p>
                          <p className="text-[10px] text-slate-500 font-medium">Automatically reveal full abstract text on research feed items</p>
                        </div>
                        <button
                          type="button"
                          aria-label="Toggle auto-expand abstracts"
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                            autoExpandAbstracts ? 'bg-[#0C4DA2]' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              autoExpandAbstracts ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* TAB 5: NOTIFICATIONS & COMMUNICATION */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'notifications' && (
              <motion.div
                key="tab-notifications"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#0C4DA2]" />
                      <span>Notification Rules & Email Digest</span>
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Configure instant alerts, supervisor advisory milestones, and periodic email updates.
                    </p>
                  </div>

                  {/* Channel Notification Toggles */}
                  <div className="space-y-2.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      In-App & Push Notification Channels
                    </label>

                    {[
                      { key: 'researchPapers', label: 'Research Paper Publications', desc: 'Alerts when co-authors or followed faculty release new peer-reviewed papers' },
                      { key: 'collaborations', label: 'Collaboration Invitations', desc: 'Direct requests to join research workspaces and grant proposal groups' },
                      { key: 'advisoryMilestones', label: 'PhD Advisory & Milestones', desc: 'Supervisor reviews, committee scheduling, and milestone approvals' },
                      { key: 'opportunities', label: 'Grant & Funding Announcements', desc: 'Selective excellence opportunities, SERB, DST, and institutional grants' },
                      { key: 'events', label: 'Seminars & Conferences', desc: 'Campus research symposiums, guest lectures, and defence dates' }
                    ].map((item) => (
                      <div
                        key={item.key}
                        onClick={() => handleNotifToggle(item.key as keyof typeof notifPreferences)}
                        className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex items-center justify-between hover:bg-slate-100/70 transition-colors cursor-pointer select-none"
                      >
                        <div className="pr-4">
                          <p className="text-xs font-bold text-slate-800">{item.label}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{item.desc}</p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Toggle ${item.label}`}
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                            (notifPreferences as any)[item.key] ? 'bg-[#0C4DA2]' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              (notifPreferences as any)[item.key] ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Email Digest Frequency */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Institutional Email Digest Frequency
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: 'instant', label: 'Real-time', desc: 'Immediate email' },
                        { id: 'daily', label: 'Daily Brief', desc: 'Once every morning' },
                        { id: 'weekly', label: 'Weekly Digest', desc: 'Monday summary' },
                        { id: 'none', label: 'Muted', desc: 'In-app only' }
                      ].map((freq) => (
                        <button
                          key={freq.id}
                          type="button"
                          onClick={() => handleDigestChange(freq.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            notifPreferences.emailDigest === freq.id
                              ? 'border-[#0C4DA2] bg-blue-50/40 text-[#0C4DA2] font-black'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold'
                          }`}
                        >
                          <p className="text-xs">{freq.label}</p>
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">{freq.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* TAB 6: SUPERVISOR ADVISORY PANEL (IF SUPERVISOR) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'supervision' && isSupervisor && (
              <motion.div
                key="tab-supervision"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-[#0C4DA2]" />
                        <span>Faculty Supervision & Lab Preferences</span>
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Manage research scholar intake capacity, lab affiliation, and prospective scholar notifications.
                      </p>
                    </div>
                    <Link
                      href="/my-scholars"
                      className="text-xs font-bold text-[#0C4DA2] hover:underline flex items-center gap-1"
                    >
                      <span>Open Supervision Panel</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        Primary Research Laboratory / Research Center
                      </label>
                      <input
                        type="text"
                        value={labName}
                        onChange={(e) => setLabName(e.target.value)}
                        className="cb-input font-medium"
                        placeholder="E.g. SRM AI & Quantum Computing Lab"
                      />
                    </div>

                    <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Accepting New PhD Scholars</p>
                        <p className="text-[10px] text-slate-500 font-medium">Allow unassigned research scholars in your department to submit supervision requests</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAcceptingScholars(!acceptingScholars);
                          addToast(`Scholar supervision requests ${!acceptingScholars ? 'enabled' : 'paused'}`, 'info');
                        }}
                        className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                          acceptingScholars ? 'bg-[#0C4DA2]' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            acceptingScholars ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        Maximum PhD Scholar Capacity
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={6}
                          max={6}
                          disabled
                          value={supervisionCapacity}
                          className="cb-input w-28 font-mono font-bold bg-slate-50/80 text-slate-500 border-slate-200 cursor-not-allowed"
                        />
                        <span className="text-xs text-slate-500 font-medium">Scholars under primary supervision</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => addToast('Supervisor advisory settings saved.', 'success')}
                    className="px-5 py-2.5 bg-[#0C4DA2] text-white hover:bg-[#083570] rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Supervision Settings</span>
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}

type SettingsTab = 'identity' | 'domains' | 'integrations' | 'appearance' | 'notifications' | 'supervision';

export default function UnifiedSettingsPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-xs font-bold text-slate-400 animate-pulse">Loading Settings...</div>}>
      <UnifiedSettingsContent />
    </React.Suspense>
  );
}
