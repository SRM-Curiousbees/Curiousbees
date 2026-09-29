'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Dna,
  Shield,
  Cloud,
  BarChart3,
  Atom,
  Leaf,
  Zap,
  Brain,
  Globe,
  Microscope,
  BookOpen,
  GraduationCap,
  Blocks,
  Database,
  Bot,
  Layers,
  FlaskConical,
  Stethoscope,
  Binary,
  Rocket,
  Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── RESEARCH TOPICS DATA ───────────────────────────────────────────────────

const RESEARCH_TOPICS = [
  { id: 'ai', label: 'Artificial Intelligence', icon: Brain, category: 'Computer Science' },
  { id: 'ml', label: 'Machine Learning', icon: Bot, category: 'Computer Science' },
  { id: 'nlp', label: 'Natural Language Processing', icon: BookOpen, category: 'Computer Science' },
  { id: 'cv', label: 'Computer Vision', icon: Layers, category: 'Computer Science' },
  { id: 'cybersecurity', label: 'Cybersecurity', icon: Shield, category: 'Computer Science' },
  { id: 'cloud', label: 'Cloud Computing', icon: Cloud, category: 'Computer Science' },
  { id: 'blockchain', label: 'Blockchain & Web3', icon: Blocks, category: 'Computer Science' },
  { id: 'data-science', label: 'Data Science & Analytics', icon: BarChart3, category: 'Computer Science' },
  { id: 'iot', label: 'IoT & Edge Computing', icon: Network, category: 'Computer Science' },
  { id: 'quantum', label: 'Quantum Computing', icon: Atom, category: 'Physics & Engineering' },
  { id: 'robotics', label: 'Robotics & Automation', icon: Cpu, category: 'Physics & Engineering' },
  { id: 'renewable', label: 'Renewable Energy', icon: Zap, category: 'Physics & Engineering' },
  { id: 'nanotech', label: 'Nanotechnology', icon: Microscope, category: 'Physics & Engineering' },
  { id: 'space', label: 'Space Research', icon: Rocket, category: 'Physics & Engineering' },
  { id: 'bioinfo', label: 'Bioinformatics', icon: Dna, category: 'Life Sciences' },
  { id: 'biotech', label: 'Biotechnology', icon: FlaskConical, category: 'Life Sciences' },
  { id: 'genomics', label: 'Genomics & Proteomics', icon: Dna, category: 'Life Sciences' },
  { id: 'pharma', label: 'Pharmaceutical Sciences', icon: Stethoscope, category: 'Life Sciences' },
  { id: 'env', label: 'Environmental Science', icon: Leaf, category: 'Life Sciences' },
  { id: 'sustainability', label: 'Sustainability & Climate', icon: Globe, category: 'Interdisciplinary' },
  { id: 'edu-tech', label: 'EdTech & Digital Learning', icon: GraduationCap, category: 'Interdisciplinary' },
  { id: 'big-data', label: 'Big Data Engineering', icon: Database, category: 'Interdisciplinary' },
  { id: 'hci', label: 'Human-Computer Interaction', icon: Binary, category: 'Interdisciplinary' },
];

interface TimelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTopicToggle?: (topicId: string, isFollowed: boolean) => void;
}

export default function TimelinesModal({ isOpen, onClose, onTopicToggle }: TimelinesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [followedTopics, setFollowedTopics] = useState<Record<string, boolean>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Load followed topics from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('curiousbees_followed_topics');
      if (saved) setFollowedTopics(JSON.parse(saved));
    } catch {}
  }, []);

  // Save to localStorage when topics change
  useEffect(() => {
    localStorage.setItem('curiousbees_followed_topics', JSON.stringify(followedTopics));
  }, [followedTopics]);

  const handleToggleTopic = (topicId: string) => {
    const newState = !followedTopics[topicId];
    setFollowedTopics(prev => ({ ...prev, [topicId]: newState }));
    onTopicToggle?.(topicId, newState);
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Filter topics by search
  const filteredTopics = RESEARCH_TOPICS.filter(topic =>
    topic.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const groupedTopics: Record<string, typeof RESEARCH_TOPICS> = {};
  filteredTopics.forEach(topic => {
    if (!groupedTopics[topic.category]) groupedTopics[topic.category] = [];
    groupedTopics[topic.category].push(topic);
  });

  const followedCount = Object.values(followedTopics).filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[10vh] px-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            <div className="w-full max-w-[520px] bg-surface rounded-3xl shadow-xl max-h-[80vh] flex flex-col overflow-hidden">

              {/* ─── HEADER ─── */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">Timelines</h2>
                </div>
                {followedCount > 0 && (
                  <span className="text-2xs font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-full">
                    {followedCount} following
                  </span>
                )}
              </div>

              {/* ─── SEARCH BAR ─── */}
              <div className="px-4 py-3 border-b border-slate-100 shrink-0">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search"
                    className="w-full bg-slate-100/80 border border-slate-200/60 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-surface focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* "Nothing to show" when search has no results */}
                {searchQuery && filteredTopics.length === 0 && (
                  <p className="text-xs font-medium text-slate-400 mt-2 pl-1">Nothing to show</p>
                )}
              </div>

              {/* ─── TOPICS LIST ─── */}
              <div className="overflow-y-auto flex-1 overscroll-contain">
                {Object.entries(groupedTopics).map(([category, topics]) => (
                  <div key={category}>
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{category}</h3>
                      {collapsedCategories[category] ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    {/* Topic Items */}
                    <AnimatePresence>
                      {!collapsedCategories[category] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {topics.map(topic => {
                            const TopicIcon = topic.icon;
                            const isFollowed = followedTopics[topic.id] || false;

                            return (
                              <div
                                key={topic.id}
                                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/70 transition-colors"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0">
                                    <TopicIcon className="w-[18px] h-[18px] text-slate-600" />
                                  </div>
                                  <span className="text-sm font-bold text-slate-900 truncate">{topic.label}</span>
                                </div>

                                <button
                                  onClick={() => handleToggleTopic(topic.id)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-90 ${
                                    isFollowed
                                      ? 'bg-brand text-white shadow-sm'
                                      : 'bg-brand text-white shadow-sm hover:bg-brand-strong'
                                  }`}
                                >
                                  {isFollowed ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Plus className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {/* Bottom padding */}
                <div className="h-6" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
