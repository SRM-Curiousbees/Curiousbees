'use client';
import { thesisAbstract, thesisTitle } from '@/lib/research-profile';

import React, { useState, useEffect } from 'react';
import { Link2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
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
        setResearchTitle(thesisTitle(user.researchProfile) || '');
        setResearchArea(user.researchProfile.researchArea || '');
        setAbstract(thesisAbstract(user.researchProfile) || '');
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
          researchArea: researchArea.trim(),
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
    <Dialog
      open={isOpen}
      onClose={onClose}
      dismissible={!isSubmitting}
      side="right"
      title="Edit profile"
      description="What other researchers see on your profile."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-profile-form" loading={isSubmitting}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-profile-form" onSubmit={handleSave} className="space-y-5">
        {errorMsg && (
          <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {errorMsg}
          </p>
        )}

        <Field label="Full name" htmlFor="ep-name">
          <input id="ep-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="cb-input" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Faculty" htmlFor="ep-faculty">
            <select
              id="ep-faculty"
              value={selectedFacultyId}
              onChange={(e) => {
                setSelectedFacultyId(e.target.value);
                setSelectedDepartmentId('');
              }}
              disabled={isLoadingOrg}
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
          <Field label="Department" htmlFor="ep-dept">
            <select
              id="ep-dept"
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              disabled={isLoadingOrg || !selectedFacultyId}
              className="cb-input"
            >
              <option value="">{selectedFacultyId ? 'Choose a department' : 'Choose a faculty first'}</option>
              {departments
                .filter((d) => !selectedFacultyId || d.facultyId === selectedFacultyId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>

        <Field label="Bio" htmlFor="ep-bio" hint={isAdmin ? 'Your role and areas of responsibility.' : 'Your research focus in a few sentences.'}>
          <textarea id="ep-bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} className="cb-input resize-y" />
        </Field>

        <Field label={isAdmin ? 'Focus areas' : 'Research interests'} htmlFor="ep-interests" hint="Separate with commas. Researchers with shared interests are suggested to each other.">
          <input
            id="ep-interests"
            type="text"
            placeholder="e.g. Federated learning, Medical imaging"
            value={interestsText}
            onChange={(e) => setInterestsText(e.target.value)}
            className="cb-input"
          />
        </Field>

        {!isAdmin && (
          <fieldset className="space-y-4 border-t border-line pt-5">
            <legend className="-mt-8 bg-surface pr-2 text-sm font-semibold text-ink">Current research</legend>
            <Field label="Research title" htmlFor="ep-rtitle" hint="Leave empty if you have no current project.">
              <input id="ep-rtitle" type="text" value={researchTitle} onChange={(e) => setResearchTitle(e.target.value)} className="cb-input" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Research area" htmlFor="ep-rarea" required={!!researchTitle.trim()}>
                <input
                  id="ep-rarea"
                  type="text"
                  value={researchArea}
                  required={!!researchTitle.trim()}
                  onChange={(e) => setResearchArea(e.target.value)}
                  placeholder="e.g. Computer vision"
                  className="cb-input"
                />
              </Field>
              <Field label="Stage" htmlFor="ep-stage">
                <select id="ep-stage" value={currentStage} onChange={(e) => setCurrentStage(e.target.value)} className="cb-input">
                  {STAGES.map((stg) => (
                    <option key={stg.id} value={stg.id}>
                      {stg.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Abstract" htmlFor="ep-abstract">
              <textarea id="ep-abstract" rows={4} value={abstract} onChange={(e) => setAbstract(e.target.value)} className="cb-input resize-y" />
            </Field>
          </fieldset>
        )}

        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-muted px-4 py-3">
          <p className="text-sm text-ink-secondary">ORCID, Google Scholar, ResearchGate and other links</p>
          <Button variant="secondary" size="sm" onClick={onOpenLinksEditor}>
            <Link2 aria-hidden />
            Manage links
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
