import * as React from 'react';
import { Reveal } from '@/components/motion/reveal';
import { SceneLabel } from './SceneLabel';

const STEPS = [
  {
    title: 'Get added by your institution',
    body: 'The research office creates your account with the right role, faculty and department. You then sign in with Google.',
  },
  {
    title: 'Connect with your supervisor',
    body: 'Scholars send a supervision request; supervisors approve it, and the relationship is recorded for the institution.',
  },
  {
    title: 'Work in a shared workspace',
    body: 'Files, milestones and announcements stay together, visible only to the members of that workspace.',
  },
];

/** Scene 4 — getting started. Server component; only the reveals hydrate. */
export default function WorkflowSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-16 border-b border-line bg-surface-muted">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <SceneLabel index="04">Getting started</SceneLabel>
        <h2 id="how-title" className="mt-6 max-w-2xl font-serif text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-5xl">
          Three steps to your first shared workspace.
        </h2>
        <ol className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <Reveal variant="line" delay={i * 160} className="h-px w-full bg-line-strong" aria-hidden />
              <Reveal delay={120 + i * 160}>
                <p className="mt-6 font-mono text-xs text-ink-muted">Step {i + 1}</p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink">{step.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-ink-secondary">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
