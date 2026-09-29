'use client';

/**
 * Institutional System Configuration & Governance Settings
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Settings, Shield, Mail, Lock, Server, Loader2, Check, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminSettingsPage() {
  const { fetchAdminSettings, updateAdminSetting } = useStore();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'AUTH' | 'EMAIL' | 'SECURITY'>('GENERAL');
  const [saving, setSaving] = useState(false);

  // Form states
  const [formValues, setFormValues] = useState<any>({});

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminSettings();
      setSettings(data);
      setFormValues(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveCategory = async (category: string, key: string, val: any) => {
    setSaving(true);
    try {
      await updateAdminSetting(key, val, category);
      await loadSettings();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
        <p className="text-xs font-bold">Loading institutional configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2 select-none">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-purple-50 text-purple-700 border border-purple-200">
            System Administration
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
          Institutional System Settings
        </h1>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">
          Configure institutional domains, authentication rules, Brevo email settings, and security retention.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 pb-1">
        {[
          { id: 'GENERAL', label: 'General Identity', icon: Settings },
          { id: 'AUTH', label: 'Authentication & SSO', icon: Lock },
          { id: 'EMAIL', label: 'Email & Brevo Gateway', icon: Mail },
          { id: 'SECURITY', label: 'Security & Audit Retention', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Form Cards */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-6">
        {activeTab === 'GENERAL' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Institution Legal Name
              </label>
              <input
                type="text"
                value={formValues.general?.institutionName || ''}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    general: { ...formValues.general, institutionName: e.target.value },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Institution Code
              </label>
              <input
                type="text"
                value={formValues.general?.institutionCode || ''}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    general: { ...formValues.general, institutionCode: e.target.value },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 uppercase"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Primary Institution Domain
              </label>
              <input
                type="text"
                value={formValues.general?.domain || ''}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    general: { ...formValues.general, domain: e.target.value },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              />
            </div>

            <button
              onClick={() => handleSaveCategory('GENERAL', 'general', formValues.general)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-white cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save General Settings</span>
            </button>
          </div>
        )}

        {activeTab === 'AUTH' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Google Workspace SSO</h4>
                <p className="text-2xs text-slate-400">Allow researchers to sign in via institutional Google accounts.</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(formValues.authentication?.googleOAuthEnabled)}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    authentication: {
                      ...formValues.authentication,
                      googleOAuthEnabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-brand"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Allowed Email Domain Whitelist (comma separated)
              </label>
              <input
                type="text"
                value={formValues.authentication?.allowedDomains?.join(', ') || ''}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    authentication: {
                      ...formValues.authentication,
                      allowedDomains: e.target.value.split(',').map((s: string) => s.trim()),
                    },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              />
            </div>

            <button
              onClick={() => handleSaveCategory('AUTH', 'authentication', formValues.authentication)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-white cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Authentication Rules</span>
            </button>
          </div>
        )}

        {activeTab === 'EMAIL' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Brevo Sender Name
              </label>
              <input
                type="text"
                value={formValues.email?.senderName || ''}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    email: { ...formValues.email, senderName: e.target.value },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Brevo Sender Email Address
              </label>
              <input
                type="text"
                value={formValues.email?.senderEmail || ''}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    email: { ...formValues.email, senderEmail: e.target.value },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              />
            </div>

            <button
              onClick={() => handleSaveCategory('EMAIL', 'email', formValues.email)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-white cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Email Configuration</span>
            </button>
          </div>
        )}

        {activeTab === 'SECURITY' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Audit Trail Retention Period (Days)
              </label>
              <input
                type="number"
                value={formValues.security?.auditRetentionDays || 365}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    security: {
                      ...formValues.security,
                      auditRetentionDays: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              />
            </div>

            <button
              onClick={() => handleSaveCategory('SECURITY', 'security', formValues.security)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-white cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Security Policies</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
