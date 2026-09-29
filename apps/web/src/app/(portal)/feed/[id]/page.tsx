'use client';

import { useState, use, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCommentSchema } from '@curiousbees/shared-utils';
import { 
  ArrowLeft, 
  MessageSquare, 
  Calendar, 
  Send, 
  GraduationCap, 
  UserSquare, 
  FileText,
  Paperclip,
  Loader2
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { DashboardShell } from '@/components/shared/dashboard-shell';

interface ThreadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ScholarThreadDetailPage({ params }: ThreadDetailPageProps) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  
  const router = useRouter();
  const { threads, addComment, currentUser } = useStore();
  const storeThread = threads.find((t) => t.id === id);
  const [localThread, setLocalThread] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!storeThread);

  useEffect(() => {
    if (!storeThread) {
      setIsLoading(true);
      apiFetch(`/api/threads/${id}`)
        .then(res => {
          if (!res.ok) throw new Error('Not found');
          return res.json();
        })
        .then(data => {
          if (data && data.id) {
            setLocalThread(data);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [id, storeThread]);

  const thread = storeThread || localThread;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(CreateCommentSchema),
    defaultValues: {
      content: '',
      threadId: id
    }
  });

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      </DashboardShell>
    );
  }

  if (!thread) {
    return (
      <div className="cb-card p-12 text-center bg-surface/90 backdrop-blur-md max-w-xl mx-auto my-12 text-left">
        <h4 className="text-slate-900 font-bold text-sm text-center">Proposal Not Found</h4>
        <p className="text-slate-500 text-xs max-w-sm mx-auto mt-2 text-center">
          This thread identifier does not match any portal discussion nodes.
        </p>
        <div className="text-center mt-5">
          <Link 
            href="/feed"
            className="inline-block text-xs font-medium capitalize text-primary border border-primary/20 hover:border-primary/40 bg-primary/5 px-4 py-2 rounded-lg transition-all cursor-pointer active:scale-95"
          >
            Return to Feed
          </Link>
        </div>
      </div>
    );
  }

  const handleCommentSubmit = async (data: any) => {
    try {
      const newComment = await addComment(thread.id, data.content);
      if (localThread) {
        setLocalThread((prev: any) => ({
          ...prev,
          comments: [...(prev.comments || []), newComment]
        }));
      }
      reset(); // Clear input
    } catch (e: any) {
      alert(`Error submitting comment: ${e.message}`);
    }
  };

  const formatDate = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getRoleBadge = (role: string) => {
    return role === 'RESEARCH_SUPERVISOR' 
      ? 'bg-red-700/5 text-red-700 border-red-700/15'
      : 'bg-brand-800/5 text-brand-800 border-brand-800/15';
  };

  return (
    <DashboardShell>
      {/* 1. Navigation Header Row */}
      <div className="flex justify-between items-center text-left">
        <Link 
          href="/feed" 
          className="inline-flex items-center space-x-1.5 text-xs font-medium capitalize text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Back to Feed</span>
        </Link>

        <span className="text-xs text-slate-400 font-medium capitalize bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
          NODE ID: {thread.id.substring(0, 8)}
        </span>
      </div>

      {/* 2. Main Full Thread Article Card */}
      <motion.article 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="cb-card p-6 sm:p-8 space-y-6 bg-surface/90 backdrop-blur-md text-left"
      >
        {/* Author Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-[42px] h-[42px] rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center font-display font-bold text-primary text-sm shrink-0">
              {thread.author?.name ? thread.author.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'RC'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold text-slate-900 leading-none">
                  {thread.author?.name}
                </h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold uppercase border leading-none ${getRoleBadge(thread.author?.role || '')}`}>
                  {thread.author?.role === 'RESEARCH_SUPERVISOR' ? (
                    <>
                      <GraduationCap className="w-2.5 h-2.5 mr-0.5" />
                      Faculty
                    </>
                  ) : (
                    <>
                      <UserSquare className="w-2.5 h-2.5 mr-0.5" />
                      Scholar
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium capitalize mt-1.5 leading-none">
                {thread.author?.department || 'SRM Institute'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <p className="text-xs text-slate-400 font-medium capitalize flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Published {formatDate(thread.createdAt)}</span>
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-4">
          <h1 className="text-sm font-bold text-slate-900 leading-snug">
            {thread.title}
          </h1>
          <div className="text-slate-655 text-xs leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 p-5 rounded-2xl border border-slate-100 font-medium">
            {thread.content}
          </div>
        </div>

        {/* Dynamic File Attachment Mock */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-400 capitalize block">📎 References & Citations ({thread.tags.length > 2 ? 2 : 1})</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="text-2xs font-bold text-slate-700 truncate">dst-serb-proposal-draft.pdf</span>
              </div>
              <span className="text-2xs font-bold uppercase text-slate-400 shrink-0">3.4 MB</span>
            </div>
            {thread.tags.length > 2 && (
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2 truncate">
                  <Paperclip className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-2xs font-bold text-slate-700 truncate">gpgpu-docker-cluster-ssh.sh</span>
                </div>
                <span className="text-2xs font-bold uppercase text-slate-400 shrink-0">12 KB</span>
              </div>
            )}
          </div>
        </div>

        {/* Tags footer section */}
        <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-100">
          {thread.tags.map((tag: string) => (
            <span 
              key={tag}
              className="bg-brand-800/5 border border-brand-800/10 text-primary text-xs font-medium capitalize px-2.5 py-0.5 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      </motion.article>

      {/* 3. Comments conversation tree Section */}
      <section className="space-y-4 text-left">
        <h3 className="text-xs font-medium capitalize text-brand-800 flex items-center space-x-2 border-b border-slate-100 pb-2 font-display">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span>Discussion Thread ({thread.comments?.length || 0})</span>
        </h3>

        {/* Dynamic recursive comments map */}
        <div className="space-y-3">
          {thread.comments?.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
              <p className="text-xs italic text-slate-400 font-semibold">No comments shared on this thread yet. Be the first to start the conversation!</p>
            </div>
          ) : (
            thread.comments?.map((comment: any) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={comment.id}
                className="p-4 bg-surface/90 backdrop-blur-md border border-slate-200/60 rounded-2xl flex items-start space-x-3.5 shadow-sm text-left"
              >
                <div className="w-[34px] h-[34px] rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center font-display font-bold text-primary text-xs shrink-0">
                  {comment.author?.name ? comment.author.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'RC'}
                </div>
                
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-800">{comment.author?.name}</span>
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-2xs font-bold uppercase border leading-none ${getRoleBadge(comment.author?.role || '')}`}>
                        {comment.author?.role === 'RESEARCH_SUPERVISOR' || comment.author?.role === 'SUPERVISOR' ? 'Research Supervisor' : 'Research Scholar'}
                      </span>
                    </div>
                    <span className="text-2xs text-slate-400 font-bold uppercase">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  
                  <p className="text-slate-655 text-xs leading-relaxed font-sans font-medium">
                    {comment.content}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* 4. Add Comment Form card */}
        <div className="cb-card p-5 bg-surface/90 backdrop-blur-md text-left">
          <form onSubmit={handleSubmit(handleCommentSubmit)} className="space-y-4">
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-medium text-slate-400 capitalize">Adding response as <span className="text-primary">{currentUser?.name}</span></span>
            </div>

            <div className="relative">
              <textarea
                rows={3}
                {...register('content')}
                placeholder="Type your comment, resource sharing request, or peer inquiry..."
                className="w-full pl-4 pr-12 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-xs leading-relaxed font-sans font-medium transition-all"
              />
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="absolute right-3 bottom-3.5 p-2 rounded-lg bg-primary hover:bg-primary/95 text-white active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="w-3.5 h-3.5 border-2 border-surface border-t-transparent animate-spin rounded-full block" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            {errors.content && <p className="text-2xs text-red-555 font-semibold">{errors.content.message as string}</p>}
          </form>
        </div>

      </section>
    </DashboardShell>
  );
}
