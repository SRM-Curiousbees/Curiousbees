'use client';

import { PenSquare } from 'lucide-react';

/** Desktop shortcut back to the composer once the reader has scrolled into the feed. */
export default function FeedFAB({ onWrite }: { onWrite?: () => void }) {
  return (
    <button
      type="button"
      onClick={onWrite}
      className="fixed bottom-6 right-6 z-sticky hidden h-11 items-center gap-2 rounded-full bg-brand pl-4 pr-5 text-sm font-medium text-white shadow-lg transition-[background-color,transform] duration-fast hover:bg-brand-strong active:translate-y-px md:inline-flex"
    >
      <PenSquare className="size-[18px]" aria-hidden />
      Write a post
    </button>
  );
}
