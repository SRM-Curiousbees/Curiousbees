'use client';

import * as React from 'react';
import { useScrollProgress } from '@/components/motion/use-scroll-progress';
import { SceneLabel } from './SceneLabel';

const STATEMENT =
  'Doctoral research runs on many threads: supervisors and scholars, faculties and departments, reviews, milestones, papers and events. CuriousBees gathers them into one shared, institutional record.';

/**
 * Scene 1 — why. The statement brightens word by word as it scrolls through the
 * viewport. Scroll progress is a CSS variable (`--p`); each word compares it with its
 * own position (`--i`). The full sentence is always in the DOM for assistive tech.
 */
export default function StatementSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  useScrollProgress(ref, { start: 0.85, end: 0.6 });
  const words = STATEMENT.split(' ');

  return (
    <section id="why" aria-labelledby="why-title" className="scroll-mt-16 border-b border-line">
      <div ref={ref} className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-36">
        <SceneLabel index="01">
          <span id="why-title">Why CuriousBees</span>
        </SceneLabel>
        <p className="mt-10 max-w-5xl font-serif text-[28px] leading-[1.3] tracking-[-0.015em] text-ink sm:text-4xl md:text-[46px] md:leading-[1.22]">
          {words.map((word, i) => (
            <span key={i} className="cb-word" style={{ '--i': (i / words.length).toFixed(3) } as React.CSSProperties}>
              {word}{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
