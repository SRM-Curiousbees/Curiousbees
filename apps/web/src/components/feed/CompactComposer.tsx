'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Paperclip, 
  Image as ImageIcon, 
  BookOpen, 
  Briefcase, 
  Hash, 
  Send, 
  X, 
  Sparkles, 
  Check, 
  Loader2,
  GraduationCap,
  MessageSquare,
  Award,
  Megaphone,
  HelpCircle,
  FileText,
  Users,
  BarChart3,
  AtSign,
  Globe,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { supabase, getStoragePublicUrl } from '@/lib/supabase';
import { getProfileImageUrl } from '@/lib/avatar';
import { Button } from '@/components/ui/button';

// Types accepted by the threads API (CreateThreadSchema).
const POST_TYPES = [
  { id: 'RESEARCH_UPDATE', label: 'Research update', icon: MessageSquare },
  { id: 'PUBLICATION', label: 'Publication', icon: BookOpen },
  { id: 'QUESTION', label: 'Research question', icon: HelpCircle },
  { id: 'COLLABORATION_REQUEST', label: 'Collaboration request', icon: Users },
  { id: 'ACHIEVEMENT', label: 'Achievement', icon: Award },
  { id: 'ANNOUNCEMENT', label: 'Announcement', icon: Megaphone },
];

interface CompactComposerProps {
  onPostCreated?: () => void;
}

export default function CompactComposer({ onPostCreated }: CompactComposerProps) {
  const { currentUser, createThread, addToast } = useStore();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('RESEARCH_UPDATE');
  const [tagsInput, setTagsInput] = useState('');
  const [isPaper, setIsPaper] = useState(false);
  const [journal, setJournal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; size: string; url: string; type: string } | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  const avatarUrl = getProfileImageUrl(currentUser);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(textareaRef.current.scrollHeight, 52) + 'px';
    }
  }, [content]);

  // Close type menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setShowTypeMenu(false);
      }
    };
    if (showTypeMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTypeMenu]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      addToast('File size must be less than 10MB', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `post-attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const publicUrl = getStoragePublicUrl('avatars', filePath);
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      
      setAttachment({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        url: publicUrl,
        type: isPdf ? 'pdf' : 'image'
      });

      if (isPdf) {
        setIsPaper(true);
      }
      addToast('Attachment uploaded successfully', 'success');
    } catch (err: any) {
      addToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      addToast('Please write something to share', 'error');
      return;
    }

    if (content.trim().length < 10) {
      addToast('Your post must be at least 10 characters', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(/[,#\s]+/)
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      // Also extract inline hashtags from content
      const inlineTags = content.match(/#\w+/g)?.map(t => t.replace('#', '')) || [];
      const allTags = Array.from(new Set([...parsedTags, ...inlineTags]));
      if (allTags.length === 0) allTags.push('Research');

      const contentText = content.replace(/#\w+/g, '').trim();
      const firstLine = contentText.split('\n')[0];
      const postTitle = firstLine.length > 55 
        ? firstLine.substring(0, 55) + '...' 
        : (firstLine.length >= 5 ? firstLine : 'Research Update');

      await createThread(postTitle, content, allTags, {
        type: postType,
        isPaper: isPaper || postType === 'PUBLICATION',
        paperJournal: journal || null,
        attachments: attachment ? [attachment] : []
      });

      setContent('');
      setTagsInput('');
      setJournal('');
      setAttachment(null);
      setIsPaper(false);
      setIsFocused(false);
      setPostType('RESEARCH_UPDATE');
      addToast('Research update published!', 'success');
      onPostCreated?.();
    } catch (err: any) {
      addToast(`Failed to publish: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    setContent(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '#' : ' #'));
    textareaRef.current?.focus();
  };

  const activeType = POST_TYPES.find(t => t.id === postType) || POST_TYPES[0];
  const charCount = content.length;
  const charLimit = 2500;
  const isOverLimit = charCount > charLimit;
  const canPost = content.trim().length >= 10 && !isOverLimit && !isSubmitting;

  // Filter post types based on role
  const availableTypes = POST_TYPES.filter(type => {
    if (type.id === 'ANNOUNCEMENT' && currentUser?.role !== 'RESEARCH_SUPERVISOR' && currentUser?.role !== 'INSTITUTE_ADMIN') return false;
    if (type.id === 'QUESTION' && currentUser?.role === 'RESEARCH_SUPERVISOR') return false;
    return true;
  });

  return (
    <>
      {/* Hidden file inputs */}
      <input 
        ref={fileInputRef}
        type="file" 
        className="hidden" 
        accept=".pdf,.doc,.docx"
        onChange={handleFileUpload} 
      />
      <input 
        ref={photoInputRef}
        type="file" 
        className="hidden" 
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileUpload} 
      />

      <section aria-label="Share with your research network" className="rounded-2xl border border-line bg-surface shadow-xs transition-shadow duration-base focus-within:border-line-strong focus-within:shadow-md">
        <div className="flex gap-3 p-4 pb-0">
          <img src={avatarUrl} alt="" className="mt-0.5 size-10 shrink-0 rounded-full bg-neutral-100 object-cover ring-1 ring-line" />

          <div className="min-w-0 flex-1">
            <label htmlFor="feed-composer" className="sr-only">Share an update, paper or question</label>
            <textarea
              id="feed-composer"
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder="Share an update, a paper or a question…"
              className="min-h-[52px] w-full resize-none border-none bg-transparent py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-muted focus:outline-none"
              rows={isFocused ? 3 : 1}
            />

            <AnimatePresence>
              {isFocused && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mb-3">
                  <div className="relative inline-block" ref={typeMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowTypeMenu(!showTypeMenu)}
                      aria-haspopup="listbox"
                      aria-expanded={showTypeMenu}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
                    >
                      <activeType.icon className="size-4 text-ink-muted" aria-hidden />
                      {activeType.label}
                      <ChevronDown className={`size-4 text-ink-muted transition-transform ${showTypeMenu ? 'rotate-180' : ''}`} aria-hidden />
                    </button>

                    <AnimatePresence>
                      {showTypeMenu && (
                        <motion.ul
                          role="listbox"
                          aria-label="Post type"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute left-0 top-full z-dropdown mt-1 w-56 rounded-xl border border-line bg-surface p-1 shadow-xl"
                        >
                          {availableTypes.map((type) => (
                            <li key={type.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={postType === type.id}
                                onClick={() => {
                                  setPostType(type.id);
                                  setIsPaper(type.id === 'PUBLICATION');
                                  setShowTypeMenu(false);
                                }}
                                className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors ${
                                  postType === type.id ? 'bg-brand-50 font-medium text-brand-800' : 'text-ink-secondary hover:bg-neutral-100 hover:text-ink'
                                }`}
                              >
                                <type.icon className="size-4 shrink-0" aria-hidden />
                                {type.label}
                                {postType === type.id && <Check className="ml-auto size-4" aria-hidden />}
                              </button>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {attachment && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-surface-muted px-3 py-2">
                <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden />
                <span className="flex-1 truncate text-sm font-medium text-ink">{attachment.name}</span>
                <span className="shrink-0 text-xs text-ink-muted">{attachment.size}</span>
                <button
                  type="button"
                  onClick={() => { setAttachment(null); setIsPaper(false); }}
                  aria-label="Remove attachment"
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-danger-50 hover:text-danger-700"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}

            <AnimatePresence>
              {isFocused && (postType === 'PUBLICATION' || isPaper) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3">
                  <label htmlFor="feed-composer-journal" className="mb-1 block text-xs font-medium text-ink-secondary">Journal or venue</label>
                  <input
                    id="feed-composer-journal"
                    type="text"
                    value={journal}
                    onChange={(e) => setJournal(e.target.value)}
                    placeholder="e.g. IEEE Transactions on Image Processing"
                    className="cb-input"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
          <div className="flex items-center gap-0.5">
            {[
              { label: 'Attach image', icon: ImageIcon, onClick: () => photoInputRef.current?.click(), disabled: isUploading },
              { label: 'Attach PDF or document', icon: FileText, onClick: () => fileInputRef.current?.click(), disabled: isUploading },
              { label: 'Mark as publication', icon: BookOpen, active: postType === 'PUBLICATION', onClick: () => { setPostType('PUBLICATION'); setIsPaper(true); setIsFocused(true); textareaRef.current?.focus(); } },
              { label: 'Add topic tag', icon: Hash, onClick: handleAddTag },
              { label: 'Collaboration request', icon: Users, active: postType === 'COLLABORATION_REQUEST', onClick: () => { setPostType('COLLABORATION_REQUEST'); setIsFocused(true); textareaRef.current?.focus(); } },
              { label: 'Achievement', icon: Award, active: postType === 'ACHIEVEMENT', onClick: () => { setPostType('ACHIEVEMENT'); setIsFocused(true); textareaRef.current?.focus(); } },
            ].map(({ label, icon: Icon, onClick, disabled, active }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                disabled={disabled}
                aria-label={label}
                aria-pressed={active}
                title={label}
                className={`flex size-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-neutral-100 hover:text-ink'
                }`}
              >
                <Icon className="size-[18px]" aria-hidden />
              </button>
            ))}
            {isUploading && <Loader2 className="ml-1 size-4 animate-spin text-ink-muted" aria-label="Uploading" />}
          </div>

          <div className="flex items-center gap-3">
            {charCount > 0 && (
              <span className={`text-xs tabular-nums ${isOverLimit ? 'text-danger-700' : charCount > 2200 ? 'text-warning-700' : 'text-ink-muted'}`}>
                {charCount}/{charLimit}
              </span>
            )}
            <Button size="sm" onClick={handleSubmit} disabled={!canPost} loading={isSubmitting}>
              Post
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
