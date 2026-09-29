'use client';

/**
 * Faculties & Departments Institutional Structure Manager
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  Building,
  Plus,
  Edit2,
  Users,
  GraduationCap,
  UserCheck,
  Loader2,
  CheckCircle2,
  Search,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FacultiesDepartmentsPage() {
  const {
    fetchAdminFaculties,
    createAdminFaculty,
    updateAdminFaculty,
    deleteAdminFaculty,
    fetchAdminDepartments,
    createAdminDepartment,
    updateAdminDepartment,
    deleteAdminDepartment,
  } = useStore();

  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [facultyModal, setFacultyModal] = useState<{ id?: string; name: string } | null>(null);
  const [deptModal, setDeptModal] = useState<{
    id?: string;
    name: string;
    code: string;
    facultyId: string;
    description?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fData, dData] = await Promise.all([
        fetchAdminFaculties(),
        fetchAdminDepartments(),
      ]);
      setFaculties(fData || []);
      setDepartments(dData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFacultySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyModal || !facultyModal.name.trim()) return;

    setSubmitting(true);
    try {
      if (facultyModal.id) {
        await updateAdminFaculty(facultyModal.id, facultyModal.name.trim());
      } else {
        await createAdminFaculty(facultyModal.name.trim());
      }
      setFacultyModal(null);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptModal || !deptModal.name.trim() || !deptModal.code.trim() || !deptModal.facultyId) return;

    setSubmitting(true);
    try {
      if (deptModal.id) {
        await updateAdminDepartment(deptModal.id, {
          name: deptModal.name.trim(),
          code: deptModal.code.trim(),
          facultyId: deptModal.facultyId,
          description: deptModal.description,
        });
      } else {
        await createAdminDepartment({
          name: deptModal.name.trim(),
          code: deptModal.code.trim(),
          facultyId: deptModal.facultyId,
          description: deptModal.description,
        });
      }
      setDeptModal(null);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFaculty = async (f: any) => {
    if (confirm(`Are you sure you want to delete Faculty "${f.name}"? This requires that no departments are attached.`)) {
      try {
        await deleteAdminFaculty(f.id);
        await loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteDepartment = async (d: any) => {
    if (confirm(`Are you sure you want to delete Department "${d.name}"? This requires that no researchers or opportunities are attached.`)) {
      try {
        await deleteAdminDepartment(d.id);
        await loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredDepts = departments.filter((d) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(s) ||
      d.code.toLowerCase().includes(s) ||
      (d.faculty?.name && d.faculty.name.toLowerCase().includes(s))
    );
  });

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
            Faculties & Academic Departments
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Configure faculties, department codes, and organizational structures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFacultyModal({ name: '' })}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-surface border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Faculty</span>
          </button>
          <button
            onClick={() =>
              setDeptModal({
                name: '',
                code: '',
                facultyId: faculties[0]?.id || '',
                description: '',
              })
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand hover:bg-brand-strong text-white transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Faculties List Card */}
        <div className="bg-surface border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-brand" />
              <span>Faculties ({faculties.length})</span>
            </h3>
          </div>

          <div className="space-y-2">
            {faculties.map((f) => (
              <div
                key={f.id}
                className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{f.name}</h4>
                  <p className="text-2xs text-slate-400 mt-0.5">
                    {f._count?.departments ?? f.departments?.length ?? 0} Departments •{' '}
                    {f._count?.scholarProfiles ?? 0} Scholars • {f._count?.supervisorProfiles ?? 0} Supervisors
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFacultyModal({ id: f.id, name: f.name })}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Edit Faculty"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteFaculty(f)}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete Faculty"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Departments List Card */}
        <div className="bg-surface border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-teal-600" />
              <span>Departments ({departments.length})</span>
            </h3>
            <div className="relative w-40">
              <input
                type="text"
                placeholder="Filter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2 py-1 text-2xs font-semibold"
              />
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {filteredDepts.map((d) => (
              <div
                key={d.id}
                className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium capitalize bg-teal-50 text-teal-700 border border-teal-200">
                      {d.code}
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs">{d.name}</h4>
                  </div>
                  <p className="text-2xs text-slate-400 mt-1">
                    Faculty: {d.faculty?.name || 'SRMIST'} • {d._count?.users ?? 0} Users
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setDeptModal({
                        id: d.id,
                        name: d.name,
                        code: d.code,
                        facultyId: d.facultyId || faculties[0]?.id || '',
                        description: d.description || '',
                      })
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Edit Department"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteDepartment(d)}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete Department"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Faculty Modal */}
      {facultyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-slate-200/80 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              {facultyModal.id ? 'Edit Faculty' : 'Create New Faculty'}
            </h3>
            <form onSubmit={handleFacultySubmit} className="space-y-3">
              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">Faculty Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Faculty of Engineering and Technology"
                  value={facultyModal.name}
                  onChange={(e) => setFacultyModal({ ...facultyModal, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFacultyModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !facultyModal.name.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-white cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {deptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-slate-200/80 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              {deptModal.id ? 'Edit Department' : 'Create New Department'}
            </h3>
            <form onSubmit={handleDeptSubmit} className="space-y-3">
              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Department of Computer Science and Engineering"
                  value={deptModal.name}
                  onChange={(e) => setDeptModal({ ...deptModal, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE"
                  value={deptModal.code}
                  onChange={(e) => setDeptModal({ ...deptModal, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold uppercase"
                />
              </div>

              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">Parent Faculty</label>
                <select
                  value={deptModal.facultyId}
                  onChange={(e) => setDeptModal({ ...deptModal, facultyId: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  {faculties.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeptModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !deptModal.name.trim() || !deptModal.code.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-white cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
