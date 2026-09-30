'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { SceneLabel } from './SceneLabel';

const FAQS = [
  {
    q: 'Who can use CuriousBees?',
    a: 'Research supervisors, research scholars and institute administrators at SRM Institute of Science and Technology. Accounts are created by the institution; you sign in with the Google account for the email address you were registered with.',
  },
  {
    q: 'How do I get an account?',
    a: 'Contact your department or the research office. An administrator adds you with your role, faculty and department, and you can sign in straight away.',
  },
  {
    q: 'Who can see my research files?',
    a: 'Files you upload to a workspace are stored privately and encrypted. They are only shared through short-lived links with members of that workspace.',
  },
  {
    q: 'Can I work with researchers in other departments?',
    a: 'Yes. You can find researchers across faculties by research area, follow their work and send collaboration requests.',
  },
  {
    q: 'How do supervisors follow scholar progress?',
    a: 'Scholars keep their research stage and milestones up to date and submit progress reports; supervisors review them in the Supervision Panel. Shared workspaces hold the files, milestones and announcements, so both sides see the same record.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section aria-labelledby="faq-title" className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-24 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:py-32">
      <div>
        <SceneLabel index="05">Questions</SceneLabel>
        <h2 id="faq-title" className="mt-6 font-serif text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-5xl">
          Good to know
        </h2>
        <p className="mt-4 text-base text-ink-secondary">
          Can&apos;t find what you need?{' '}
          <Link href="/contact" className="font-medium text-brand hover:underline">
            Contact the CuriousBees team
          </Link>
          .
        </p>
      </div>
      <div className="divide-y divide-line border-y border-line">
        {FAQS.map((faq, idx) => {
          const open = openIndex === idx;
          return (
            <div key={faq.q}>
              <h3>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : idx)}
                  aria-expanded={open}
                  aria-controls={`faq-panel-${idx}`}
                  id={`faq-trigger-${idx}`}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold text-ink"
                >
                  {faq.q}
                  <ChevronDown className={`size-5 shrink-0 text-ink-muted transition-transform duration-base ${open ? 'rotate-180' : ''}`} aria-hidden />
                </button>
              </h3>
              <div
                id={`faq-panel-${idx}`}
                role="region"
                aria-labelledby={`faq-trigger-${idx}`}
                hidden={!open}
                className="pb-5 text-[15px] leading-relaxed text-ink-secondary"
              >
                {faq.a}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
