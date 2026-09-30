'use client';

import * as React from 'react';

/**
 * Writes the element's scroll progress (0 → 1) to the CSS variable `--p` on that
 * element, once per animation frame, without re-rendering React. CSS derives the
 * visual state from `--p`, so the effect stays on the compositor-friendly path.
 *
 * Progress is 0 when the element's top reaches `start` (fraction of viewport height
 * from the top) and 1 when its bottom reaches `end`.
 */
export function useScrollProgress<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  { start = 0.85, end = 0.45 }: { start?: number; end?: number } = {},
) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let visible = false;

    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const from = vh * start - rect.top;
      const total = rect.height + vh * (start - end);
      const p = Math.min(1, Math.max(0, total > 0 ? from / total : 1));
      el.style.setProperty('--p', p.toFixed(4));
    };
    const onScroll = () => {
      if (visible && !frame) frame = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) update();
    });
    io.observe(el);
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, start, end]);
}
