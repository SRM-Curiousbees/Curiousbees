'use client';

import React, { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'curiousbees-dismissed-announcements';

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * The newest institution announcement the person hasn't dismissed. Dismissals are
 * remembered in this browser only.
 */
export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch('/api/announcements')
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (!active || !Array.isArray(list)) return;
        const dismissed = readDismissed();
        setAnnouncement(list.find((a) => !dismissed.includes(a.id)) || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!announcement) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...readDismissed(), announcement.id].slice(-50)));
    } catch {
      /* private mode: dismiss for this visit only */
    }
    setAnnouncement(null);
  };

  const posted = new Date(announcement.createdAt);

  return (
    <>
      <section aria-label="Announcement" className="mb-6 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
        <Megaphone className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium text-brand-900">{announcement.title}</p>
          <p className="mt-0.5 line-clamp-2 text-brand-800">{announcement.content}</p>
          <button type="button" onClick={() => setOpen(true)} className="mt-1 font-medium text-brand-700 underline-offset-2 hover:underline">
            Read announcement
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="-mr-1.5 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-brand-700 transition-colors hover:bg-brand-100"
        >
          <X className="size-4" aria-hidden />
        </button>
      </section>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={announcement.title}
        description={`${announcement.author?.name ? `${announcement.author.name} · ` : ''}${
          isNaN(posted.getTime()) ? '' : posted.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        }`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                dismiss();
              }}
            >
              Don’t show again
            </Button>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </>
        }
      >
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink-secondary">{announcement.content}</p>
      </Dialog>
    </>
  );
}
