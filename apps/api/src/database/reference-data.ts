/**
 * Institutional reference data required by the application (organisation
 * hierarchy and research taxonomy). Shared by the development seed and the
 * production seed. Contains no users and no user-generated content.
 */

export const SRM_ORGANIZATION_DATA = {
  campus: {
    code: 'KTR',
    name: 'Kattankulathur',
    location: 'SRM Nagar, Kattankulathur, Chengalpattu District, Tamil Nadu 603203',
    status: 'ACTIVE',
  },
  faculties: [
    {
      name: 'Faculty of Engineering & Technology',
      legacyNames: ['Engineering & Technology'],
      departments: [
        { code: 'MCA', name: 'Computer Applications', description: 'Department of Computer Applications (MCA)' },
        { code: 'CSE', name: 'Computing Technologies', description: 'Department of Computing Technologies (CSE)' },
        { code: 'IT', name: 'Information Technology', description: 'Department of Information Technology' },
        { code: 'AIML', name: 'Computational Intelligence', description: 'Department of Computational Intelligence (AIML)' },
        { code: 'ECE', name: 'Electronics & Communication Engineering', description: 'Department of Electronics & Communication Engineering' },
        { code: 'EEE', name: 'Electrical & Electronics Engineering', description: 'Department of Electrical & Electronics Engineering' },
        { code: 'BIOTECH', name: 'Biotechnology', description: 'Department of Biotechnology' },
        { code: 'MECH', name: 'Mechanical Engineering', description: 'Department of Mechanical Engineering' },
        { code: 'CIVIL', name: 'Civil Engineering', description: 'Department of Civil Engineering' },
        { code: 'CHEM', name: 'Chemical Engineering', description: 'Department of Chemical Engineering' },
        { code: 'AERO', name: 'Aerospace Engineering', description: 'Department of Aerospace Engineering' },
        { code: 'BME', name: 'Biomedical Engineering', description: 'Department of Biomedical Engineering' },
      ],
    },
    {
      name: 'Faculty of Science & Humanities',
      legacyNames: ['Science & Humanities'],
      departments: [
        { code: 'PHYS', name: 'Physics & Nanotechnology', description: 'Department of Physics & Nanotechnology' },
        { code: 'CHEMISTRY', name: 'Chemistry', description: 'Department of Chemistry' },
        { code: 'MATHS', name: 'Mathematics', description: 'Department of Mathematics' },
        { code: 'ENG', name: 'English & Foreign Languages', description: 'Department of English & Foreign Languages' },
        { code: 'COMMERCE', name: 'Commerce & Economics', description: 'Department of Commerce & Economics' },
      ],
    },
    {
      name: 'Faculty of Management',
      legacyNames: ['Management'],
      departments: [
        { code: 'SOM', name: 'Management Studies', description: 'Department of Management Studies' },
      ],
    },
    {
      name: 'Faculty of Law',
      legacyNames: ['Law'],
      departments: [
        { code: 'LAW-CORP', name: 'Corporate Law & Governance', description: 'Department of Corporate Law' },
        { code: 'LAW-IPR', name: 'Intellectual Property Rights', description: 'Department of IPR & Cyber Law' },
      ],
    },
    {
      name: 'Faculty of Medicine & Health Sciences',
      legacyNames: ['Medical'],
      departments: [
        { code: 'HEALTH', name: 'Health Sciences & Clinical Research', description: 'Department of Health Sciences & Clinical Research' },
        { code: 'COMM-MED', name: 'Community Medicine', description: 'Department of Community Medicine' },
      ],
    },
    {
      name: 'Faculty of Pharmacy',
      legacyNames: [],
      departments: [
        { code: 'PHARM-CHEM', name: 'Pharmaceutical Chemistry & Analysis', description: 'Department of Pharmaceutical Chemistry' },
        { code: 'PHARM-PRAC', name: 'Pharmacy Practice', description: 'Department of Pharmacy Practice' },
      ],
    },
    {
      name: 'Faculty of Nursing',
      legacyNames: [],
      departments: [
        { code: 'NURS-COMM', name: 'Community Health Nursing', description: 'Department of Community Health Nursing' },
      ],
    },
    {
      name: 'Faculty of Physiotherapy',
      legacyNames: [],
      departments: [
        { code: 'PHYSIO', name: 'Physiotherapy & Rehabilitation', description: 'Department of Physiotherapy' },
      ],
    },
    {
      name: 'Faculty of Occupational Therapy',
      legacyNames: [],
      departments: [
        { code: 'OCC-THERAPY', name: 'Occupational Therapy', description: 'Department of Occupational Therapy' },
      ],
    },
    {
      name: 'Faculty of Public Health',
      legacyNames: [],
      departments: [
        { code: 'PUB-HEALTH', name: 'Public Health & Epidemiology', description: 'Department of Public Health' },
      ],
    },
    {
      name: 'Faculty of Hotel Management',
      legacyNames: [],
      departments: [
        { code: 'HOTEL-MGMT', name: 'Hotel Management & Catering', description: 'Department of Hotel Management' },
      ],
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
