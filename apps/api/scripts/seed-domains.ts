import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

const DOMAINS_AND_TOPICS = [
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

async function main() {
  console.log('Seeding Research Domains and Topics...');
  for (const d of DOMAINS_AND_TOPICS) {
    const domainRecord = await prisma.researchDomain.upsert({
      where: { name: d.domain },
      create: { name: d.domain, description: d.description },
      update: { description: d.description },
    });

    for (const t of d.topics) {
      await prisma.researchTopic.upsert({
        where: {
          domainId_name: {
            domainId: domainRecord.id,
            name: t.name,
          },
        },
        create: {
          name: t.name,
          domainId: domainRecord.id,
          description: t.description,
        },
        update: {
          description: t.description,
        },
      });

      // Also ensure it exists as a ResearchInterest for backward-compatibility
      await prisma.researchInterest.upsert({
        where: { name: t.name },
        create: { name: t.name },
        update: {},
      });
    }
  }

  // Link existing users to matching topics/domains based on their interests
  const users = await prisma.user.findMany({
    include: {
      interests: { include: { interest: true } },
      supervisorProfile: true,
      scholarProfile: true,
    },
  });

  const allTopics = await prisma.researchTopic.findMany({ include: { domain: true } });

  for (const user of users) {
    const userInterestNames = user.interests.map((i) => i.interest.name.toLowerCase());
    const userArea = (user.supervisorProfile?.researchArea || user.scholarProfile?.researchArea || user.bio || '').toLowerCase();

    for (const topic of allTopics) {
      const matchTopic = userInterestNames.some((ui) => ui.includes(topic.name.toLowerCase()) || topic.name.toLowerCase().includes(ui)) ||
                         userArea.includes(topic.name.toLowerCase());
      const matchDomain = userArea.includes(topic.domain.name.toLowerCase());

      if (matchTopic) {
        await prisma.userTopic.upsert({
          where: { userId_topicId: { userId: user.id, topicId: topic.id } },
          create: { userId: user.id, topicId: topic.id },
          update: {},
        }).catch(() => {});

        await prisma.userDomain.upsert({
          where: { userId_domainId: { userId: user.id, domainId: topic.domain.id } },
          create: { userId: user.id, domainId: topic.domain.id },
          update: {},
        }).catch(() => {});
      } else if (matchDomain) {
        await prisma.userDomain.upsert({
          where: { userId_domainId: { userId: user.id, domainId: topic.domain.id } },
          create: { userId: user.id, domainId: topic.domain.id },
          update: {},
        }).catch(() => {});
      }
    }
  }

  console.log('✅ Seeded Research Domains, Topics, and User Links successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
