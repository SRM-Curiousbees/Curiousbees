'use client';

/**
 * Posts & Discussions Governance Console
 */

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  MessageSquare,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  AlertTriangle,
  Heart,
  MessageCircle,
  Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminPostsPage() {
  const { fetchAdminPosts, hideAdminPost, restoreAdminPost, deleteAdminPost } = useStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hiddenFilter, setHiddenFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [actionModal, setActionModal] = useState<{
    type: 'HIDE' | 'RESTORE' | 'DELETE';
    post: any;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminPosts({
        search,
        hidden: hiddenFilter === 'ALL' ? undefined : hiddenFilter,
        page,
        limit: 20,
      });
      setPosts(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [hiddenFilter, page]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal || !reason.trim()) return;

    setSubmitting(true);
    try {
      if (actionModal.type === 'HIDE') {
        await hideAdminPost(actionModal.post.id, reason);
      } else if (actionModal.type === 'RESTORE') {
        await restoreAdminPost(actionModal.post.id, reason);
      } else if (actionModal.type === 'DELETE') {
        await deleteAdminPost(actionModal.post.id, reason);
      }
      setActionModal(null);
      setReason('');
      await loadPosts();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 select-none">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-blue-50 text-blue-700 border border-blue-200">
            Content Governance
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
          Posts & Discussions Governance
        </h1>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">
          Inspect, hide, restore, or moderate research feed posts and discussions across the institution.
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            loadPosts();
          }}
          className="relative w-full md:w-80"
        >
          <input
            type="text"
            placeholder="Search posts or authors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <select
          value={hiddenFilter}
          onChange={(e) => {
            setHiddenFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
        >
          <option value="ALL">All Visibility</option>
          <option value="false">Active Posts Only</option>
          <option value="true">Hidden / Moderated Only</option>
        </select>
      </div>

      {/* Posts Table */}
      <div className="bg-surface border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <p className="text-xs font-bold">Querying posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No posts found</h3>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-medium capitalize text-slate-500">
                  <th className="py-3 px-4">Post Title & Content</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Engagement</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 max-w-sm">
                      <p className="font-bold text-slate-900 truncate">{post.title}</p>
                      <p className="text-2xs text-slate-500 line-clamp-1 mt-0.5">{post.content}</p>
                      {post.moderationReason && (
                        <p className="text-2xs text-rose-500 font-bold mt-1">
                          Moderated: {post.moderationReason}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{post.author?.name || 'Unknown'}</p>
                      <p className="text-2xs text-slate-400">{post.author?.department || 'SRMIST'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 text-slate-500">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          {post._count?.likes ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                          {post._count?.comments ?? 0}
                        </span>
                        {post._count?.reports > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 font-bold">
                            <Flag className="w-3.5 h-3.5" />
                            {post._count.reports}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium capitalize border',
                          post.hidden
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        )}
                      >
                        {post.hidden ? 'Hidden' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-2xs">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {post.hidden ? (
                          <button
                            onClick={() => {
                              setActionModal({ type: 'RESTORE', post });
                              setReason('');
                            }}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Restore Post to Feed"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setActionModal({ type: 'HIDE', post });
                              setReason('');
                            }}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Hide Post (Policy Violation)"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setActionModal({ type: 'DELETE', post });
                            setReason('');
                          }}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Permanently Remove Post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Moderation Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-slate-200/80 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <h3 className="text-base font-semibold">
                {actionModal.type === 'HIDE' && 'Hide Post from Feed'}
                {actionModal.type === 'RESTORE' && 'Restore Post to Feed'}
                {actionModal.type === 'DELETE' && 'Permanently Delete Post'}
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Target Post: <strong className="text-slate-900">"{actionModal.post.title}"</strong>
            </p>

            <form onSubmit={handleAction} className="space-y-3">
              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">
                  Mandatory Audit Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the institutional moderation reason..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand hover:bg-brand-strong text-white transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Confirm Moderation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
