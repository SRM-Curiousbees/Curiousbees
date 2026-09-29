import React from 'react';

const STEPS = [
  {
    title: 'Get added by your institution',
    body: 'Your research office creates your account with the right role, faculty and department. You then sign in with Google.',
  },
  {
    title: 'Connect with your supervisor',
    body: 'Scholars send a supervision request; supervisors approve it, and the relationship is recorded for the institution.',
  },
  {
    title: 'Work in a shared workspace',
    body: 'Files, milestones, meetings and announcements stay together, visible only to the members of that workspace.',
  },
];

export default function WorkflowSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 border-y border-line bg-surface-muted">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
        <h2 id="how-title" className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">How it works</h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative border-t-2 border-line pt-6">
              <span
                aria-hidden
                className={`absolute -top-[2px] left-0 h-[2px] w-16 ${i === 0 ? 'bg-gold' : 'bg-brand-700'}`}
              />
              <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
