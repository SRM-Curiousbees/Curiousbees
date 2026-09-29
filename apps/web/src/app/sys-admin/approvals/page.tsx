'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  CheckCircle2, 
  UserCheck, 
  RefreshCw, 
  Loader2, 
  FileCheck2,
  ExternalLink,
  BookOpen
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminApprovalsPage() {
  const [stats, setStats] = useState({
    supervisors: 0,
    scholars: 0,
    departments: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/all`);
      if (res.ok) {
        const users = await res.json();
        const supervisors = users.filter((u: any) => u.role === 'RESEARCH_SUPERVISOR' || u.role === 'SUPERVISOR').length;
        const scholars = users.filter((u: any) => u.role === 'RESEARCH_SCHOLAR' || u.role === 'SCHOLAR').length;
        setStats(prev => ({ ...prev, supervisors, scholars }));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand" /> Institutional Supervision Governance
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            CuriousBees decentralized academic model & oversight
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Model Governance Architecture Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Institutional Roles & Approval Policy</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              CuriousBees implements institutional research autonomy. Academic relationships are established directly between faculty and scholars without requiring administrative gatekeeping for supervisor onboarding:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="bg-surface p-4 rounded-xl border border-blue-200/60 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-brand font-medium text-xs capitalize">
              <UserCheck className="w-4 h-4" />
              <span>Research Supervisors</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Join directly with institutional faculty credentials. No administrative approval required. Supervisors create research workspaces and review candidate proposals.
            </p>
          </div>

          <div className="bg-surface p-4 rounded-xl border border-blue-200/60 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 font-medium text-xs capitalize">
              <BookOpen className="w-4 h-4" />
              <span>Research Scholars</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Discover supervisors aligned by research domain and topic. Supervision is granted directly by the designated supervisor through proposal review.
            </p>
          </div>

          <div className="bg-surface p-4 rounded-xl border border-blue-200/60 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-700 font-medium text-xs capitalize">
              <ShieldCheck className="w-4 h-4" />
              <span>Institute Admin</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Governance only. Oversees compliance, user account suspension/activation, department taxonomy, and system audit logs.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Governance Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link 
          href="/sys-admin/users" 
          className="bg-surface border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand transition-colors">
                User & Role Management
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage accounts, departments, and roles
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-brand" />
        </Link>

        <Link 
          href="/sys-admin/audit" 
          className="bg-surface border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand transition-colors">
                System Audit Logs
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review governance actions and academic activities
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-brand" />
        </Link>
      </div>

      {/* Governance Confirmation Card */}
      <div className="bg-surface border border-slate-200 rounded-2xl p-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800">Decentralized Supervision Active</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            All supervisor approvals are handled directly by faculty through their Supervision Panel (/my-scholars).
          </p>
        </div>
      </div>
    </div>
  );
}
