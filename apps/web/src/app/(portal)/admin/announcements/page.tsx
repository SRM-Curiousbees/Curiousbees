'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { Megaphone, Plus, Search, Edit3, Trash2, X, Check, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const { currentUser, addToast } = useStore();

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pushToEmail, setPushToEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Guard against non-admin access
  useEffect(() => {
    if (currentUser && currentUser.role !== 'INSTITUTE_ADMIN') {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { apiFetch } = await import('@/lib/api-client');
      const res = await apiFetch('/api/announcements/admin');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (e) {
      console.error('Failed to load announcements:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'INSTITUTE_ADMIN') fetchAnnouncements();
  }, [currentUser]);

  if (currentUser?.role !== 'INSTITUTE_ADMIN') return null;

  const handleOpenCreate = () => {
    setEditingItem(null);
    setTitle('');
    setContent('');
    setPushToEmail(false);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content);
    setPushToEmail(item.pushToEmail);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const { apiFetch, readApiError } = await import('@/lib/api-client');
      let res: Response;
      if (editingItem) {
        res = await apiFetch(`/api/announcements/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, pushToEmail }),
        });
        if (!res.ok) throw new Error(await readApiError(res) || 'Failed to update announcement');
        addToast('Announcement updated', 'success');
      } else {
        res = await apiFetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, pushToEmail }),
        });
        if (!res.ok) throw new Error(await readApiError(res) || 'Failed to create announcement');
        addToast('Announcement created', 'success');
      }
      setIsDrawerOpen(false);
      fetchAnnouncements();
    } catch (err: any) {
      addToast(`Error saving announcement: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    setProcessingId(id);
    try {
      const { apiFetch } = await import('@/lib/api-client');
      await apiFetch(`/api/announcements/${id}`, { method: 'DELETE' });
      fetchAnnouncements();
      addToast('Announcement deleted', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('Push this announcement globally? It will be visible to all users.')) return;
    setProcessingId(id);
    try {
      const { apiFetch } = await import('@/lib/api-client');
      await apiFetch(`/api/announcements/${id}/publish`, { method: 'POST' });
      fetchAnnouncements();
      addToast('Announcement published successfully', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = announcements.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        meta="Communication"
        title="Announcements"
        description="Notices for everyone on CuriousBees. Draft them here and publish when they’re ready."
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus aria-hidden />
            New announcement
          </Button>
        }
        className="pb-2"
      />

      {/* Search */}
      <div className="cb-card p-4 bg-surface/95 backdrop-blur-md max-w-md">
        <div className="relative">
          <input type="text" placeholder="Search announcements..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="cb-input pl-9" />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && announcements.length === 0 ? (
          <div className="cb-card p-12 text-center bg-surface/95 backdrop-blur-md md:col-span-2 lg:col-span-3">
            <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
            <span className="text-xs font-bold text-slate-500">Loading Announcements...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="cb-card p-12 text-center bg-surface/95 backdrop-blur-md md:col-span-2 lg:col-span-3">
            <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-900 font-bold text-sm">No Announcements Found</h3>
            <p className="text-slate-400 text-xs mt-1">Draft a new announcement to broadcast to your users.</p>
          </div>
        ) : (
          filtered.map(item => {
            const isPublished = item.status === 'PUBLISHED';
            const isProcessing = processingId === item.id;
            return (
              <div key={item.id} className={`cb-card p-5 bg-surface/95 backdrop-blur-md flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group ${isPublished ? 'border-primary/20' : 'border-slate-100'}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.status}
                    </span>
                    <span className="text-2xs text-slate-400 font-bold">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-3">
                    {item.content}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100/50">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenEdit(item)} disabled={isPublished} className="p-2 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" title={isPublished ? "Published announcements cannot be edited" : "Edit Announcement"}>
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} disabled={isProcessing} className="p-2 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  {!isPublished && (
                    <button onClick={() => handlePublish(item.id)} disabled={isProcessing} className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs uppercase rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50">
                      <Send className="w-3.5 h-3.5" /> Push
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 cursor-pointer" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 right-0 w-full sm:max-w-lg bg-surface border-l border-slate-200 z-50 p-6 shadow-2xl flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div className="flex items-center space-x-2.5">
                  <Megaphone className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-display font-bold text-sm text-brand">
                      {editingItem ? 'Edit Announcement' : 'Create Announcement'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium capitalize mt-1">
                      Global Broadcast
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-455 capitalize">Title *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Scheduled System Maintenance" className="cb-input w-full" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-455 capitalize">Content *</label>
                  <textarea rows={8} value={content} onChange={e => setContent(e.target.value)} required placeholder="Message details..." className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-surface border border-slate-200 outline-none focus:border-primary transition-all" />
                </div>
                {/* Emailing announcements isn't implemented, so there's no option for it here. */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium capitalize cursor-pointer" disabled={saving}>Cancel</button>
                  <button type="submit" disabled={saving} className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-medium capitalize rounded-lg shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}<span>{editingItem ? 'Save Changes' : 'Save Draft'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
