'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send, Loader2, CheckCircle2, Users, GraduationCap, BookOpen, Megaphone } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const TARGETS = [
  { value: 'ALL', label: 'All Users', icon: Users, desc: 'Send to every registered user' },
  { value: 'SCHOLAR', label: 'Scholars Only', icon: GraduationCap, desc: 'Target all scholars' },
  { value: 'SUPERVISOR', label: 'Supervisors Only', icon: BookOpen, desc: 'Target all supervisors' },
];

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Please fill in both title and message.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/notifications/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-bypass': 'true' },
        body: JSON.stringify({ title, message, targetRole: target === 'ALL' ? undefined : target }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setTitle('');
          setMessage('');
          setTarget('ALL');
        }, 3000);
      } else {
        setError('Failed to send notification. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Bell className="w-6 h-6 text-purple-500" /> Send Notification
        </h1>
        <p className="text-slate-500 text-sm mt-1">Broadcast announcements to users on the platform</p>
      </div>

      {sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="font-semibold text-emerald-800">Notification sent successfully!</p>
          <p className="text-sm text-emerald-600 mt-1">All targeted users will see it in their notification feed.</p>
        </motion.div>
      ) : (
        <div className="bg-surface border border-slate-200/70 rounded-2xl p-6 shadow-sm space-y-5">
          {/* Target audience */}
          <div>
            <label className="block text-xs font-medium capitalize text-slate-500 mb-3">
              Target Audience
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TARGETS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTarget(t.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer
                    ${target === t.value
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                >
                  <t.icon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium capitalize text-slate-500 mb-2">
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. System Maintenance on June 15"
              maxLength={80}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{title.length}/80</p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium capitalize text-slate-500 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your announcement here..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{message.length}/500</p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Preview */}
          {(title || message) && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <p className="text-xs font-medium capitalize text-slate-400 mb-2 flex items-center gap-1.5">
                <Megaphone className="w-3 h-3" /> Preview
              </p>
              <p className="text-sm font-semibold text-slate-800">{title || 'Untitled'}</p>
              <p className="text-xs text-slate-500 mt-1">{message || '—'}</p>
            </div>
          )}

          {/* Send button */}
          <button
            id="admin-send-notification-btn"
            onClick={handleSend}
            disabled={loading || !title.trim() || !message.trim()}
            className="w-full py-3 bg-brand hover:bg-brand-strong disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm  cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Sending…' : 'Send Notification'}
          </button>
        </div>
      )}
    </div>
  );
}
