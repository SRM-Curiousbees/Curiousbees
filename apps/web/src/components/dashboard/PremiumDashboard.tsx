'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Bookmark,
  MoreVertical,
  Plus,
  BookOpen,
  FolderOpen,
  ClipboardList,
  FileText
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AvatarRing from '@/components/AvatarRing';
import { SupervisorRequestsWidget } from './SupervisorRequestsWidget';
import { ScholarSupervisorStatusWidget } from './ScholarSupervisorStatusWidget';

export function PremiumDashboard() {
  const {
    currentUser,
    workspaces,
    publications,
    reports,
    fetchSuggestedPeers,
    connectWithPeer,
    fetchWorkspaces,
    fetchPublications,
    fetchReports,
  } = useStore();

  const [reportsData, setReportsData] = useState(reports);
  const [peers, setPeers] = useState<any[]>([]);

  const hasFetched = React.useRef(false);

  useEffect(() => {
    if (currentUser?.role === 'RESEARCH_SCHOLAR') {
      fetchSuggestedPeers().then(data => setPeers(data || []));
    }
  }, [currentUser?.role, fetchSuggestedPeers]);

  useEffect(() => {
    if (!currentUser || hasFetched.current) return;
    hasFetched.current = true;
    fetchWorkspaces();
    fetchPublications(currentUser.id);
    fetchReports();
    fetchSuggestedPeers();
  }, [currentUser, fetchWorkspaces, fetchPublications, fetchReports, fetchSuggestedPeers]);

  // ─── Profile Completion Logic ─────────────────────────────────────────────
  const hasBio = !!currentUser?.bio;
  const hasDepartment = !!currentUser?.department;
  const hasInterests = (currentUser?.interests?.length || 0) > 0;
  const hasPubs = publications.length > 0;
  const hasReports = reports.length > 0;
  
  let profileStrength = 0;
  if (hasBio) profileStrength += 20;
  if (hasDepartment) profileStrength += 20;
  if (hasInterests) profileStrength += 20;
  if (hasPubs) profileStrength += 20;
  if (hasReports) profileStrength += 20;

  // ─── Activity Velocity Chart Logic ────────────────────────────────────────
  // We will aggregate publications and reports by day of the week to simulate the chart
  const chartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Initialize empty data
    const data = days.map(day => ({ name: day, publications: 0, reports: 0 }));
    
    // Add some baseline artificial data if there's no real data yet just to make the chart visible
    // But we are required to use live data. If everything is 0, the chart is flat.
    // Let's parse dates from real data
    publications.forEach(pub => {
      if (pub.createdAt) {
        const date = new Date(pub.createdAt);
        // JS getDay() is 0=Sun, 1=Mon... we want 0=Mon, 6=Sun
        const dayIdx = (date.getDay() + 6) % 7;
        data[dayIdx].publications += 1;
      }
    });

    reports.forEach(rep => {
      if (rep.createdAt) {
        const date = new Date(rep.createdAt);
        const dayIdx = (date.getDay() + 6) % 7;
        data[dayIdx].reports += 1;
      }
    });

    return data;
  }, [publications, reports]);

  // ─── Recent Attachments Logic ─────────────────────────────────────────────
  const recentFiles = useMemo(() => {
    const files: any[] = [];
    workspaces.forEach(ws => {
      if (ws.files) {
        ws.files.forEach((f: any) => {
          files.push({ ...f, workspaceTitle: ws.title });
        });
      }
    });
    return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
  }, [workspaces]);

  // ─── Dynamic Links ────────────────────────────────────────────────────────
  const isSupervisor = currentUser?.role === 'RESEARCH_SUPERVISOR';
  const prefix = isSupervisor ? '' : '/scholar';
  const newPostLink = isSupervisor ? '/opportunities' : '/scholar/my-research';
  const workspacesLink = isSupervisor ? '/workspace' : '/scholar/workspaces';
  const profileLink = isSupervisor ? '/profile' : '/scholar/profile';
  const collaboratorsLink = isSupervisor ? '/my-scholars' : '/scholar/connections';

  return (
    <div className="min-h-screen bg-slate-50 pb-12 transition-colors">
      <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6">
        
        {/* 🚀 HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Welcome back, {currentUser?.name?.split(' ')[0] || 'Researcher'}. Here is your research summary.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-50 transition-colors cursor-pointer">
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <span>Last 30 Days</span>
            </button>
            <Link href={newPostLink}>
              <button className="theme-static flex items-center gap-2 px-6 py-2.5 bg-gold hover:bg-warning-300 text-slate-900 font-semibold rounded-full text-sm shadow-md  transition-all active:scale-95 cursor-pointer">
                <span>New Post</span>
              </button>
            </Link>
          </div>
        </div>

        {/* 🎓 SUPERVISION WORKFLOW WIDGETS */}
        {isSupervisor ? (
          <SupervisorRequestsWidget />
        ) : (
          <ScholarSupervisorStatusWidget />
        )}

        {/* 🚀 MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Metrics + Chart + Attachments) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Pending Actions Box */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-warning text-white rounded-xl shadow-sm">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Pending Governance Actions</h4>
                  <p className="text-xs text-amber-700">Requires review or approval</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/supervisor" className="px-3.5 py-1.5 bg-surface border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition-colors">
                  Supervision Requests
                </Link>
                <Link href="/reports" className="px-3.5 py-1.5 bg-surface border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition-colors">
                  2 Reports Awaiting Review
                </Link>
                <Link href="/publications" className="px-3.5 py-1.5 bg-surface border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition-colors">
                  1 Publication Verification
                </Link>
              </div>
            </div>
            
            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              
              {/* Card 1: Publications */}
              <div className="bg-surface rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-[140px]">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Publications Logged</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{publications.length}</h3>
                </div>
              </div>

              {/* Card 2: Workspaces */}
              <div className="bg-surface rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-[140px]">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-500 flex items-center justify-center font-bold text-lg">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    Active
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Active Workspaces</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{workspaces.length}</h3>
                </div>
              </div>

              {/* Card 3: Reports */}
              <div className="bg-surface rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-[140px]">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-500 flex items-center justify-center font-bold text-lg">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Submitted Reports</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{reports.length}</h3>
                </div>
              </div>

            </div>

            {/* Activity Velocity Chart */}
            <div className="bg-surface rounded-2xl p-6 border border-slate-100 shadow-sm h-[320px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800">Activity Velocity</h3>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Publications
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    Reports
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPubs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(var(--brand-500))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="rgb(var(--brand-500))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(var(--warning-500))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="rgb(var(--warning-500))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'rgb(var(--neutral-500))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'rgb(var(--neutral-500))' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '10px', border: '1px solid rgb(var(--line))', backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--ink))', boxShadow: 'var(--shadow-lg)' }}
                      labelStyle={{ fontWeight: 600, color: 'rgb(var(--ink))' }}
                    />
                    <Area type="monotone" dataKey="publications" stroke="rgb(var(--brand-500))" strokeWidth={3} fillOpacity={1} fill="url(#colorPubs)" />
                    <Area type="monotone" dataKey="reports" stroke="rgb(var(--warning-500))" strokeWidth={3} fillOpacity={1} fill="url(#colorReports)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Attachments */}
            <div className="bg-surface rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800">Recent Attachments</h3>
                <Link href={workspacesLink} className="text-xs font-semibold text-blue-500 hover:underline">
                  View All
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {recentFiles.length === 0 ? (
                  <div className="py-4 text-xs text-slate-400 italic">No recent attachments in workspaces.</div>
                ) : (
                  recentFiles.map((file, i) => (
                    <div key={i} className="py-3 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          file.name.endsWith('.pdf') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                        }`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 line-clamp-1">{file.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {file.size} • Uploaded in {file.workspaceTitle}
                          </p>
                        </div>
                      </div>
                      <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors cursor-pointer">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column (Profile + Collaborators + Interests) */}
          <div className="space-y-6">
            
            {/* Profile Completion */}
            <div className="bg-surface rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-5">Profile Completion</h3>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gold rounded-full transition-all duration-1000" style={{ width: `${profileStrength}%` }} />
              </div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-bold text-slate-600">{profileStrength}% Complete</span>
                <Link href={profileLink} className="text-xs font-semibold text-amber-600 hover:underline">
                  Edit Info
                </Link>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={`w-5 h-5 ${hasDepartment ? 'text-teal-500' : 'text-slate-200'}`} />
                  <span className={`text-xs font-semibold ${hasDepartment ? 'text-slate-700' : 'text-slate-400'}`}>Academic History Verified</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={`w-5 h-5 ${hasPubs ? 'text-teal-500' : 'text-slate-200'}`} />
                  <span className={`text-xs font-semibold ${hasPubs ? 'text-slate-700' : 'text-slate-400'}`}>Log First Publication</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={`w-5 h-5 ${hasInterests ? 'text-teal-500' : 'text-slate-200'}`} />
                  <span className={`text-xs font-semibold ${hasInterests ? 'text-slate-700' : 'text-slate-400'}`}>Complete Interests Tags</span>
                </div>
              </div>
            </div>

            {/* Suggested Collaborators */}
            <div className="bg-surface rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm font-bold text-slate-800">Suggested Collaborators</h3>
                <Link href={collaboratorsLink} className="text-xs font-semibold text-blue-500 hover:underline">
                  View all
                </Link>
              </div>
              <div className="space-y-4">
                {peers?.slice(0, 4).map((peer) => (
                  <div key={peer.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AvatarRing
                        src={peer.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(peer.name)}&background=random`}
                        name={peer.name}
                        role={peer.role}
                        size="sm"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{peer.name}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1">{peer.department || 'Researcher'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => connectWithPeer(peer.id)}
                      className="px-4 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {peer.connectionStatus === 'connected' ? 'Connected' : peer.connectionStatus === 'pending' ? 'Pending' : 'Follow'}
                    </button>
                  </div>
                ))}
                {(!peers || peers.length === 0) && (
                  <p className="text-xs text-slate-400 italic">No peers suggested yet.</p>
                )}
              </div>
            </div>

            {/* Your Interests */}
            <div className="bg-surface rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Your Interests</h3>
              <div className="flex flex-wrap gap-2">
                {currentUser?.interests?.map((tag: any) => {
                  const label = typeof tag === 'string' ? tag : (tag?.interest?.name || tag?.name || 'Interest');
                  return (
                    <span key={label} className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
                      #{label}
                    </span>
                  );
                })}
                {(!currentUser?.interests || currentUser.interests.length === 0) && (
                  <p className="text-xs text-slate-400 italic">No interests added yet.</p>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
