import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Never under NODE_ENV=test: tests must not pick up the development database.
if (process.env.NODE_ENV !== 'test') dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning CuriousBees Demo Data...');

  // Delete demo comments, likes, threads
  const demoPostTitles = [
    'Autonomous Distributed Computing & Low-Latency LLM Serving in Edge Clusters',
    'Parameter-Efficient Fine-Tuning (PEFT) on Heterogeneous AI Accelerators',
    'Call for Collaborators: 6G Beamforming Simulation using Open-Source RAN Testbeds',
    'SRMIST Annual Doctoral Research Symposium 2026 — Call for Extended Abstracts',
    'Zero-Knowledge Proofs for Verifiable Credential Issuance in Academic Registries',
    'Query: Comparative latency of vLLM PagedAttention vs TensorRT-LLM on Ada Lovelace architecture?',
  ];

  const threads = await prisma.thread.findMany({
    where: { title: { in: demoPostTitles } },
    select: { id: true },
  });
  const threadIds = threads.map((t) => t.id);

  if (threadIds.length > 0) {
    await prisma.comment.deleteMany({ where: { threadId: { in: threadIds } } });
    await prisma.threadLike.deleteMany({ where: { threadId: { in: threadIds } } });
    await prisma.thread.deleteMany({ where: { id: { in: threadIds } } });
    console.log(`Deleted ${threadIds.length} demo research feed threads.`);
  }

  // Delete demo publications
  const demoPubs = [
    'Decentralized Orchestration of Quantized Foundation Models in Heterogeneous Edge Meshes',
    'Energy-Efficient Consensus Algorithms for High-Throughput Distributed Ledgers',
    'Scalable Prompt Cache Partitioning for Multi-Tenant LLM Inference Platforms',
    'Adaptive Resource Allocation in Ultra-Reliable Low-Latency Vehicular Edge Clouds',
    'Survey on Fault-Tolerant Distributed Training: Checkpointing, Quantization, and Recovery',
  ];
  const pubsDeleted = await prisma.publication.deleteMany({
    where: { title: { in: demoPubs } },
  });
  console.log(`Deleted ${pubsDeleted.count} demo publications.`);

  // Delete demo reports
  const demoReportTitles = [
    'Q1 Progress Report: Distributed Prompt Cache Partitioning',
    'Literature Review on Zero-Bubble Pipeline Parallelism',
    'Mid-Year Comprehensive Benchmark & Prototype Validation',
  ];
  const reportsDeleted = await prisma.report.deleteMany({
    where: { title: { in: demoReportTitles } },
  });
  console.log(`Deleted ${reportsDeleted.count} demo reports.`);

  // Delete demo opportunities
  const demoOppTitles = [
    'Doctoral Research Fellowship in Generative AI for Edge Hardware',
    'Postdoctoral Fellowship: 6G Beamforming Simulation and Open-RAN',
    'SRMIST Student Research Grant (SRG-2026) in Quantum Computing',
    'Junior Research Fellow (JRF) in Glioblastoma Targeted Nanocarriers',
  ];
  const oppsDeleted = await prisma.opportunity.deleteMany({
    where: { title: { in: demoOppTitles } },
  });
  console.log(`Deleted ${oppsDeleted.count} demo opportunities.`);

  // Delete demo notifications
  const demoNotifTitles = [
    'Milestone Progress Submitted',
    'Paper Citation Alert',
    'Report Approved by Supervisor',
    'New Workspace Announcement',
    'Institutional Research Metric Update',
  ];
  const notifsDeleted = await prisma.notification.deleteMany({
    where: { title: { in: demoNotifTitles } },
  });
  console.log(`Deleted ${notifsDeleted.count} demo notifications.`);

  console.log('✅ Demo data cleanup complete!');
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
