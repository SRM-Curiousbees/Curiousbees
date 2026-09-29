'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

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
    a: 'Each supervision relationship has a workspace with milestones, progress reports, files and meeting notes, so both sides see the same record.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section aria-labelledby="faq-title" className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1fr_1.6fr] md:py-24">
      <div>
        <h2 id="faq-title" className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">Questions</h2>
        <p className="mt-3 text-[15px] text-ink-secondary">
          Can&apos;t find what you need?{' '}
          <Link href="/contact" className="font-medium text-brand hover:underline">Contact the CuriousBees team</Link>.
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
