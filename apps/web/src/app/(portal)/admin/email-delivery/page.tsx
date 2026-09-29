'use client';

/**
 * Brevo Email Delivery Status & Governance Monitor
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, Send, Loader2, Server, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmailDeliveryPage() {
  const { fetchAdminEmailStats } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminEmailStats();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
        <p className="text-xs font-bold">Checking Brevo email gateway telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-blue-50 text-blue-700 border border-blue-200">
              Communication Infrastructure
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Email Delivery & Brevo Status
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Monitor institutional transactional email delivery, supervision notifications, and delivery rates.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-surface border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Gateway Status Banner */}
      <div className="p-5 rounded-2xl bg-surface border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                Provider: {data.provider}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-emerald-50 text-emerald-700 border border-emerald-200">
                {data.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sender Address: <strong className="text-slate-700">{data.senderEmail}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>Transactional API Connected</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs">
          <span className="text-2xs font-bold text-slate-400 block uppercase">Emails Dispatched</span>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{data.stats.emailsSent}</p>
        </div>
        <div className="bg-surface border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs">
          <span className="text-2xs font-bold text-slate-400 block uppercase">Delivered</span>
          <p className="text-2xl font-semibold text-emerald-600 mt-1">{data.stats.emailsDelivered}</p>
        </div>
        <div className="bg-surface border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs">
          <span className="text-2xs font-bold text-slate-400 block uppercase">Bounces / Failed</span>
          <p className="text-2xl font-semibold text-slate-700 mt-1">{data.stats.emailsFailed}</p>
        </div>
        <div className="bg-surface border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs">
          <span className="text-2xs font-bold text-slate-400 block uppercase">Push Notification Tokens</span>
          <p className="text-2xl font-semibold text-blue-600 mt-1">{data.stats.activePushDevices}</p>
        </div>
      </div>

      {/* Recent Dispatches Table */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs space-y-3 p-5">
        <h3 className="text-sm font-semibold text-slate-900">Recent Automated Dispatches</h3>
        <div className="relative overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-medium capitalize text-slate-500">
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Template / Trigger</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Dispatched At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-800">{log.recipient}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-2xs">{log.template}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-2xs font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-2xs">{new Date(log.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
