'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FolderGit2, Loader2, Plus, Search, Sparkles, User, Users, X } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/store/useStore';
import { apiFetch, apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { getProfileImageUrl, handleAvatarError } from '@/lib/avatar';

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

interface DomainOption {
  id: string;
  name: string;
  topics?: { id: string; name: string }[];
}

interface ResearcherUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  department?: string | null;
}

export function CreateWorkspaceModal({ open, onClose }: CreateWorkspaceModalProps) {
  const router = useRouter();
  const { currentUser, myScholars, createWorkspace, addToast } = useStore();

  const isScholar = currentUser?.role === 'RESEARCH_SCHOLAR';
  const isSupervisor = currentUser?.role === 'RESEARCH_SUPERVISOR';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [researchDomain, setResearchDomain] = useState('');
  const [researchTopic, setResearchTopic] = useState('');
  const [availableDomains, setAvailableDomains] = useState<DomainOption[]>([]);

  // Member selection
  const [includeSupervisor, setIncludeSupervisor] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<ResearcherUser[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ResearcherUser[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults based on user profile
  useEffect(() => {
    if (!open) return;
    setError(null);
    setIsSubmitting(false);

    // Default domain & topic from scholar/supervisor profile
    const defaultDomain =
      currentUser?.researchProfile?.researchArea ||
      currentUser?.userDomains?.[0]?.domain?.name ||
      '';
    const defaultTopic =
      currentUser?.researchProfile?.title ||
      currentUser?.userTopics?.[0]?.topic?.name ||
      currentUser?.scholarProfile?.researchArea ||
      '';

    setResearchDomain(defaultDomain);
    setResearchTopic(defaultTopic);
    setTitle(
      defaultTopic
        ? `${defaultTopic} Research Group`
        : isScholar
        ? 'Doctoral Research Workspace'
        : 'Research Lab Workspace'
    );
    setDescription('');
    setSelectedMembers([]);
    setIncludeSupervisor(true);
  }, [open, currentUser, isScholar]);

  // Load available domains for selection/autocomplete
  useEffect(() => {
    if (!open) return;
    apiFetch('/api/research-domains')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailableDomains(data);
          if (!researchDomain && data.length > 0) {
            setResearchDomain(data[0].name);
          }
        }
      })
      .catch(() => {});
  }, [open]);

  // Debounced search for peer researchers
  useEffect(() => {
    if (!open || !memberSearchQuery.trim() || memberSearchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingMembers(true);
      try {
        const res = await apiGet<any>(`/api/users/researchers?q=${encodeURIComponent(memberSearchQuery.trim())}&limit=8`);
        const items = res?.items || res || [];
        if (Array.isArray(items)) {
          // Filter out current user and already selected members
          const filtered = items.filter(
            (u: ResearcherUser) =>
              u.id !== currentUser?.id &&
              !selectedMembers.some((m) => m.id === u.id) &&
              !(includeSupervisor && currentUser?.supervisorId === u.id)
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error('Failed to search researchers', err);
      } finally {
        setIsSearchingMembers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [memberSearchQuery, open, currentUser, selectedMembers, includeSupervisor]);

  const activeDomainObj = useMemo(
    () => availableDomains.find((d) => d.name.toLowerCase() === researchDomain.toLowerCase()),
    [availableDomains, researchDomain]
  );

  const toggleSelectMember = (user: ResearcherUser) => {
    if (selectedMembers.some((m) => m.id === user.id)) {
      setSelectedMembers((prev) => prev.filter((m) => m.id !== user.id));
    } else {
      setSelectedMembers((prev) => [...prev, user]);
      setMemberSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleDomainChange = (domainName: string) => {
    setResearchDomain(domainName);
    const domainObj = availableDomains.find((d) => d.name === domainName);
    if (domainObj?.topics && domainObj.topics.length > 0 && !researchTopic) {
      setResearchTopic(domainObj.topics[0].name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a workspace title.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const memberIds = selectedMembers.map((m) => m.id);
      let supervisorIdToPass: string | undefined = undefined;

      if (isScholar && includeSupervisor && currentUser?.supervisorId) {
        supervisorIdToPass = currentUser.supervisorId;
        if (!memberIds.includes(currentUser.supervisorId)) {
          memberIds.push(currentUser.supervisorId);
        }
      }

      const newWs = await createWorkspace({
        title: title.trim(),
        description: description.trim() || undefined,
        researchDomain: researchDomain.trim() || undefined,
        researchTopic: researchTopic.trim() || undefined,
        memberIds,
        scholarIds: memberIds,
        supervisorId: supervisorIdToPass,
      });

      onClose();
      if (newWs?.id) {
        router.push(`/workspace/${newWs.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create research workspace.');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <FolderGit2 className="size-5" aria-hidden />
          </span>
          <span>Create Research Workspace</span>
        </div>
      }
      description={
        isScholar
          ? 'Set up a shared research workspace for your thesis, experiments, drafts, milestones, and supervisor collaboration.'
          : 'Set up a shared research workspace for your lab group, scholars, code repositories, and publications.'
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Creating workspace...
              </>
            ) : (
              <>
                <Plus className="size-4" aria-hidden />
                Create workspace
              </>
            )}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
            {error}
          </div>
        )}

        {/* Title */}
        <Field label="Workspace Name *" htmlFor="ws-title" hint="A descriptive name for your research space or laboratory group.">
          <input
            id="ws-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              isScholar
                ? 'e.g. Distributed Edge AI Optimization Lab'
                : 'e.g. Cognitive Systems Research Group'
            }
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </Field>

        {/* Description */}
        <Field label="Research Objectives & Description" htmlFor="ws-desc" hint="Optional summary of research goals, ongoing experiments, or manuscript targets.">
          <textarea
            id="ws-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe the research scope, experiments, and target outcomes for this workspace..."
            className="w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </Field>

        {/* Domain & Topic Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Research Domain" htmlFor="ws-domain" hint="Broad discipline or department focus.">
            <input
              id="ws-domain"
              type="text"
              list="ws-domain-list"
              value={researchDomain}
              onChange={(e) => handleDomainChange(e.target.value)}
              placeholder="e.g. Computer Science & Engineering"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
            <datalist id="ws-domain-list">
              {availableDomains.map((d) => (
                <option key={d.id} value={d.name} />
              ))}
            </datalist>
          </Field>

          <Field
            label={isScholar ? 'Doctoral Thesis / Research Topic' : 'Research Topic / Lab Area'}
            htmlFor="ws-topic"
            hint="Specialized research problem or topic."
          >
            <input
              id="ws-topic"
              type="text"
              list="ws-topic-list"
              value={researchTopic}
              onChange={(e) => setResearchTopic(e.target.value)}
              placeholder="e.g. Autonomous Distributed Computing"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
            <datalist id="ws-topic-list">
              {activeDomainObj?.topics?.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </Field>
        </div>

        {/* Scholar: Include Supervisor Option */}
        {isScholar && (currentUser?.supervisorId || currentUser?.supervisor) && (
          <div className="rounded-2xl border border-line bg-surface-muted/60 p-3.5">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSupervisor}
                onChange={(e) => setIncludeSupervisor(e.target.checked)}
                className="size-4 rounded border-line text-brand focus:ring-brand"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  Include Research Supervisor
                </p>
                <p className="text-xs text-ink-secondary">
                  {currentUser?.supervisor?.name
                    ? `Add ${currentUser.supervisor.name} (${currentUser.supervisor.department || 'Supervisor'}) as a workspace collaborator.`
                    : 'Automatically add your assigned research supervisor to this workspace.'}
                </p>
              </div>
              <Badge tone="brand">Supervisor</Badge>
            </label>
          </div>
        )}

        {/* Supervisor: Quick Scholars Selection */}
        {isSupervisor && myScholars && myScholars.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-line bg-surface-muted/40 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Your Supervised Scholars
              </span>
              <span className="text-xs text-ink-muted">Click to add/remove</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {myScholars.map((scholar: any) => {
                const isSelected = selectedMembers.some((m) => m.id === scholar.id);
                return (
                  <button
                    key={scholar.id}
                    type="button"
                    onClick={() => toggleSelectMember(scholar)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-fast',
                      isSelected
                        ? 'border-brand bg-brand-50 text-brand-800'
                        : 'border-line bg-surface text-ink hover:border-line-strong'
                    )}
                  >
                    {isSelected ? <Check className="size-3.5 text-brand" /> : <Plus className="size-3.5 text-ink-muted" />}
                    <span>{scholar.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Collaborators / Researchers Selection */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Invite Collaborators & Co-Researchers
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-ink-muted" aria-hidden />
            <input
              type="text"
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              placeholder="Search researchers by name or department..."
              className="w-full rounded-xl border border-line bg-surface pl-9 pr-3.5 py-2 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
            {isSearchingMembers && (
              <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-ink-muted" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-md">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleSelectMember(user)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted"
                >
                  <img
                    src={getProfileImageUrl(user)}
                    alt=""
                    onError={(e) => handleAvatarError(e, user.name)}
                    className="size-7 rounded-full border border-line bg-surface-muted object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{user.name || user.email}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {user.role === 'RESEARCH_SUPERVISOR' ? 'Supervisor' : 'Scholar'}
                      {user.department ? ` · ${user.department}` : ''}
                    </p>
                  </div>
                  <Plus className="size-4 text-ink-muted" />
                </button>
              ))}
            </div>
          )}

          {/* Selected Members Chips */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedMembers.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink"
                >
                  <img
                    src={getProfileImageUrl(member)}
                    alt=""
                    onError={(e) => handleAvatarError(e, member.name)}
                    className="size-4 rounded-full object-cover"
                  />
                  <span>{member.name || member.email}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectMember(member)}
                    className="rounded-full p-0.5 text-ink-muted hover:bg-line hover:text-ink"
                    aria-label={`Remove ${member.name}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </form>
    </Dialog>
  );
}
