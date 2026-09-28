import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  GraduationCap, 
  UserSquare, 
  Calendar,
  Tag,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getPublicThread(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/threads/public/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTypeLabel(rawType?: string): string {
  const map: Record<string, string> = {
    RESEARCH_UPDATE: 'Research Update',
    PUBLICATION: 'Publication',
    QUESTION: 'Question',
    COLLABORATION_REQUEST: 'Collaboration Request',
    ACHIEVEMENT: 'Achievement',
    ANNOUNCEMENT: 'Announcement',
  };
  return rawType ? (map[rawType] || rawType) : 'Research Post';
}

function getInitials(name?: string | null) {
  if (!name) return 'CB';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const thread = await getPublicThread(id);

  if (!thread) {
    return {
      title: 'Post Not Found | CuriousBees',
      description: 'This research post is no longer available.',
    };
  }

  const description = thread.content?.slice(0, 160) || 'Research shared on CuriousBees';
  const title = `${thread.author?.name || 'Scholar'} on CuriousBees — ${getTypeLabel(thread.type)}`;
  const postUrl = `https://curiousbees.in/feed/post/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: postUrl,
      siteName: 'CuriousBees Research',
      type: 'article',
      authors: [thread.author?.name || 'CuriousBees Scholar'],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      site: '@CuriousBees',
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await getPublicThread(id);

  if (!thread) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-2">Post Not Available</h1>
          <p className="text-sm text-slate-500 font-medium mb-8">
            This post may have been removed or is no longer publicly accessible.
          </p>
          <Link
            href="https://curiousbees.in"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0C4DA2] hover:bg-[#042654] text-white text-sm font-black rounded-full transition-colors"
          >
            Explore CuriousBees
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const initials = getInitials(thread.author?.name);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      {/* Header Nav */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="https://curiousbees.in" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0C4DA2] flex items-center justify-center">
              <span className="text-white text-[10px] font-black">CB</span>
            </div>
            <span className="text-sm font-black text-slate-900">CuriousBees</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide hidden sm:block">Research Portal</span>
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-1.5 bg-[#0C4DA2] hover:bg-[#042654] text-white text-xs font-black rounded-full transition-colors"
          >
            Join Free
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Post Card */}
        <article className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">

          {/* Author Section */}
          <div className="p-6 sm:p-8 border-b border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {thread.author?.image ? (
                  <img
                    src={thread.author.image}
                    alt={thread.author.name || ''}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#0C4DA2] flex items-center justify-center text-white font-black text-sm shrink-0">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-black text-slate-900">{thread.author?.name || 'CuriousBees Scholar'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {thread.author?.role === 'RESEARCH_SUPERVISOR' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-[#ba1a1a] bg-[#ba1a1a]/5 border border-[#ba1a1a]/15 px-2 py-0.5 rounded-full">
                        <GraduationCap className="w-2.5 h-2.5" /> Faculty
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-[#0C4DA2] bg-[#0C4DA2]/5 border border-[#0C4DA2]/15 px-2 py-0.5 rounded-full">
                        <UserSquare className="w-2.5 h-2.5" /> Scholar
                      </span>
                    )}
                    {thread.author?.department && (
                      <span className="text-[10px] text-slate-400 font-semibold">{thread.author.department}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-[9px] font-black uppercase tracking-wide bg-[#0C4DA2]/8 text-[#0C4DA2] border border-[#0C4DA2]/15 px-2.5 py-1 rounded-full">
                  {getTypeLabel(thread.type)}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                  <Calendar className="w-3 h-3" />
                  {formatDate(thread.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {thread.title && (
              <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-snug mb-4">
                {thread.title}
              </h1>
            )}
            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {thread.content}
            </div>

            {/* Tags */}
            {thread.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-slate-100">
                {thread.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[10px] font-black text-[#0C4DA2] bg-[#0C4DA2]/5 border border-[#0C4DA2]/10 px-2.5 py-1 rounded-full"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-5 mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 font-bold">
              <span className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                {thread._count?.likes || 0} Likes
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#0C4DA2]" />
                {thread._count?.comments || 0} Comments
              </span>
              <span className="flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                {thread._count?.shares || 0} Shares
              </span>
            </div>
          </div>
        </article>

        {/* Comments Preview */}
        {thread.comments?.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              Discussion ({thread.comments.length})
            </h2>
            <div className="space-y-3">
              {thread.comments.slice(0, 3).map((comment: any) => (
                <div key={comment.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0C4DA2]/10 flex items-center justify-center text-[#0C4DA2] text-[10px] font-black shrink-0">
                    {getInitials(comment.author?.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800">{comment.author?.name || 'Scholar'}</p>
                    <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))}
              {thread.comments.length > 3 && (
                <p className="text-xs text-slate-400 font-semibold text-center">
                  + {thread.comments.length - 3} more comments
                </p>
              )}
            </div>
          </section>
        )}

        {/* CTA to join */}
        <div className="mt-8 bg-gradient-to-br from-[#0C4DA2] to-[#1a63c8] rounded-3xl p-8 text-center text-white shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🐝</span>
          </div>
          <h2 className="text-lg font-black mb-2">Join the Research Community</h2>
          <p className="text-sm text-white/80 font-medium max-w-sm mx-auto mb-6">
            Connect with researchers, share discoveries, and collaborate on groundbreaking work at CuriousBees.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="px-6 py-3 bg-white text-[#0C4DA2] text-sm font-black rounded-full hover:bg-slate-50 transition-colors"
            >
              Sign Up Free
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 bg-white/10 border border-white/20 text-white text-sm font-black rounded-full hover:bg-white/20 transition-colors"
            >
              Sign In to Reply
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-[10px] text-slate-400 font-semibold">
          <Link href="/privacy-policy" className="hover:text-slate-600 ml-1">Privacy</Link>
        </footer>
      </main>
    </div>
  );
}
