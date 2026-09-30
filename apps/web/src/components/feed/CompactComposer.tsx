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
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { apiFetch, readApiError, API_URL } from '@/lib/api-client';
import { getProfileImageUrl, handleAvatarError } from '@/lib/avatar';
import { Button } from '@/components/ui/button';

// Comprehensive blacklist of dangerous and executable extensions
const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bin', 'msi', 'jar', 'com', 'scr', 'vbs', 'ps1', 'app', 'dmg', 'iso',
  'php', 'phtml', 'php3', 'php4', 'php5', 'phps', 'asp', 'aspx', 'jsp', 'jspx', 'cgi', 'pl', 'py', 'rb',
  'svg', 'html', 'htm', 'xhtml', 'shtml', 'xml', 'js', 'mjs', 'ts', 'wasm', 'swf', 'dll', 'so', 'dylib',
  'htaccess', 'config', 'env', 'pem', 'crt', 'key', 'lnk', 'inf', 'reg', 'chm', 'hta', 'cpl', 'tar', 'gz', '7z', 'rar',
]);

const ALLOWED_DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const ALLOWED_DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]);

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Performs client-side deep security inspection:
 * 1. Checks for null-bytes, control chars, dangerous names, double extensions.
 * 2. Checks file size (max 10MB).
 * 3. Inspects binary magic bytes to block executable headers and verify authentic file format.
 */
async function inspectAndValidateFile(
  file: File,
  category: 'image' | 'document',
): Promise<{ safeContentType: string; error?: string }> {
  // 1. Check size
  if (file.size <= 0) {
    return { safeContentType: '', error: 'File is empty (0 bytes).' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { safeContentType: '', error: 'File exceeds the maximum 10 MB limit for post attachments.' };
  }

  // 2. Check filename security
  const filename = file.name || '';
  if (/[\0\x00-\x1F\x7F]/.test(filename)) {
    return { safeContentType: '', error: 'Filename contains invalid or malicious characters.' };
  }

  const baseName = filename.split(/[\\/]/).pop() || '';
  const parts = baseName.toLowerCase().split('.');
  if (parts.length < 2) {
    return { safeContentType: '', error: 'File must have a valid extension (.pdf, .doc, .docx, .jpg, .png, .webp).' };
  }

  // Disallow any dangerous or executable extension anywhere in the filename
  for (let i = 1; i < parts.length; i++) {
    if (DANGEROUS_EXTENSIONS.has(parts[i])) {
      return { safeContentType: '', error: `Malicious or executable file pattern (".${parts[i]}") is strictly prohibited.` };
    }
  }

  // Disallow double / disguised extensions (e.g. thesis.docx.exe or data.pdf.sh)
  if (parts.length > 2) {
    const intermediate = parts.slice(1, -1);
    const knownExts = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp']);
    for (const seg of intermediate) {
      if (knownExts.has(seg) || DANGEROUS_EXTENSIONS.has(seg)) {
        return { safeContentType: '', error: 'Multiple or disguised file extensions are strictly prohibited.' };
      }
    }
  }

  const extension = parts[parts.length - 1];

  // 3. Category-specific whitelist check
  if (category === 'image') {
    if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
      return { safeContentType: '', error: `Only authentic image files (.jpg, .jpeg, .png, .webp) are permitted for images. Received: .${extension}` };
    }
    if (file.type && !ALLOWED_IMAGE_MIMES.has(file.type.toLowerCase())) {
      return { safeContentType: '', error: `Invalid image content type (${file.type}). Only JPEG, PNG, and WebP are allowed.` };
    }
  } else {
    if (!ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
      return { safeContentType: '', error: `Only authentic research documents (.pdf, .doc, .docx) are permitted for documents. Received: .${extension}` };
    }
    if (file.type && !ALLOWED_DOCUMENT_MIMES.has(file.type.toLowerCase())) {
      return { safeContentType: '', error: `Invalid document content type (${file.type}). Only PDF and Word documents are allowed.` };
    }
  }

  // 4. Magic bytes inspection (reading binary header)
  try {
    const buffer = await file.slice(0, 64).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Block Windows PE / DOS Executables (MZ: 0x4D 0x5A)
    if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) {
      return { safeContentType: '', error: 'Security Alert: Executable binary header (MZ) detected in file. Upload blocked.' };
    }
    // Block Linux ELF Executables (0x7F 0x45 0x4C 0x46)
    if (bytes.length >= 4 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
      return { safeContentType: '', error: 'Security Alert: Linux binary header (ELF) detected in file. Upload blocked.' };
    }
    // Block Java Class files (0xCA 0xFE 0xBA 0xBE)
    if (bytes.length >= 4 && bytes[0] === 0xca && bytes[1] === 0xfe && bytes[2] === 0xba && bytes[3] === 0xbe) {
      return { safeContentType: '', error: 'Security Alert: Java bytecode detected. Upload blocked.' };
    }
    // Block Mach-O binaries
    if (
      bytes.length >= 4 &&
      ((bytes[0] === 0xfe && bytes[1] === 0xed && bytes[2] === 0xfa && (bytes[3] === 0xce || bytes[3] === 0xcf)) ||
       (bytes[0] === 0xcf && bytes[1] === 0xfa && bytes[2] === 0xed && bytes[3] === 0xfe))
    ) {
      return { safeContentType: '', error: 'Security Alert: Mach-O executable header detected in file. Upload blocked.' };
    }
    // Block shell scripts (shebang #!)
    if (bytes.length >= 2 && bytes[0] === 0x23 && bytes[1] === 0x21) {
      return { safeContentType: '', error: 'Security Alert: Shell script shebang (#!) detected. Scripts cannot be uploaded.' };
    }

    // Verify format-specific signatures
    if (extension === 'pdf') {
      // %PDF = 0x25 0x50 0x44 0x46
      if (bytes.length < 4 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
        return { safeContentType: '', error: 'Security Alert: Corrupted or disguised PDF file. File header does not match %PDF signature.' };
      }
      return { safeContentType: 'application/pdf' };
    }

    if (extension === 'png') {
      if (bytes.length < 4 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
        return { safeContentType: '', error: 'Security Alert: Corrupted or disguised PNG file. File header does not match PNG signature.' };
      }
      return { safeContentType: 'image/png' };
    }

    if (extension === 'jpg' || extension === 'jpeg') {
      if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
        return { safeContentType: '', error: 'Security Alert: Corrupted or disguised JPEG file. File header does not match JPEG signature.' };
      }
      return { safeContentType: 'image/jpeg' };
    }

    if (extension === 'webp') {
      // RIFF = 0x52 0x49 0x46 0x46, WEBP = 0x57 0x45 0x42 0x50 at offset 8
      const isRiff = bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
      const isWebp = isRiff && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
      if (!isWebp) {
        return { safeContentType: '', error: 'Security Alert: Corrupted or disguised WebP file. File header does not match WebP signature.' };
      }
      return { safeContentType: 'image/webp' };
    }

    if (extension === 'docx') {
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
        return { safeContentType: '', error: 'Security Alert: Corrupted or disguised DOCX file. File header does not match PK zip signature.' };
      }
      return { safeContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    }

    if (extension === 'doc') {
      if (bytes[0] !== 0xd0 || bytes[1] !== 0xcf || bytes[2] !== 0x11 || bytes[3] !== 0xe0) {
        return { safeContentType: '', error: 'Security Alert: Corrupted or disguised DOC file. File header does not match Word document signature.' };
      }
      return { safeContentType: 'application/msword' };
    }
  } catch (err: any) {
    return { safeContentType: '', error: `Security check failed: ${err.message}` };
  }

  const fallbackMime =
    extension === 'pdf' ? 'application/pdf' :
    extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
    extension === 'doc' ? 'application/msword' :
    extension === 'png' ? 'image/png' :
    extension === 'webp' ? 'image/webp' :
    'image/jpeg';

  return { safeContentType: fallbackMime };
}

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: 'image' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Deep client-side security inspection & magic bytes verification
    const { safeContentType, error } = await inspectAndValidateFile(file, category);
    if (error) {
      addToast(error, 'error');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const presignedRes = await apiFetch('/api/threads/files/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: safeContentType, sizeBytes: file.size }),
      });
      if (!presignedRes.ok) {
        throw new Error((await readApiError(presignedRes)) || 'Failed to initiate upload');
      }
      const { uploadUrl, requiredHeaders, downloadPath } = await presignedRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: requiredHeaders || { 'Content-Type': safeContentType },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error(`Upload to storage failed (HTTP ${uploadRes.status})`);
      }

      const fileUrl = downloadPath.startsWith('http') ? downloadPath : `${API_URL}${downloadPath}`;
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isPdf = ext === 'pdf';
      const isDoc = ext === 'doc' || ext === 'docx';
      
      setAttachment({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        url: fileUrl,
        type: isPdf ? 'pdf' : isDoc ? 'doc' : 'image',
      });

      if (isPdf || isDoc) {
        setIsPaper(true);
      }
      addToast(`Verified & uploaded: ${file.name}`, 'success');
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
      {/* Hidden file inputs with strict type restrictions */}
      <input 
        ref={fileInputRef}
        type="file" 
        className="hidden" 
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => handleFileUpload(e, 'document')} 
      />
      <input 
        ref={photoInputRef}
        type="file" 
        className="hidden" 
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={(e) => handleFileUpload(e, 'image')} 
      />

      <section aria-label="Share with your research network" className="rounded-2xl border border-line bg-surface shadow-xs transition-shadow duration-base focus-within:border-line-strong focus-within:shadow-md">
        <div className="flex gap-3 p-4 pb-0">
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => handleAvatarError(e, currentUser?.name)}
            className="mt-0.5 size-10 shrink-0 rounded-full bg-neutral-100 object-cover ring-1 ring-line"
          />

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
              <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-line bg-surface-muted px-3.5 py-2.5">
                <FileText className="size-4 shrink-0 text-brand" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">{attachment.name}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      <ShieldCheck className="size-3 text-emerald-600" aria-hidden />
                      Verified Clean
                    </span>
                  </div>
                  <span className="text-xs text-ink-muted">
                    {attachment.size} · {attachment.type === 'pdf' ? 'PDF Document' : attachment.type === 'doc' ? 'Word Document' : 'Image'}
                  </span>
                </div>
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
              { label: 'Attach image (JPG, PNG, WebP · max 10MB)', icon: ImageIcon, onClick: () => photoInputRef.current?.click(), disabled: isUploading },
              { label: 'Attach paper or document (PDF, Word · max 10MB)', icon: FileText, onClick: () => fileInputRef.current?.click(), disabled: isUploading },
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
