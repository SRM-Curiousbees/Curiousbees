'use client';

/**
 * Campuses & Institutional Locations Management
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { MapPin, Plus, Edit2, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CampusesPage() {
  const { fetchAdminCampuses, createAdminCampus, updateAdminCampus } = useStore();
  const [campuses, setCampuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ id?: string; name: string; code: string; location?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCampuses = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminCampuses();
      setCampuses(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampuses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal || !modal.name.trim() || !modal.code.trim()) return;

    setSubmitting(true);
    try {
      if (modal.id) {
        await updateAdminCampus(modal.id, {
          name: modal.name.trim(),
          code: modal.code.trim(),
          location: modal.location,
        });
      } else {
        await createAdminCampus({
          name: modal.name.trim(),
          code: modal.code.trim(),
          location: modal.location,
        });
      }
      setModal(null);
      await loadCampuses();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-teal-50 text-teal-700 border border-teal-200">
              Institutional Structure
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Institutional Campuses & Locations
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Configure SRMIST campuses, regional centers, and research branches.
          </p>
        </div>

        <button
          onClick={() => setModal({ name: '', code: '', location: '' })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand hover:bg-brand-strong text-white transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Campus</span>
        </button>
      </div>

      {/* Campuses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <p className="text-xs font-bold">Querying campuses...</p>
          </div>
        ) : campuses.length === 0 ? (
          <div className="col-span-3 py-16 bg-surface border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
            <MapPin className="w-10 h-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No campuses configured</h3>
          </div>
        ) : (
          campuses.map((c) => (
            <div
              key={c.id}
              className="bg-surface border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="px-2 py-0.5 rounded text-xs font-medium capitalize bg-teal-50 text-teal-700 border border-teal-200">
                    {c.code}
                  </span>
                  <button
                    onClick={() =>
                      setModal({
                        id: c.id,
                        name: c.name,
                        code: c.code,
                        location: c.location || '',
                      })
                    }
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mt-2">{c.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{c.location || 'Main Campus'}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-400">
                <span>Status: Active</span>
                <span>{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Campus Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-slate-200/80 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              {modal.id ? 'Edit Campus' : 'Create Campus'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">Campus Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kattankulathur Main Campus"
                  value={modal.name}
                  onChange={(e) => setModal({ ...modal, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">Campus Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KTR"
                  value={modal.code}
                  onChange={(e) => setModal({ ...modal, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold uppercase"
                />
              </div>

              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">Location / City</label>
                <input
                  type="text"
                  placeholder="e.g. Chennai, Tamil Nadu"
                  value={modal.location}
                  onChange={(e) => setModal({ ...modal, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !modal.name.trim() || !modal.code.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-white cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Campus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
