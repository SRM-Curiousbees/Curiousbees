'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronRight, ChevronDown, BookOpen, MessageSquare, Shield, Send } from 'lucide-react';
import { DashboardShell } from '@/components/shared/dashboard-shell';
import { motion, AnimatePresence } from 'framer-motion';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "How do I log a co-authored publication or patent?",
    answer: "Navigate to the 'My Research' section in the sidebar, click 'Add Publication', and fill in details such as the title, co-authors list, and indexing DOI. Publications are stored on the intranet directory for institutional audits."
  },
  {
    question: "How does supervisor validation for progress reports work?",
    answer: "Every progress report or evidence document you submit through 'My Research' is dispatched directly to your supervisor's advisory queue. They can approve it, request corrections ('Needs Info'), or provide feedback. You will receive notifications when the review status is updated."
  },
  {
    question: "How are workspaces provisioned?",
    answer: "Workspaces are automatically created as soon as a supervisor approves a collaboration synergy proposal on an opportunity post. The workspace provides a secure private node to upload drafts, organize milestones, and broadcast updates."
  },
  {
    question: "What is the SLM Calendar Ingestion tool?",
    answer: "CuriousBees runs a local Small Language Model (SLM) that continuously scans campus announcements and structures them into defenses, seminars, and calendar timelines automatically. You can view the pipeline metrics on the 'Events' feed."
  },
  {
    question: "Who can see my profile and research focus tags?",
    answer: "Your academic snapshot and interests are indexed in the Intranet Expert Directory. Faculty guides and other PhD scholars can browse this directory to discover co-authors and trigger synergy proposals."
  }
];

export default function ScholarHelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <DashboardShell>
      {/* 🚀 Notion-style Hero Header */}
      <div className="theme-static relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-brand-900 to-brand-800 cb-honeycomb-dark border border-brand-800/15 p-6 md:p-8 shadow-xl text-left">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-12 bottom-0 w-72 h-72 bg-brand-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gold/25 text-gold border border-gold/30 text-xs font-medium capitalize">
              Help Center
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight leading-tight">
              CuriousBees Support & Knowledge Base
            </h1>
            <p className="text-xs sm:text-sm text-white/80 font-medium max-w-xl leading-relaxed">
              Find instant answers to common questions about research collaboration, supervisor validation queues, and workspace nodes.
            </p>
          </div>
        </div>
      </div>

      {/* ⚙️ Help Center Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Left Column: FAQ Accordion (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-medium capitalize text-slate-400 border-b border-slate-100 pb-2.5 mb-2">
            Frequently Asked Questions
          </h3>

          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div 
                  key={index}
                  className="cb-card overflow-hidden bg-surface hover:border-slate-350 transition-colors"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full p-4 flex items-center justify-between text-left font-display font-bold text-xs sm:text-sm text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden bg-slate-50/50"
                      >
                        <p className="p-4 pt-0 text-xs text-slate-600 font-sans font-medium leading-relaxed border-t border-slate-100">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Support Channels (Span 1) */}
        <div className="space-y-6">
          <h3 className="text-xs font-medium capitalize text-slate-400 border-b border-slate-100 pb-2.5 mb-2">
            Direct Support Channels
          </h3>

          <div className="cb-card p-5 bg-surface space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <BookOpen className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900">Academic Guidelines & Forms</h4>
                <p className="text-2xs text-slate-500 font-medium leading-normal">
                  Read official university research regulations, funding structures, and doctoral guidelines.
                </p>
                <a href="https://www.srmist.edu.in" target="_blank" rel="noreferrer" className="text-2xs text-primary font-bold hover:underline block pt-1">
                  View PDF Guidelines →
                </a>
              </div>
            </div>

            <div className="w-full h-[1px] bg-slate-100" />

            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                <Shield className="w-4.5 h-4.5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900">Institutional Tech Support</h4>
                <p className="text-2xs text-slate-500 font-medium leading-normal">
                  Experiencing system login errors, Google authentication timeouts, or API route issues? Contact IT administrator.
                </p>
                <button 
                  onClick={() => alert('Support ticket logged. Institutional IT will respond via email.')}
                  className="text-2xs text-primary font-bold hover:underline block pt-1 cursor-pointer"
                >
                  Create Support Ticket →
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
