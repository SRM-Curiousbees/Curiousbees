'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Link2, 
  Check, 
  Mail, 
  Share2,
  ExternalLink
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ShareThread {
  id: string;
  content: string;
  title?: string;
  rawType?: string;
  author?: {
    name: string | null;
    role?: string;
    department?: string | null;
  };
  tags?: string[];
  _count?: {
    shares?: number;
    likes?: number;
    comments?: number;
  };
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: ShareThread;
  onShareSuccess?: (platform: string) => void;
}

// ─── Platform Definitions ─────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: 'COPY_LINK',
    label: 'Copy Link',
    color: '#64748b',
    bgHover: 'hover:bg-slate-100',
    icon: (
      <Link2 className="w-5 h-5" />
    ),
  },
  {
    id: 'WHATSAPP',
    label: 'WhatsApp',
    color: '#25D366',
    bgHover: 'hover:bg-green-50',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#25D366">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    id: 'LINKEDIN',
    label: 'LinkedIn',
    color: '#0077B5',
    bgHover: 'hover:bg-blue-50',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0077B5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: 'X',
    label: 'X (Twitter)',
    color: '#000000',
    bgHover: 'hover:bg-slate-100',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#000000">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 5.858 5.45-5.858zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    id: 'FACEBOOK',
    label: 'Facebook',
    color: '#1877F2',
    bgHover: 'hover:bg-blue-50',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: 'THREADS',
    label: 'Threads',
    color: '#101010',
    bgHover: 'hover:bg-slate-100',
    icon: (
      <svg viewBox="0 0 192 192" className="w-5 h-5" fill="#101010">
        <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.101 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.204 17.11 97.013 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.202.195 97.07 0h-.113C68.882.194 47.292 9.642 32.788 28.08 19.882 44.485 13.224 67.315 13.001 95.932L13 96v.067c.224 28.617 6.882 51.447 19.788 67.854C47.292 182.358 68.882 191.806 96.957 192h.113c24.96-.173 42.554-6.708 57.048-21.189 18.963-18.945 18.392-42.692 12.142-57.27-4.484-10.454-13.033-18.945-24.723-24.553zM98.44 129.507c-10.44.588-21.286-4.098-21.82-14.135-.397-7.442 5.296-15.746 22.461-16.735 1.966-.113 3.895-.169 5.79-.169 6.235 0 12.068.606 17.371 1.765-1.978 24.702-13.58 28.713-23.802 29.274z"/>
      </svg>
    ),
  },
  {
    id: 'TELEGRAM',
    label: 'Telegram',
    color: '#229ED9',
    bgHover: 'hover:bg-sky-50',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#229ED9">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
  },
  {
    id: 'REDDIT',
    label: 'Reddit',
    color: '#FF4500',
    bgHover: 'hover:bg-orange-50',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FF4500">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
      </svg>
    ),
  },
  {
    id: 'EMAIL',
    label: 'Email',
    color: '#6366f1',
    bgHover: 'hover:bg-indigo-50',
    icon: (
      <Mail className="w-5 h-5 text-indigo-500" />
    ),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPostUrl(postId: string): string {
  if (typeof window === 'undefined') return `https://curiousbees.in/feed/post/${postId}`;
  const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  return `${base}/feed/post/${postId}`;
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

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n).trimEnd() + '…' : str;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShareModal({ isOpen, onClose, thread, onShareSuccess }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const postUrl = getPostUrl(thread.id);
  const postTitle = thread.title || truncate(thread.content, 100);
  const postExcerpt = truncate(thread.content, 200);
  const hashtags = thread.tags?.slice(0, 3).join(',') || 'Research,CuriousBees';
  const shareText = `Research shared on CuriousBees\n\n${postTitle}\n\nRead more:\n${postUrl}`;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Track share analytics
  const trackShare = useCallback(async (platform: string) => {
    try {
      await apiFetch(`/api/threads/${thread.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      onShareSuccess?.(platform);
    } catch {
      // Silent fail for analytics
    }
  }, [thread.id, onShareSuccess]);

  const handlePlatform = async (platformId: string) => {
    if (platformId === 'COPY_LINK') {
      try {
        await navigator.clipboard.writeText(postUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        await trackShare('COPY_LINK');
      } catch {
        // Fallback: prompt
        prompt('Copy this link:', postUrl);
      }
      return;
    }

    if (platformId === 'THREADS') {
      // Threads has no direct web-share URL — use Web Share API or copy link
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: postTitle, text: shareText, url: postUrl });
          await trackShare('THREADS');
        } catch { /* cancelled */ }
      } else {
        await navigator.clipboard.writeText(postUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        alert('Link copied! Paste it into Threads to share.');
        await trackShare('THREADS');
      }
      return;
    }

    if (platformId === 'EMAIL') {
      const subject = encodeURIComponent('Research shared via CuriousBees');
      const body = encodeURIComponent(`Check out this research post:\n${postUrl}`);
      window.open(`mailto:?subject=${subject}&body=${body}`);
      await trackShare('EMAIL');
      onClose();
      return;
    }

    const urls: Record<string, string> = {
      WHATSAPP: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      LINKEDIN: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`,
      X: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Research Update from CuriousBees\n\nRead here:\n${postUrl}`)}&hashtags=${encodeURIComponent(hashtags)}`,
      FACEBOOK: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`,
      TELEGRAM: `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(postTitle)}`,
      REDDIT: `https://www.reddit.com/submit?url=${encodeURIComponent(postUrl)}&title=${encodeURIComponent(postTitle)}`,
    };

    if (urls[platformId]) {
      window.open(urls[platformId], '_blank', 'noopener,noreferrer,width=600,height=500');
      await trackShare(platformId);
      onClose();
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    setIsSharing(true);
    try {
      await navigator.share({ title: postTitle, text: shareText, url: postUrl });
      await trackShare('NATIVE');
    } catch { /* cancelled */ }
    setIsSharing(false);
  };

  const isMobileWithShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const initials = thread.author?.name
    ? thread.author.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'CB';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50"
          />

          {/* Modal Wrapper for robust positioning */}
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center pointer-events-none sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              className="w-full sm:w-[480px] rounded-t-3xl sm:rounded-3xl bg-surface border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto"
            >
            {/* Drag handle on mobile */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-brand" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">Share Post</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Area */}
            <div className="overflow-y-auto overflow-x-hidden flex-1 pb-safe">
              {/* Post Preview */}
            <div className="mx-5 mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-2xs font-semibold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {thread.author?.name || 'CuriousBees Scholar'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-2xs font-semibold uppercase tracking-wide bg-brand/10 text-brand px-1.5 py-0.5 rounded-full">
                      {getTypeLabel(thread.rawType)}
                    </span>
                    {thread.author?.department && (
                      <span className="text-2xs text-slate-400 font-semibold truncate">
                        {thread.author.department}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
                {postExcerpt}
              </p>
              {thread.tags && thread.tags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {thread.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-2xs text-brand font-bold">#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Native Share button — mobile only */}
            {isMobileWithShare && (
              <div className="px-5 mt-4">
                <button
                  onClick={handleNativeShare}
                  disabled={isSharing}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand to-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer theme-static"
                >
                  <Share2 className="w-4 h-4" />
                  {isSharing ? 'Opening…' : 'Share via…'}
                </button>
              </div>
            )}

            {/* Platform Grid */}
            <div className="px-5 mt-4 pb-6">
              <p className="text-xs font-medium capitalize text-slate-400 mb-3">
                {isMobileWithShare ? 'Or share to' : 'Share to'}
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {PLATFORMS.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatform(platform.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-slate-200/60 ${platform.bgHover} transition-all active:scale-95 cursor-pointer group`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-surface shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {platform.id === 'COPY_LINK' && copied ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : (
                        platform.icon
                      )}
                    </div>
                    <span className="text-2xs font-bold text-slate-600 text-center leading-tight">
                      {platform.id === 'COPY_LINK' && copied ? 'Copied!' : platform.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Post URL pill */}
            <div className="mx-5 mb-5 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shrink-0">
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <p className="text-2xs text-slate-500 font-semibold truncate flex-1">{postUrl}</p>
              <button
                onClick={() => handlePlatform('COPY_LINK')}
                className="text-2xs font-semibold text-brand hover:underline shrink-0 cursor-pointer"
              >
                {copied ? '✅ Copied' : 'Copy'}
              </button>
            </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
