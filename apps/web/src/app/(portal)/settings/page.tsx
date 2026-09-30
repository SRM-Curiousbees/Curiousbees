'use client';

/**
 * Account settings. Every control here does something: profile fields save through
 * the users API, research interests drive researcher suggestions, integrations
 * connect Google Workspace and Zoom for Nexus meetings, and appearance and
 * notification filters are stored in this browser (and read by the feed and the
 * notifications page).
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateProfileSchema } from '@curiousbees/shared-utils';
import {
  Bell,
  Camera,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Layers,
  LogOut,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  Sun,
  Tag,
  User,
  Video,
  X,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { getProfileImageUrl, handleAvatarError } from '@/lib/avatar';
import { apiFetch, readApiError, API_URL } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Field, DetailItem } from '@/components/ui/field';
import { SwitchRow } from '@/components/ui/switch';
import { RoleBadge } from '@/components/shared/role-badge';

type SettingsTab = 'identity' | 'domains' | 'integrations' | 'appearance' | 'notifications' | 'supervision';

const NOTIFICATION_CATEGORIES = [
  { key: 'researchPapers', label: 'Research posts and papers', desc: 'New papers and updates from people and topics you follow.' },
  { key: 'collaborations', label: 'Collaboration', desc: 'Collaboration requests and workspace invitations.' },
  { key: 'advisoryMilestones', label: 'Supervision and milestones', desc: 'Supervision requests, progress report reviews and milestones.' },
  { key: 'opportunities', label: 'Opportunities', desc: 'New collaboration opportunities and calls.' },
  { key: 'events', label: 'Events', desc: 'Conferences, workshops, seminars and thesis reviews.' },
] as const;

type NotifKey = (typeof NOTIFICATION_CATEGORIES)[number]['key'];

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
    integrationConnections,
    fetchIntegrationStatus,
    getGoogleAuthUrl,
    getZoomAuthUrl,
    disconnectIntegration,
    myScholars,
    fetchMyScholars,
    addToast,
    logout,
  } = useStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [newInterestInput, setNewInterestInput] = useState('');
  const [savingInterests, setSavingInterests] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<'GOOGLE' | 'ZOOM' | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<'GOOGLE_WORKSPACE' | 'ZOOM_WORKPLACE' | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<'GOOGLE_WORKSPACE' | 'ZOOM_WORKPLACE' | null>(null);

  // Stored in this browser; read by the feed (sort, compact cards, abstracts).
  const [feedSortPreference, setFeedSortPreference] = useState<'latest' | 'top'>('latest');
  const [compactCards, setCompactCards] = useState<boolean>(false);
  const [autoExpandAbstracts, setAutoExpandAbstracts] = useState<boolean>(false);

  // Stored in this browser; read by the notifications page to filter the list.
  const [notifPreferences, setNotifPreferences] = useState<Record<NotifKey, boolean>>({
    researchPapers: true,
    collaborations: true,
    advisoryMilestones: true,
    opportunities: true,
    events: true,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      name: currentUser?.name || '',
      role: currentUser?.role || 'RESEARCH_SCHOLAR',
      department: currentUser?.department || '',
      bio: currentUser?.bio || '',
    },
  });

  useEffect(() => {
    if (currentUser) {
      reset({
        name: currentUser.name || '',
        role: currentUser.role || 'RESEARCH_SCHOLAR',
        department: currentUser.department || '',
        bio: currentUser.bio || '',
      });
      setSelectedInterests(currentUser.interests?.map((i: any) => i.interest?.name || '').filter(Boolean) || []);
    }
  }, [currentUser, reset]);

  useEffect(() => {
    try {
      const savedFeedSort = localStorage.getItem('cb_pref_feed_sort') as 'latest' | 'top';
      if (savedFeedSort) setFeedSortPreference(savedFeedSort);
      const savedCompact = localStorage.getItem('cb_pref_compact_cards');
      if (savedCompact !== null) setCompactCards(savedCompact === 'true');
      const savedAutoExpand = localStorage.getItem('cb_pref_auto_abstracts');
      if (savedAutoExpand !== null) setAutoExpandAbstracts(savedAutoExpand === 'true');
      const savedNotifs = localStorage.getItem('cb_pref_notifications');
      if (savedNotifs) setNotifPreferences((prev) => ({ ...prev, ...JSON.parse(savedNotifs) }));
    } catch {
      // Storage unavailable: defaults apply.
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'integrations') {
      setLoadingIntegrations(true);
      fetchIntegrationStatus().finally(() => setLoadingIntegrations(false));
    }
  }, [activeTab, fetchIntegrationStatus]);

  const isSupervisor = currentUser?.role === 'RESEARCH_SUPERVISOR';
  const isAdmin = currentUser?.role === 'INSTITUTE_ADMIN';

  useEffect(() => {
    if (isSupervisor && activeTab === 'supervision') fetchMyScholars();
  }, [isSupervisor, activeTab, fetchMyScholars]);

  // A deep link to a research-only tab falls back to Identity for admins.
  useEffect(() => {
    if (isAdmin && (activeTab === 'domains' || activeTab === 'integrations')) setActiveTab('identity');
    if (!isSupervisor && activeTab === 'supervision') setActiveTab('identity');
  }, [isAdmin, isSupervisor, activeTab]);

  const selectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  };

  const handleProfileSubmit = async (data: any) => {
    try {
      await updateProfile({
        name: data.name,
        bio: data.bio,
        interests: selectedInterests,
      });
      addToast('Profile saved.', 'success');
    } catch (e: any) {
      addToast(`Your profile could not be saved: ${e.message}`, 'error');
    }
  };

  const onProfileInvalid = (formErrors: any) => {
    const firstErr = Object.values(formErrors)[0] as any;
    if (firstErr?.message) {
      addToast(firstErr.message, 'error');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file (PNG, JPG, WebP)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Photo size must be less than 5MB', 'error');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const presignedRes = await apiFetch('/api/threads/files/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `avatar-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!presignedRes.ok) {
        throw new Error((await readApiError(presignedRes)) || 'Failed to prepare upload');
      }

      const { uploadUrl, requiredHeaders, downloadPath } = await presignedRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: requiredHeaders || { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload to storage failed (HTTP ${uploadRes.status})`);
      }

      const fileUrl = downloadPath.startsWith('http') ? downloadPath : `${API_URL}${downloadPath}`;
      await updateProfile({ image: fileUrl });
      addToast('Profile photo updated successfully', 'success');
    } catch (err: any) {
      addToast(`Failed to update photo: ${err.message}`, 'error');
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;
    try {
      setIsUploadingPhoto(true);
      await updateProfile({ image: null });
      addToast('Profile photo removed', 'success');
    } catch (err: any) {
      addToast(`Failed to remove photo: ${err.message}`, 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const saveInterests = async () => {
    setSavingInterests(true);
    try {
      await updateProfile({
        name: currentUser?.name || undefined,
        bio: currentUser?.bio || undefined,
        department: currentUser?.department || undefined,
        interests: selectedInterests,
      });
      addToast('Research interests saved.', 'success');
    } catch (e: any) {
      addToast(`Your interests could not be saved: ${e.message}`, 'error');
    } finally {
      setSavingInterests(false);
    }
  };

  const handleAddInterest = (name: string) => {
    const cleaned = name.trim();
    if (cleaned && !selectedInterests.includes(cleaned)) {
      if (selectedInterests.length >= 8) {
        addToast('You can add up to 8 research interests.', 'info');
        return;
      }
      setSelectedInterests([...selectedInterests, cleaned]);
    }
    setNewInterestInput('');
  };

  const connect = async (provider: 'GOOGLE' | 'ZOOM') => {
    try {
      setConnectingProvider(provider);
      const callbackUrl = `${window.location.origin}/settings/integrations/callback`;
      const res = provider === 'GOOGLE' ? await getGoogleAuthUrl(callbackUrl) : await getZoomAuthUrl(callbackUrl);
      if (res?.authUrl) window.location.href = res.authUrl;
    } catch (err: any) {
      addToast(err.message || `Could not start the ${provider === 'GOOGLE' ? 'Google' : 'Zoom'} connection.`, 'error');
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async () => {
    const provider = confirmDisconnect;
    if (!provider) return;
    try {
      setDisconnectingProvider(provider);
      await disconnectIntegration(provider);
      addToast(`${provider === 'GOOGLE_WORKSPACE' ? 'Google Workspace' : 'Zoom'} disconnected.`, 'info');
      setConfirmDisconnect(null);
    } catch (err: any) {
      addToast(err.message || 'The integration could not be disconnected.', 'error');
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const persist = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage unavailable: the choice applies until reload.
    }
  };

  const saveFeedSort = (val: 'latest' | 'top') => {
    setFeedSortPreference(val);
    persist('cb_pref_feed_sort', val);
  };

  const handleNotifToggle = (key: NotifKey, next: boolean) => {
    setNotifPreferences((prev) => {
      const updated = { ...prev, [key]: next };
      persist('cb_pref_notifications', JSON.stringify(updated));
      window.dispatchEvent(new Event('cb-preferences-updated'));
      return updated;
    });
  };

  const googleConn = integrationConnections?.google;
  const zoomConn = integrationConnections?.zoom;
  const capacity = (currentUser as any)?.supervisorProfile?.maxScholars ?? 6;

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'identity', label: 'Profile', icon: User },
    ...(!isAdmin
      ? [
          { id: 'domains' as const, label: 'Research interests', icon: Tag },
          { id: 'integrations' as const, label: 'Connected apps', icon: Layers },
        ]
      : []),
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(isSupervisor ? [{ id: 'supervision' as const, label: 'Supervision', icon: GraduationCap }] : []),
  ];

  const IntegrationCard = ({
    name,
    detail,
    icon,
    conn,
    provider,
    onConnect,
  }: {
    name: string;
    detail: string;
    icon: React.ReactNode;
    conn: any;
    provider: 'GOOGLE_WORKSPACE' | 'ZOOM_WORKPLACE';
    onConnect: () => void;
  }) => {
    const connected = conn?.status === 'CONNECTED';
    return (
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-line p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-muted">{icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-ink">{name}</p>
              {connected ? (
                <Badge tone="success">
                  <CheckCircle2 className="size-3" aria-hidden />
                  Connected
                </Badge>
              ) : (
                <Badge tone="neutral">Not connected</Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-ink-muted">{detail}</p>
            {connected && conn.externalAccountEmail && <p className="mt-1 truncate font-mono text-xs text-ink-muted">{conn.externalAccountEmail}</p>}
          </div>
        </div>
        {connected ? (
          <Button variant="secondary" size="sm" className="self-start" loading={disconnectingProvider === provider} onClick={() => setConfirmDisconnect(provider)}>
            Disconnect
          </Button>
        ) : (
          <Button size="sm" className="self-start" loading={connectingProvider === (provider === 'GOOGLE_WORKSPACE' ? 'GOOGLE' : 'ZOOM')} onClick={onConnect}>
            Connect
            <ExternalLink aria-hidden />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        meta="Account"
        title="Settings"
        description="Your profile, preferences and connected tools."
        actions={
          isAdmin && (
            <Link href="/admin/settings" className={buttonVariants({ variant: 'secondary' })}>
              Platform settings
            </Link>
          )
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Section navigation */}
        <nav aria-label="Settings sections" className="lg:sticky lg:top-[calc(var(--layout-header)+1.5rem)]">
          <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <li key={tab.id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => selectTab(tab.id)}
                    className={cn(
                      'flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-fast',
                      selected ? 'bg-brand-50 font-medium text-brand-800' : 'text-ink-secondary hover:bg-neutral-100 hover:text-ink',
                    )}
                  >
                    <tab.icon className="size-4" aria-hidden />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 hidden border-t border-line pt-4 lg:block">
            <Button variant="ghost" className="w-full justify-start text-danger-700 hover:bg-danger-50 hover:text-danger-700" onClick={() => logout()}>
              <LogOut aria-hidden />
              Sign out
            </Button>
          </div>
        </nav>

        <div className="min-w-0 space-y-6">
          {/* Profile */}
          {activeTab === 'identity' && (
            <Card>
              <CardHeader
                title="Profile"
                description="Shown on your researcher profile and next to your posts."
                actions={
                  !isAdmin && (
                    <Link href="/profile" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                      View profile
                    </Link>
                  )
                }
              />
              <form onSubmit={handleSubmit(handleProfileSubmit, onProfileInvalid)}>
                <div className="space-y-5 p-5">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <img
                        src={getProfileImageUrl(currentUser)}
                        alt={currentUser?.name || 'Profile photo'}
                        referrerPolicy="no-referrer"
                        onError={(e) => handleAvatarError(e, currentUser?.name)}
                        className="size-16 rounded-full border border-line bg-surface-muted object-cover shadow-xs"
                      />
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xs">
                          <RefreshCw className="size-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-ink">{currentUser?.name}</p>
                        {currentUser?.role && <RoleBadge role={currentUser.role} />}
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          disabled={isUploadingPhoto}
                          onChange={handlePhotoUpload}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isUploadingPhoto}
                          onClick={() => photoInputRef.current?.click()}
                          className="gap-1.5 text-xs"
                        >
                          <Camera className="size-3.5" />
                          {currentUser?.image ? 'Change photo' : 'Upload photo'}
                        </Button>
                        {currentUser?.image && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isUploadingPhoto}
                            onClick={handleRemovePhoto}
                            className="text-xs text-ink-muted hover:text-danger-600"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Full name" htmlFor="set-name" error={errors.name?.message as string | undefined}>
                      <input id="set-name" type="text" {...register('name')} className="cb-input" />
                    </Field>
                    <Field label="Email" htmlFor="set-email" hint="Your sign-in address. The research office can change it.">
                      <input id="set-email" type="email" disabled value={currentUser?.email || ''} className="cb-input font-mono text-sm" />
                    </Field>
                  </div>

                  <dl className="grid grid-cols-1 gap-5 rounded-xl border border-line bg-surface-muted p-4 sm:grid-cols-2">
                    <DetailItem label="Department">{currentUser?.department || 'Not assigned'}</DetailItem>
                    <DetailItem label="Role">
                      {isSupervisor ? 'Research supervisor' : isAdmin ? 'Institute admin' : 'Research scholar'}
                    </DetailItem>
                    <p className="text-xs text-ink-muted sm:col-span-2">Department and role are set by the research office.</p>
                  </dl>

                  <Field label="Bio" htmlFor="set-bio" hint="A few sentences about your research." error={errors.bio?.message as string | undefined}>
                    <textarea id="set-bio" rows={4} {...register('bio')} className="cb-input resize-y" />
                  </Field>
                </div>
                <div className="flex justify-end border-t border-line bg-surface-muted px-5 py-3.5">
                  <Button type="submit" loading={isSubmitting}>
                    Save profile
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Research interests */}
          {activeTab === 'domains' && !isAdmin && (
            <Card>
              <CardHeader
                title="Research interests"
                description="Up to 8. Used to suggest researchers who share your interests, and shown on your profile."
                actions={<span className="text-sm tabular-nums text-ink-muted">{selectedInterests.length}/8</span>}
              />
              <div className="space-y-5 p-5">
                <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-muted p-3">
                  {selectedInterests.length === 0 ? (
                    <p className="text-sm text-ink-muted">No interests added yet.</p>
                  ) : (
                    selectedInterests.map((interest) => (
                      <span key={interest} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-sm text-brand-800 ring-1 ring-inset ring-brand-200">
                        {interest}
                        <button
                          type="button"
                          onClick={() => setSelectedInterests(selectedInterests.filter((t) => t !== interest))}
                          aria-label={`Remove ${interest}`}
                          className="flex size-5 items-center justify-center rounded-full hover:bg-brand-100"
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <Field label="Add an interest" htmlFor="set-interest" hint="Press Enter to add.">
                  <div className="flex gap-2">
                    <input
                      id="set-interest"
                      type="text"
                      value={newInterestInput}
                      onChange={(e) => setNewInterestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddInterest(newInterestInput);
                        }
                      }}
                      placeholder="e.g. Federated learning"
                      className="cb-input"
                    />
                    <Button variant="secondary" onClick={() => handleAddInterest(newInterestInput)} disabled={!newInterestInput.trim()}>
                      <Plus aria-hidden />
                      Add
                    </Button>
                  </div>
                </Field>

                {interestsList.filter((item) => !selectedInterests.includes(item)).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-ink">Suggested</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {interestsList
                        .filter((item) => !selectedInterests.includes(item))
                        .map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAddInterest(tag)}
                            className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-surface px-3 text-sm text-ink-secondary transition-colors duration-fast hover:border-line-strong hover:text-ink"
                          >
                            <Plus className="size-3.5" aria-hidden />
                            {tag}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end border-t border-line bg-surface-muted px-5 py-3.5">
                <Button onClick={saveInterests} loading={savingInterests}>
                  Save interests
                </Button>
              </div>
            </Card>
          )}

          {/* Connected apps */}
          {activeTab === 'integrations' && !isAdmin && (
            <Card>
              <CardHeader
                title="Connected apps"
                description="Create meetings from Curious Nexus with your own Google or Zoom account."
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLoadingIntegrations(true);
                      fetchIntegrationStatus().finally(() => setLoadingIntegrations(false));
                    }}
                    aria-label="Refresh connection status"
                  >
                    <RefreshCw className={cn(loadingIntegrations && 'animate-spin')} aria-hidden />
                    Refresh
                  </Button>
                }
              />
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <IntegrationCard
                    name="Google Workspace"
                    detail="Google Meet links and Chat spaces for workspaces."
                    provider="GOOGLE_WORKSPACE"
                    conn={googleConn}
                    onConnect={() => connect('GOOGLE')}
                    icon={
                      <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    }
                  />
                  <IntegrationCard
                    name="Zoom"
                    detail="Zoom meetings for supervision and collaboration."
                    provider="ZOOM_WORKPLACE"
                    conn={zoomConn}
                    onConnect={() => connect('ZOOM')}
                    icon={<Video className="size-5 text-brand" aria-hidden />}
                  />
                </div>
                <p className="text-sm text-ink-muted">
                  CuriousBees stores meeting links and who is invited. It does not record or transcribe meetings.
                </p>
              </div>
            </Card>
          )}

          {/* Appearance */}
          {activeTab === 'appearance' && (
            <Card>
              <CardHeader title="Appearance" description="Saved in this browser." />
              <div className="space-y-6 p-5">
                <fieldset>
                  <legend className="text-sm font-medium text-ink">Theme</legend>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:max-w-md">
                    {[
                      { id: 'light' as const, label: 'Light', icon: Sun },
                      { id: 'dark' as const, label: 'Dark', icon: Moon },
                    ].map((opt) => {
                      const selected = theme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setTheme(opt.id)}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors duration-fast',
                            selected ? 'border-brand bg-brand-50 text-ink ring-1 ring-brand' : 'border-line hover:border-line-strong',
                          )}
                        >
                          <opt.icon className={cn('size-5', selected ? 'text-brand' : 'text-ink-muted')} aria-hidden />
                          <span className="text-sm font-medium">{opt.label}</span>
                          {selected && <CheckCircle2 className="ml-auto size-4 text-brand" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {!isAdmin && (
                  <>
                    <div className="border-t border-line pt-5">
                      <p className="text-sm font-medium text-ink">Research feed order</p>
                      <div className="mt-2 inline-flex rounded-lg border border-line bg-surface-muted p-0.5" role="radiogroup" aria-label="Research feed order">
                        {[
                          { id: 'latest' as const, label: 'Latest first' },
                          { id: 'top' as const, label: 'Most discussed' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            role="radio"
                            aria-checked={feedSortPreference === opt.id}
                            onClick={() => saveFeedSort(opt.id)}
                            className={cn(
                              'h-8 rounded-md px-3.5 text-sm transition-colors duration-fast',
                              feedSortPreference === opt.id ? 'bg-surface font-medium text-ink shadow-xs' : 'text-ink-muted hover:text-ink',
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="divide-y divide-line border-t border-line">
                      <SwitchRow
                        checked={compactCards}
                        onChange={(next) => {
                          setCompactCards(next);
                          persist('cb_pref_compact_cards', String(next));
                        }}
                        label="Compact posts"
                        description="Less padding on feed posts, so more fit on screen."
                      />
                      <SwitchRow
                        checked={autoExpandAbstracts}
                        onChange={(next) => {
                          setAutoExpandAbstracts(next);
                          persist('cb_pref_auto_abstracts', String(next));
                        }}
                        label="Expand long posts"
                        description="Show the full text of posts instead of a preview."
                      />
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader
                title="Notifications"
                description="Choose which kinds of notifications appear in your list. Saved in this browser."
              />
              <div className="divide-y divide-line px-5">
                {NOTIFICATION_CATEGORIES.map((item) => (
                  <SwitchRow
                    key={item.key}
                    checked={notifPreferences[item.key]}
                    onChange={(next) => handleNotifToggle(item.key, next)}
                    label={item.label}
                    description={item.desc}
                  />
                ))}
              </div>
              <p className="border-t border-line bg-surface-muted px-5 py-3.5 text-sm text-ink-muted">
                Account and security notices always appear.
              </p>
            </Card>
          )}

          {/* Supervision */}
          {activeTab === 'supervision' && isSupervisor && (
            <Card>
              <CardHeader
                title="Supervision"
                actions={
                  <Link href="/my-scholars" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                    Supervision Panel
                  </Link>
                }
              />
              <div className="space-y-4 p-5">
                <div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-ink-secondary">Scholars you supervise</span>
                    <span className="tabular-nums text-ink">
                      <span className="font-semibold">{myScholars.length}</span> of {capacity}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100"
                    role="progressbar"
                    aria-label="Supervision capacity used"
                    aria-valuemin={0}
                    aria-valuemax={capacity}
                    aria-valuenow={myScholars.length}
                  >
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (myScholars.length / capacity) * 100)}%` }} />
                  </div>
                </div>
                <p className="text-sm text-ink-muted">
                  New supervision requests can be approved until you reach your capacity. Capacity is part of your supervisor record; contact
                  the research office to change it.
                </p>
              </div>
            </Card>
          )}

          <Button variant="ghost" className="text-danger-700 hover:bg-danger-50 hover:text-danger-700 lg:hidden" onClick={() => logout()}>
            <LogOut aria-hidden />
            Sign out
          </Button>
        </div>
      </div>

      <Dialog
        open={!!confirmDisconnect}
        onClose={() => setConfirmDisconnect(null)}
        dismissible={!disconnectingProvider}
        size="sm"
        title={`Disconnect ${confirmDisconnect === 'GOOGLE_WORKSPACE' ? 'Google Workspace' : 'Zoom'}?`}
        description="New meetings will no longer be created with this account. You can reconnect at any time."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDisconnect(null)} disabled={!!disconnectingProvider}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDisconnect} loading={!!disconnectingProvider}>
              Disconnect
            </Button>
          </>
        }
      />
    </div>
  );
}

export default function UnifiedSettingsPage() {
  return (
    <React.Suspense fallback={null}>
      <UnifiedSettingsContent />
    </React.Suspense>
  );
}
