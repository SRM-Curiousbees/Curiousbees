'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Globe, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiFetch } from '@/lib/api-client';
import { STAGES } from './ResearchLifecycle';

interface EditResearcherProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onOpenLinksEditor: () => void;
  onSuccess: () => void;
}

export function EditResearcherProfileDrawer({
  isOpen,
  onClose,
  user,
  onOpenLinksEditor,
  onSuccess,
}: EditResearcherProfileDrawerProps) {
  const { updateProfile, updateResearchProfile } = useStore();

  const isAdmin = user?.role === 'INSTITUTE_ADMIN';
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'LINKS'>('PROFILE');

  // Form State
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');
  const [interestsText, setInterestsText] = useState('');
  const [researchTitle, setResearchTitle] = useState('');
  const [researchArea, setResearchArea] = useState('');
  const [abstract, setAbstract] = useState('');
  const [currentStage, setCurrentStage] = useState('PROPOSAL');
  const [status, setStatus] = useState('ACTIVE');

  // Institutional hierarchy state
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [isLoadingOrg, setIsLoadingOrg] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load institutional faculties & departments from API
  useEffect(() => {
    let isMounted = true;
    async function loadOrgData() {
      setIsLoadingOrg(true);
      try {
        const [facRes, deptRes] = await Promise.all([
          apiFetch('/api/faculties'),
          apiFetch('/api/departments'),
        ]);
        if (facRes.ok && deptRes.ok && isMounted) {
          const facData = await facRes.json();
          const deptData = await deptRes.json();
          setFaculties(Array.isArray(facData) ? facData : []);
          setDepartments(Array.isArray(deptData) ? deptData : []);
        }
      } catch (err) {
        console.error('Failed to load institutional hierarchy:', err);
      } finally {
        if (isMounted) setIsLoadingOrg(false);
      }
    }
    if (isOpen) {
      loadOrgData();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setDepartment(user.department || '');
      setBio(user.bio || '');
      const existingInterests = Array.isArray(user.interests)
        ? user.interests.map((i: any) => i.interest?.name || i.name || i).join(', ')
        : (user.researchInterests || []).join(', ');
      setInterestsText(existingInterests);

      if (user.departmentId) {
        setSelectedDepartmentId(user.departmentId);
      }

      if (user.researchProfile) {
        setResearchTitle(user.researchProfile.title || '');
        setResearchArea(user.researchProfile.researchArea || '');
        setAbstract(user.researchProfile.abstract || '');
        setCurrentStage(user.researchProfile.currentStage || 'PROPOSAL');
        setStatus(user.researchProfile.status || 'ACTIVE');
      }
    }
  }, [user]);

  // Synchronize selectedFacultyId when departments load
  useEffect(() => {
    if (departments.length > 0) {
      if (selectedDepartmentId) {
        const matched = departments.find((d) => d.id === selectedDepartmentId);
        if (matched?.facultyId && !selectedFacultyId) {
          setSelectedFacultyId(matched.facultyId);
        }
      } else if (department) {
        const matched = departments.find(
          (d) => d.name.toLowerCase() === department.toLowerCase() ||
                 department.toLowerCase().includes(d.name.toLowerCase())
        );
        if (matched) {
          setSelectedDepartmentId(matched.id);
          if (matched.facultyId && !selectedFacultyId) {
            setSelectedFacultyId(matched.facultyId);
          }
        }
      }
    }
  }, [departments, selectedDepartmentId, department, selectedFacultyId]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Update Base User Profile with authoritative departmentId
      const interestsArray = interestsText
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await updateProfile({
        name: name.trim() || undefined,
        departmentId: selectedDepartmentId || undefined,
        bio: bio.trim(),
        interests: interestsArray,
      });

      // 2. Update Research Profile (for scholars & supervisors)
      if (!isAdmin && researchTitle.trim()) {
        await updateResearchProfile({
          title: researchTitle.trim(),
          researchArea: researchArea.trim() || 'Computer Science',
          abstract: abstract.trim(),
          currentStage,
          status,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Edit Profile</h3>
            <p className="text-xs text-slate-500 font-medium">
              Update your public profile details and research focus.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/30 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('LINKS')}
            className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'LINKS'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            External Links
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-900 border border-red-200 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'PROFILE' && (
            <form id="edit-profile-form" onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Campus</label>
                  <div className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                    Kattankulathur Campus (KTR)
                  </div>
                </div>
              </div>

              {/* Canonical Hierarchy: Faculty -> Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Faculty</label>
                  <select
                    value={selectedFacultyId}
                    onChange={(e) => {
                      setSelectedFacultyId(e.target.value);
                      setSelectedDepartmentId('');
                    }}
                    disabled={isLoadingOrg}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Select Faculty...</option>
                    {faculties.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Department</label>
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    disabled={isLoadingOrg || !selectedFacultyId}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Select Department...</option>
                    {departments
                      .filter((d) => !selectedFacultyId || d.facultyId === selectedFacultyId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAdmin ? 'Administrative Bio / Overview' : 'Research Bio / Summary'}
                </label>
                <textarea
                  rows={3}
                  placeholder={isAdmin ? 'Describe your institutional role and oversight areas...' : 'Describe your research focus, methodology, or academic statement...'}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAdmin ? 'Key Focus Areas (Comma-Separated)' : 'Research Interests (Comma-Separated)'}
                </label>
                <input
                  type="text"
                  placeholder="Artificial Intelligence, Research Policy, Analytics"
                  value={interestsText}
                  onChange={(e) => setInterestsText(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {!isAdmin && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-medium capitalize text-brand">
                    Current Research Project
                  </h4>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Research Project Title</label>
                    <input
                      type="text"
                      placeholder="e.g. AI-Based Research Collaboration Framework"
                      value={researchTitle}
                      onChange={(e) => setResearchTitle(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Research Area</label>
                      <input
                        type="text"
                        placeholder="e.g. Artificial Intelligence"
                        value={researchArea}
                        onChange={(e) => setResearchArea(e.target.value)}
                        className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Current Research Stage</label>
                      <select
                        value={currentStage}
                        onChange={(e) => setCurrentStage(e.target.value)}
                        className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        {STAGES.map((stg) => (
                          <option key={stg.id} value={stg.id}>
                            {stg.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Research Abstract</label>
                    <textarea
                      rows={3}
                      placeholder="Short summary of current project methodology and goals..."
                      value={abstract}
                      onChange={(e) => setAbstract(e.target.value)}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>
              )}
            </form>
          )}

          {activeTab === 'LINKS' && (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
              <Globe className="w-8 h-8 text-brand mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900">Manage External Research Profiles</h4>
                <p className="text-xs text-slate-500">
                  Configure ORCID, Google Scholar, ResearchGate, GitHub, and LinkedIn profile URLs.
                </p>
              </div>
              <button
                onClick={onOpenLinksEditor}
                className="px-5 py-2.5 bg-brand hover:bg-brand-strong text-white font-semibold text-xs rounded-xl shadow-2xs transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span>Open Links Manager</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {activeTab === 'PROFILE' && (
            <button
              type="submit"
              form="edit-profile-form"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-brand hover:bg-brand-strong text-white text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
