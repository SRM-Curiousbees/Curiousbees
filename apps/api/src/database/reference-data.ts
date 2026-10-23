/**
 * Institutional reference data required by the application (organisation
 * hierarchy and research taxonomy). Shared by the development seed and the
 * production seed. Contains no users and no user-generated content.
 */

import { srmData } from './srm-data';

export const LEGACY_DEPARTMENT_CODE_MAP: Record<string, string> = {
  MCA: 'CA-FLABS',
  CA: 'CA-FLABS',
  'CA-FSH': 'CA-FLABS',
  CSE: 'CTECH-CET',
  IT: 'NWC-CET',
  AIML: 'CINT-CET',
  ECE: 'ECE-CET',
  EEE: 'EEE-CET',
  BIOTECH: 'BIOTECH-CET',
  MECH: 'MECH-CET',
  CIVIL: 'CIVIL-CET',
  CHEM: 'CHEMENG-CET',
  AERO: 'AERO-CET',
  BME: 'BME-CET',
  PHYS: 'PHYS-FLABS',
  CHEMISTRY: 'CHEM-FLABS',
  MATHS: 'MATH-FLABS',
  ENG: 'ENG-FLABS',
  COMMERCE: 'COMM-FLABS',
  SOM: 'DOM-FM',
  'LAW-CORP': 'LAW-SOL',
  'LAW-IPR': 'LAW-SOL',
  HEALTH: 'AHS-FMHS',
  'COMM-MED': 'MRC-FMHS',
  'PHARM-CHEM': 'PC-FMHS',
  'PHARM-PRAC': 'PP-FMHS',
  'NURS-COMM': 'NURS-FMHS',
  PHYSIO: 'CPT-FMHS',
  'OCC-THERAPY': 'COT-FMHS',
  'PUB-HEALTH': 'SPH-FMHS',
  'HOTEL-MGMT': 'IHCM-FLABS',
};

export const SRM_ORGANIZATION_DATA = {
  campus: {
    code: 'KTR',
    name: 'Kattankulathur',
    location: 'SRM Nagar, Kattankulathur, Chengalpattu District, Tamil Nadu 603203',
    status: 'ACTIVE',
  },
  faculties: [
    {
      code: 'CET',
      name: 'Faculty of Engineering & Technology',
      legacyNames: ['Engineering & Technology'],
      departments: srmData.university.faculties[0].departments.map((d) => ({
        code: d.code,
        name: d.name,
        description: `${d.name} (${d.code})`,
        programmes: d.programmes,
      })),
    },
    {
      code: 'FLABS',
      name: 'Faculty of Liberal Arts & Business Studies',
      legacyNames: [
        'Faculty of Science & Humanities',
        'Science & Humanities',
        'Faculty of Hotel Management',
        'Hotel Management',
      ],
      departments: srmData.university.faculties[1].departments.map((d) => ({
        code: d.code,
        name: d.name,
        description: `${d.name} (${d.code})`,
        programmes: d.programmes,
      })),
    },
    {
      code: 'FM',
      name: 'Faculty of Management',
      legacyNames: ['Management'],
      departments: srmData.university.faculties[2].departments.map((d) => ({
        code: d.code,
        name: d.name,
        description: `${d.name} (${d.code})`,
        programmes: d.programmes,
      })),
    },
    {
      code: 'FMHS',
      name: 'Medicine & Health Sciences',
      legacyNames: [
        'Faculty of Medicine & Health Sciences',
        'Medical',
        'Faculty of Pharmacy',
        'Pharmacy',
        'Faculty of Nursing',
        'Nursing',
        'Faculty of Physiotherapy',
        'Physiotherapy',
        'Faculty of Occupational Therapy',
        'Occupational Therapy',
        'Faculty of Public Health',
        'Public Health',
      ],
      departments: srmData.university.faculties[3].departments.map((d) => ({
        code: d.code,
        name: d.name,
        description: `${d.name} (${d.code})`,
        programmes: d.programmes,
      })),
    },
    {
      code: 'LAW',
      name: 'SRM School of Law',
      legacyNames: ['Faculty of Law', 'Law'],
      departments: srmData.university.faculties[4].departments.map((d) => ({
        code: d.code,
        name: d.name,
        description: `${d.name} (${d.code})`,
        programmes: d.programmes,
      })),
    },
  ],
};
export const RESEARCH_INTERESTS: string[] = [
    'Generative AI & LLMs',
    'Quantum Computing',
    'Silicon Photonics',
    'Nanomaterials & Thin Films',
    'Cancer Immunotherapy',
    '5G/6G Wireless Networks',
    'VLSI System Design',
    'Reinforcement Learning',
    'Bioinformatics',
    'Structural Health Monitoring',
    'Blockchains & Smart Contracts',
];

export const DOMAINS_AND_TOPICS = [
  {
    domain: 'Artificial Intelligence & Machine Learning',
    description: 'Core research covering computer vision, deep learning, NLP, generative models, and algorithmic autonomy.',
    topics: [
      { name: 'Computer Vision', description: 'Visual perception, medical image analysis, object detection, and scene understanding.' },
      { name: 'Generative AI & LLMs', description: 'Large language models, prompt engineering, multi-modal reasoning, and synthetic media.' },
      { name: 'Reinforcement Learning', description: 'Policy optimization, autonomous agent decision-making, and game-theoretic AI.' },
      { name: 'Explainable AI (XAI)', description: 'Model interpretability, algorithmic transparency, and ethical AI systems.' },
      { name: 'Natural Language Processing', description: 'Computational linguistics, translation, semantic search, and speech synthesis.' },
    ],
  },
  {
    domain: 'Quantum & High-Performance Computing',
    description: 'Investigation of quantum algorithms, quantum information theory, and scalable parallel architecture.',
    topics: [
      { name: 'Quantum Computing', description: 'Quantum circuit design, error correction, and quantum supremacy benchmarks.' },
      { name: 'Silicon Photonics', description: 'Integrated photonic circuits for ultra-fast interconnects and computing.' },
      { name: 'High-Performance Computing (HPC)', description: 'Distributed computing, GPU cluster acceleration, and heterogeneous parallel systems.' },
    ],
  },
  {
    domain: 'Biotechnology & Medical Sciences',
    description: 'Translational bioinformatics, computational genomics, and biomedical engineering.',
    topics: [
      { name: 'Bioinformatics & Systems Biology', description: 'Genomic sequence analysis, protein folding prediction, and biological networks.' },
      { name: 'Cancer Immunotherapy', description: 'Targeted immune checkpoint mechanisms and predictive oncology modeling.' },
      { name: 'Medical Imaging', description: 'Radiology AI, ultrasound image enhancement, and automated clinical diagnosis.' },
      { name: 'Precision Medicine', description: 'Patient-stratified therapeutic targeting and biomarker discovery.' },
    ],
  },
  {
    domain: 'Cybersecurity, Networks & Systems',
    description: 'Next-generation networking, pervasive security, cryptosystems, and edge telemetry.',
    topics: [
      { name: '5G/6G Wireless Networks', description: 'Millimeter-wave communications, network slicing, and ultra-reliable low latency.' },
      { name: 'Cryptography and Network Security', description: 'Post-quantum cryptography, zero-knowledge proofs, and secure protocols.' },
      { name: 'Blockchain & Smart Contracts', description: 'Decentralized consensus, verifiable state transitions, and distributed ledgers.' },
      { name: 'Internet of Things (IoT)', description: 'Smart city sensor grids, low-power mesh architectures, and edge telemetry.' },
    ],
  },
  {
    domain: 'Materials Science & Nanotechnology',
    description: 'Synthesis of nanostructured materials, sustainable polymers, and structural diagnostics.',
    topics: [
      { name: 'Nanomaterials & Thin Films', description: '2D materials, graphene syntheses, and photovoltaic functional layers.' },
      { name: 'Structural Health Monitoring', description: 'Sensor integration for acoustic emissions, strain detection, and predictive maintenance.' },
      { name: 'Sustainable Energy & Cleantech', description: 'Battery chemistry, hydrogen catalysts, and smart grid storage solutions.' },
    ],
  },
];
