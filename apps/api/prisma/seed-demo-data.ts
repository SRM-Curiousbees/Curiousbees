import {
  PrismaClient,
  Role,
  ThreadType,
  CollaborationStatus,
  ResearchStatus,
  ResearchStage,
  MilestoneStatus,
  MilestonePriority,
  IntegrationProvider,
} from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🐝 Starting CuriousBees Comprehensive Demo Data Generation...');

  // 1. Fetch key users
  const supervisor = await prisma.user.findUnique({
    where: { email: 'mrmatheshwaran17@gmail.com' },
  });
  const scholar = await prisma.user.findUnique({
    where: { email: 'r.matheshwaran.io@gmail.com' },
  });
  const admin = await prisma.user.findUnique({
    where: { email: 'maddybgmistoreog@gmail.com' },
  });
  const drSudha = await prisma.user.findUnique({
    where: { email: 'dr.sudha@srmist.edu.in' },
  });
  const drRazia = await prisma.user.findUnique({
    where: { email: 'dr.razia@srmist.edu.in' },
  });
  const drJayanthi = await prisma.user.findUnique({
    where: { email: 'dr.jayanthi@srmist.edu.in' },
  });
  const gayathri = await prisma.user.findUnique({
    where: { email: 'gr2516@srmist.edu.in' },
  });
  const revathi = await prisma.user.findUnique({
    where: { email: 'rm9040@srmist.edu.in' },
  });
  const santhosh = await prisma.user.findUnique({
    where: { email: 'santhosh.s@srmist.edu.in' },
  });

  if (!supervisor || !scholar) {
    throw new Error('Supervisor or Scholar user not found. Please run the base seed first.');
  }

  const dept = await prisma.department.findFirst({ where: { code: 'MCA' } });

  // 2. Populate Research Feed (Threads, Comments, Likes)
  console.log('📝 Seeding Research Feed Posts...');
  const demoPosts = [
    {
      authorId: supervisor.id,
      title: 'Autonomous Distributed Computing & Low-Latency LLM Serving in Edge Clusters',
      content:
        'Our latest research group preprint explores decentralized KV-cache sharing and dynamic prompt partitioning across heterogeneous edge nodes. By eliminating centralized memory bottlenecks, we achieved a 42% reduction in time-to-first-token (TTFT) on clustered NVIDIA Jetson AGX and workstation GPUs. Full draft available for group review in our workspace.',
      type: ThreadType.RESEARCH_UPDATE,
      isPaper: true,
      paperJournal: 'Preprint · IEEE Transactions on Parallel and Distributed Systems',
      tags: ['Edge AI', 'Distributed Systems', 'LLM Inference', 'Cloud Computing'],
      comments: [
        {
          authorId: scholar.id,
          content: 'The memory synchronization latency under packet loss was our biggest hurdle—the adaptive buffer window solved it elegantly. Ready to test on 16 nodes next week!',
        },
        {
          authorId: drSudha?.id || supervisor.id,
          content: 'Impressive benchmark results, Dr. Matheshwaran. Have you tested fault tolerance when an edge worker drops mid-generation?',
        },
        {
          authorId: supervisor.id,
          content: 'Yes Sudha, we implemented an eager speculative fallback to neighbouring workers with only 12ms recovery overhead.',
        },
      ],
    },
    {
      authorId: scholar.id,
      title: 'Parameter-Efficient Fine-Tuning (PEFT) on Heterogeneous AI Accelerators',
      content:
        'Sharing an experimental update from our doctoral work: We evaluated LoRA vs QLoRA memory footprint scaling across consumer and datacenter silicon. Key finding: FP4 quantization induces minimal perplexity drift on domain-specific biomedical corpus while cutting VRAM footprint by 68%. Feedback and collaboration ideas welcome!',
      type: ThreadType.RESEARCH_UPDATE,
      isPaper: false,
      tags: ['Machine Learning', 'PEFT', 'Quantization', 'Doctoral Research'],
      comments: [
        {
          authorId: supervisor.id,
          content: 'Great progress Matheshwaran. Let us formalize the ablation study for the upcoming IEEE CloudNet submission.',
        },
        {
          authorId: gayathri?.id || scholar.id,
          content: 'Very relevant to my fine-tuning tests in NLP! Did you observe any gradient divergence during the 4-bit backward pass?',
        },
      ],
    },
    {
      authorId: drJayanthi?.id || supervisor.id,
      title: 'Call for Collaborators: 6G Beamforming Simulation using Open-Source RAN Testbeds',
      content:
        'The Department of Electronics and Communication Engineering is inviting doctoral scholars and faculty researchers for an inter-departmental study on sub-terahertz massive MIMO channel estimation under moving user equipment. We have high-performance RF simulation rigs and GPU compute ready.',
      type: ThreadType.COLLABORATION_REQUEST,
      isPaper: false,
      tags: ['6G Networks', 'Beamforming', 'Interdisciplinary', 'Telecommunications'],
      comments: [
        {
          authorId: scholar.id,
          content: 'Our distributed workload scheduler could optimize the heavy Monte Carlo ray-tracing simulations for your beam calculations!',
        },
      ],
    },
    {
      authorId: admin?.id || supervisor.id,
      title: 'SRMIST Annual Doctoral Research Symposium 2026 — Call for Extended Abstracts',
      content:
        'The Directorate of Research invites all registered Ph.D. scholars to submit their work-in-progress extended abstracts for the Annual Research Symposium. Selected papers will receive publication sponsorship and top 3 doctoral contributions receive the Vice Chancellor Research Excellence Medal.',
      type: ThreadType.ANNOUNCEMENT,
      isPaper: false,
      tags: ['Symposium', 'Doctoral Research', 'SRMIST', 'Research Directorate'],
      comments: [
        {
          authorId: drRazia?.id || supervisor.id,
          content: 'All faculty supervisors are requested to review and nominate at least two research scholars from their respective labs.',
        },
      ],
    },
    {
      authorId: revathi?.id || scholar.id,
      title: 'Zero-Knowledge Proofs for Verifiable Credential Issuance in Academic Registries',
      content:
        'Excited to announce our paper has been accepted at the International Conference on Applied Cryptography and Network Security! We demonstrate zk-SNARK proof generation in under 400ms on client devices for tamper-proof degree attestation.',
      type: ThreadType.ACHIEVEMENT,
      isPaper: true,
      paperJournal: 'ACNS 2025 · Springer Lecture Notes in Computer Science',
      tags: ['Cryptography', 'Zero Knowledge', 'Security', 'Blockchain'],
      comments: [
        {
          authorId: supervisor.id,
          content: 'Hearty congratulations Revathi! A brilliant milestone for the computing department.',
        },
      ],
    },
    {
      authorId: scholar.id,
      title: 'Query: Comparative latency of vLLM PagedAttention vs TensorRT-LLM on Ada Lovelace architecture?',
      content:
        'Has anyone benchmarked continuous batching throughput on RTX 6000 Ada with long context prompts (32k+ tokens)? We are observing divergent memory reclamation behaviors when context lengths fluctuate violently.',
      type: ThreadType.QUESTION,
      isPaper: false,
      tags: ['vLLM', 'TensorRT', 'GPU Performance', 'Benchmarking'],
      comments: [
        {
          authorId: drSudha?.id || supervisor.id,
          content: 'Look into the chunked prefill setting in vLLM v0.6+; it smoothed out our latency spikes considerably.',
        },
      ],
    },
  ];

  for (const post of demoPosts) {
    const existing = await prisma.thread.findFirst({
      where: { title: post.title },
    });
    if (!existing) {
      const thread = await prisma.thread.create({
        data: {
          title: post.title,
          content: post.content,
          type: post.type,
          isPaper: post.isPaper,
          paperJournal: post.paperJournal,
          authorId: post.authorId,
          tags: post.tags,
        },
      });

      // Add comments
      for (const c of post.comments) {
        await prisma.comment.create({
          data: {
            threadId: thread.id,
            authorId: c.authorId,
            content: c.content,
          },
        });
      }

      // Add likes
      const likers = [supervisor.id, scholar.id, admin?.id].filter(Boolean) as string[];
      for (const likerId of likers) {
        await prisma.threadLike.create({
          data: {
            threadId: thread.id,
            userId: likerId,
          },
        }).catch(() => {});
      }
    }
  }

  // 3. Populate Publications
  console.log('📚 Seeding Publications...');
  const publications = [
    {
      userId: scholar.id,
      title: 'Decentralized Orchestration of Quantized Foundation Models in Heterogeneous Edge Meshes',
      authors: 'Matheshwaran R, Dr. Matheshwaran, Dr. Sudha M R',
      doi: '10.1109/TCC.2025.3421102',
      publisher: 'IEEE Transactions on Cloud Computing',
      year: 2025,
      status: 'PUBLISHED',
    },
    {
      userId: supervisor.id,
      title: 'Energy-Efficient Consensus Algorithms for High-Throughput Distributed Ledgers',
      authors: 'Dr. Matheshwaran, Revathi M, Dr. Razia Begum S',
      doi: '10.1145/3678901.3678945',
      publisher: 'ACM Transactions on Computer Systems (TOCS)',
      year: 2024,
      status: 'PUBLISHED',
    },
    {
      userId: scholar.id,
      title: 'Scalable Prompt Cache Partitioning for Multi-Tenant LLM Inference Platforms',
      authors: 'Matheshwaran R, Dr. Matheshwaran',
      doi: '10.5555/3612801.3612845',
      publisher: 'USENIX Symposium on Networked Systems Design and Implementation (NSDI)',
      year: 2026,
      status: 'UNDER_REVIEW',
    },
    {
      userId: supervisor.id,
      title: 'Adaptive Resource Allocation in Ultra-Reliable Low-Latency Vehicular Edge Clouds',
      authors: 'Dr. Matheshwaran, Dr. Jayanthi D, K. Sundaram',
      doi: '10.1109/TVT.2023.3298411',
      publisher: 'IEEE Transactions on Vehicular Technology',
      year: 2023,
      status: 'PUBLISHED',
    },
    {
      userId: scholar.id,
      title: 'Survey on Fault-Tolerant Distributed Training: Checkpointing, Quantization, and Recovery',
      authors: 'Matheshwaran R, Dr. Matheshwaran',
      doi: '10.1145/3589921',
      publisher: 'ACM Computing Surveys',
      year: 2024,
      status: 'PUBLISHED',
    },
  ];

  for (const pub of publications) {
    const existing = await prisma.publication.findFirst({
      where: { title: pub.title, userId: pub.userId },
    });
    if (!existing) {
      await prisma.publication.create({ data: pub });
    }
  }

  // 4. Populate Scholar Research Profile & Milestones (/my-research)
  console.log('🔬 Seeding Scholar Research Profile & Doctoral Milestones...');
  let researchProfile = await prisma.researchProfile.findUnique({
    where: { scholarId: scholar.id },
  });

  if (!researchProfile) {
    researchProfile = await prisma.researchProfile.create({
      data: {
        scholarId: scholar.id,
        title: 'Autonomous Edge AI Orchestration & Distributed Parameter Optimization',
        researchArea: 'Autonomous Distributed Computing and AI Workload Optimization',
        abstract:
          'This doctoral research addresses the latency and energy constraints of serving billion-parameter transformer models on decentralized edge topologies. By introducing memory-aware prompt cache migration and dynamic layer quantization, our framework achieves near-datacenter throughput on power-constrained heterogeneous hardware.',
        status: ResearchStatus.ACTIVE,
        currentStage: ResearchStage.IMPLEMENTATION,
        startDate: new Date('2024-07-01'),
        expectedCompletionDate: new Date('2027-06-30'),
      },
    });
  }

  const milestonesData = [
    {
      title: 'Comprehensive Literature Survey on Distributed LLM Serving',
      description: 'Systematic review of 120+ papers across MLSys, OSDI, NSDI, and IEEE TCC.',
      stage: ResearchStage.LITERATURE_REVIEW,
      status: MilestoneStatus.COMPLETED,
      priority: MilestonePriority.HIGH,
      completedAt: new Date('2024-11-15'),
      dueDate: new Date('2024-11-30'),
    },
    {
      title: 'Mathematical Formulation of Edge KV-Cache Partitioning',
      description: 'Markov decision process formulation for cache eviction under stochastic wireless latency.',
      stage: ResearchStage.METHODOLOGY,
      status: MilestoneStatus.COMPLETED,
      priority: MilestonePriority.HIGH,
      completedAt: new Date('2025-03-10'),
      dueDate: new Date('2025-03-31'),
    },
    {
      title: 'Cluster Prototype Implementation on Heterogeneous Edge Testbed',
      description: 'Deployment on 8x NVIDIA Jetson Orin + 2x Workstation Nodes with vLLM engine.',
      stage: ResearchStage.IMPLEMENTATION,
      status: MilestoneStatus.IN_PROGRESS,
      priority: MilestonePriority.HIGH,
      dueDate: new Date('2026-11-30'),
    },
    {
      title: 'Empirical Evaluation & Performance Benchmarking',
      description: 'Multi-variable benchmarking against baseline centralized serving frameworks.',
      stage: ResearchStage.EVALUATION,
      status: MilestoneStatus.UPCOMING,
      priority: MilestonePriority.MEDIUM,
      dueDate: new Date('2027-02-28'),
    },
    {
      title: 'Doctoral Dissertation Submission and Final Defense',
      description: 'Final thesis compile, plagiarism clearance, and defense before the doctoral committee.',
      stage: ResearchStage.THESIS_PUBLICATION,
      status: MilestoneStatus.UPCOMING,
      priority: MilestonePriority.HIGH,
      dueDate: new Date('2027-06-30'),
    },
  ];

  for (const m of milestonesData) {
    const existing = await prisma.researchMilestone.findFirst({
      where: { researchProfileId: researchProfile.id, title: m.title },
    });
    if (!existing) {
      await prisma.researchMilestone.create({
        data: {
          researchProfileId: researchProfile.id,
          title: m.title,
          description: m.description,
          stage: m.stage,
          status: m.status,
          priority: m.priority,
          completedAt: m.completedAt,
          dueDate: m.dueDate,
          createdById: supervisor.id,
        },
      });
    }
  }

  // 5. Populate Workspaces (/workspace)
  console.log('📁 Seeding Workspaces & Research Projects...');
  const workspaces = [
    {
      title: 'Autonomous Edge AI Research Lab',
      description: 'Collaborative workspace for doctoral experiments, code repositories, and manuscript drafts on distributed edge AI systems.',
      supervisorId: supervisor.id,
      researchDomain: 'Computer Science & Engineering',
      researchTopic: 'Autonomous Distributed Computing and AI Workload Optimization',
      collaborationProvider: IntegrationProvider.GOOGLE_WORKSPACE,
      googleChatSpaceUrl: 'https://chat.google.com/room/curiousbees-edge-ai',
      zoomJoinUrl: 'https://zoom.us/j/9981245781',
      members: [
        { userId: supervisor.id, role: 'OWNER' },
        { userId: scholar.id, role: 'MEMBER' },
        ...(drSudha ? [{ userId: drSudha.id, role: 'MEMBER' }] : []),
      ],
      milestones: [
        { title: 'Complete Multi-Node Cluster Configuration', description: 'Configure RoCE and RDMA interconnects between Jetson cluster and host workstation.', completed: true },
        { title: 'Draft ACM Conference Manuscript', description: 'Compile experimental graphs and write methodology section for ACM SIGMETRICS.', completed: false },
        { title: 'Doctoral Advisory Committee Review 2', description: 'Present second-year progress report to the external doctoral review committee.', completed: false },
      ],
      announcements: [
        { authorId: supervisor.id, title: 'Advisory Review Scheduled', content: 'Our committee presentation is confirmed for the 15th. Please finalize the slide deck.' },
        { authorId: scholar.id, title: 'Benchmark Data Updated', content: 'Latency traces for 32k prompt tokens have been uploaded to the dataset repository.' },
      ],
      files: [
        { name: 'Architecture_Specification_v2.pdf', url: 'https://curiousbees.srmist.edu.in/docs/architecture_v2.pdf', size: 2450000, uploadedById: supervisor.id },
        { name: 'Benchmark_Throughput_Data.xlsx', url: 'https://curiousbees.srmist.edu.in/docs/throughput_traces.xlsx', size: 1820000, uploadedById: scholar.id },
      ],
    },
    {
      title: 'Quantum-Resilient Distributed Cryptosystems',
      description: 'Post-quantum cryptographic algorithms, lattice-based signature schemes, and FPGA hardware verification.',
      supervisorId: supervisor.id,
      researchDomain: 'Information Security & Cryptography',
      researchTopic: 'Post-Quantum Verification',
      collaborationProvider: IntegrationProvider.ZOOM_WORKPLACE,
      zoomJoinUrl: 'https://zoom.us/j/9812401824',
      members: [
        { userId: supervisor.id, role: 'OWNER' },
        ...(revathi ? [{ userId: revathi.id, role: 'MEMBER' }] : []),
      ],
      milestones: [
        { title: 'Lattice Cryptography Benchmark', description: 'Evaluate Kyber and Dilithium performance on ARM Cortex-M4.', completed: true },
      ],
      announcements: [
        { authorId: supervisor.id, title: 'FPGA Rig Available', content: 'The Xilinx UltraScale+ evaluation kit is now free in Lab 402.' },
      ],
      files: [],
    },
  ];

  for (const ws of workspaces) {
    let existingWs = await prisma.workspace.findFirst({
      where: { title: ws.title },
    });
    if (!existingWs) {
      existingWs = await prisma.workspace.create({
        data: {
          title: ws.title,
          description: ws.description,
          supervisorId: ws.supervisorId,
          researchDomain: ws.researchDomain,
          researchTopic: ws.researchTopic,
          collaborationProvider: ws.collaborationProvider,
          googleChatSpaceUrl: ws.googleChatSpaceUrl,
          zoomJoinUrl: ws.zoomJoinUrl,
        },
      });

      for (const m of ws.members) {
        await prisma.workspaceMember.upsert({
          where: { workspaceId_userId: { workspaceId: existingWs.id, userId: m.userId } },
          update: {},
          create: { workspaceId: existingWs.id, userId: m.userId, role: m.role },
        });
      }

      for (const ms of ws.milestones) {
        await prisma.workspaceMilestone.create({
          data: {
            workspaceId: existingWs.id,
            title: ms.title,
            description: ms.description,
            completed: ms.completed,
          },
        });
      }

      for (const a of ws.announcements) {
        await prisma.workspaceAnnouncement.create({
          data: {
            workspaceId: existingWs.id,
            title: a.title,
            content: a.content,
            authorId: a.authorId,
          },
        });
      }

      for (const f of ws.files) {
        await prisma.workspaceFile.create({
          data: {
            workspaceId: existingWs.id,
            name: f.name,
            url: f.url,
            size: f.size,
            uploadedById: f.uploadedById,
          },
        });
      }
    }
  }

  // 6. Populate Scholar-Supervisor Reports (/my-scholars?tab=reports & /my-research)
  console.log('📋 Seeding Supervision Reports & Reviews...');
  const reports = [
    {
      scholarId: scholar.id,
      supervisorId: supervisor.id,
      title: 'Q1 Progress Report: Distributed Prompt Cache Partitioning',
      description: 'Detailed analysis of memory footprints and TTFT across 8 GPU cluster nodes.',
      status: 'APPROVED',
      evidenceUrl: 'https://curiousbees.srmist.edu.in/reports/q1_progress_matheshwaran.pdf',
      feedback: 'Excellent work Matheshwaran. The latency results are rigorous. Proceed with submitting the extended abstract.',
    },
    {
      scholarId: scholar.id,
      supervisorId: supervisor.id,
      title: 'Literature Review on Zero-Bubble Pipeline Parallelism',
      description: 'Comprehensive study of pipeline scheduling heuristics for deep neural network training on non-uniform memory architectures.',
      status: 'APPROVED',
      evidenceUrl: 'https://curiousbees.srmist.edu.in/reports/lit_survey_parallelism.pdf',
      feedback: 'Very thorough. Incorporate the 2025 Megatron-LM updates in section 4.2 before final submission.',
    },
    {
      scholarId: scholar.id,
      supervisorId: supervisor.id,
      title: 'Mid-Year Comprehensive Benchmark & Prototype Validation',
      description: 'Empirical comparison between our proposed framework and standard vLLM baselines across 10,000 synthetic trace requests.',
      status: 'PENDING',
      evidenceUrl: 'https://curiousbees.srmist.edu.in/reports/mid_year_benchmark.pdf',
      feedback: null,
    },
  ];

  for (const r of reports) {
    const existing = await prisma.report.findFirst({
      where: { scholarId: r.scholarId, title: r.title },
    });
    if (!existing) {
      await prisma.report.create({ data: r });
    }
  }

  // 7. Populate Research Opportunities (/opportunities)
  console.log('🎯 Seeding Research Opportunities & Grants...');
  const opportunities = [
    {
      title: 'Doctoral Research Fellowship in Generative AI for Edge Hardware',
      description:
        'Funded doctoral fellowship to work on lightweight foundation models for neuromorphic and low-power silicon. Includes full tuition waiver, monthly stipend of ₹38,000 + HRA, and international conference travel grant.',
      department: 'Computer Applications',
      researchDomain: 'Artificial Intelligence & Machine Learning',
      opportunityType: 'PhD Position',
      positionsCount: 2,
      funding: 'Fully Funded',
      fundingDetails: '₹38,000/month + HRA + ₹1,00,000 Annual Contingency',
      eligibility: ['M.E./M.Tech/MCA in Computing with 75%+', 'Proficiency in PyTorch & C++', 'GATE / NET qualified preferred'],
    },
    {
      title: 'Postdoctoral Fellowship: 6G Beamforming Simulation and Open-RAN',
      description:
        'Two-year postdoctoral position in the Department of ECE investigating massive MIMO beam management and AI-driven channel estimation for 6G wireless networks.',
      department: 'Electronics & Communication Engineering',
      researchDomain: 'Wireless Communications & 6G',
      opportunityType: 'Postdoc Position',
      positionsCount: 1,
      funding: 'Fully Funded',
      fundingDetails: '₹65,000/month consolidated + Campus Housing',
      eligibility: ['Ph.D. in ECE / Telecommunications', 'Record of IEEE Transactions publications'],
    },
    {
      title: 'SRMIST Student Research Grant (SRG-2026) in Quantum Computing',
      description:
        'Seed funding for interdisciplinary teams proposing algorithms in quantum optimization, quantum chemistry simulation, or quantum error mitigation.',
      department: 'Computing Technologies',
      researchDomain: 'Quantum Information Science',
      opportunityType: 'Research Grant',
      positionsCount: 4,
      funding: 'Funded',
      fundingDetails: 'Up to ₹5,00,000 project grant for equipment and cloud quantum compute',
      eligibility: ['Full-time doctoral scholars and faculty co-investigators'],
    },
    {
      title: 'Junior Research Fellow (JRF) in Glioblastoma Targeted Nanocarriers',
      description:
        'DST-SERB sponsored project investigating peptide-conjugated polymeric nanoparticles for blood-brain barrier penetration in glioblastoma therapeutics.',
      department: 'Biotechnology',
      researchDomain: 'Bioinformatics & Nanomedicine',
      opportunityType: 'JRF Position',
      positionsCount: 1,
      funding: 'Fully Funded',
      fundingDetails: '₹31,000/month + HRA as per DST norms',
      eligibility: ['M.Sc/M.Tech in Biotechnology or Bioinformatics', 'Valid CSIR-UGC NET or GATE score'],
    },
  ];

  for (const opp of opportunities) {
    const existing = await prisma.opportunity.findFirst({
      where: { title: opp.title },
    });
    if (!existing) {
      await prisma.opportunity.create({
        data: {
          title: opp.title,
          description: opp.description,
          department: opp.department,
          departmentId: dept?.id || null,
          researchDomain: opp.researchDomain,
          opportunityType: opp.opportunityType,
          positionsCount: opp.positionsCount,
          funding: opp.funding,
          fundingDetails: opp.fundingDetails,
          eligibility: opp.eligibility,
          authorId: supervisor.id,
        },
      });
    }
  }

  // 8. Populate Nexus Collaborations (/nexus)
  console.log('🤝 Seeding CuriousNexus Collaborations...');
  let collab = await prisma.researchCollaboration.findFirst({
    where: {
      OR: [
        { requesterId: scholar.id, recipientId: supervisor.id },
        { requesterId: supervisor.id, recipientId: scholar.id },
      ],
    },
  });

  if (!collab) {
    collab = await prisma.researchCollaboration.create({
      data: {
        requesterId: scholar.id,
        recipientId: supervisor.id,
        status: CollaborationStatus.ACTIVE,
      },
    });

    const messages = [
      {
        senderId: scholar.id,
        content: 'Good morning Dr. Matheshwaran, I have completed the latency profiling for the 4-bit edge inference tests.',
      },
      {
        senderId: supervisor.id,
        content: 'Excellent Matheshwaran. Share the throughput breakdown graph in our workspace so we can review before the weekly meeting.',
      },
      {
        senderId: scholar.id,
        content: 'Uploaded! The P99 latency dropped by 34% after enabling the pipelined KV-cache prefetcher.',
      },
      {
        senderId: supervisor.id,
        content: 'Looks very promising. Let us prep the abstract for the doctoral symposium.',
      },
    ];

    for (const msg of messages) {
      await prisma.collaborationMessage.create({
        data: {
          collaborationId: collab.id,
          senderId: msg.senderId,
          content: msg.content,
        },
      });
    }
  }

  // 9. Populate Notifications (/notifications)
  console.log('🔔 Seeding Realistic Notifications...');
  const notifications = [
    {
      userId: supervisor.id,
      title: 'Milestone Progress Submitted',
      body: 'Matheshwaran R submitted "Mid-Year Comprehensive Benchmark & Prototype Validation" for your supervisory review.',
      actionUrl: '/my-scholars?tab=reports',
    },
    {
      userId: supervisor.id,
      title: 'Paper Citation Alert',
      body: 'Your publication "Energy-Efficient Consensus Algorithms" was cited in IEEE Transactions on Dependable and Secure Computing.',
      actionUrl: '/publications',
    },
    {
      userId: scholar.id,
      title: 'Report Approved by Supervisor',
      body: 'Dr. Matheshwaran approved your report "Q1 Progress Report: Distributed Prompt Cache Partitioning".',
      actionUrl: '/my-research',
    },
    {
      userId: scholar.id,
      title: 'New Workspace Announcement',
      body: 'Dr. Matheshwaran posted "Advisory Review Scheduled" in Autonomous Edge AI Research Lab.',
      actionUrl: '/workspace',
    },
    {
      userId: admin?.id || supervisor.id,
      title: 'Institutional Research Metric Update',
      body: 'SRMIST indexed 42 new Scopus/WoS publications this month across Faculty of Engineering and Technology.',
      actionUrl: '/admin/dashboard',
    },
  ];

  for (const n of notifications) {
    const existing = await prisma.notification.findFirst({
      where: { userId: n.userId, title: n.title },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          userId: n.userId,
          title: n.title,
          body: n.body,
          actionUrl: n.actionUrl,
          sentStatus: true,
          openedStatus: false,
        },
      });
    }
  }

  // 12. Seed Connected Integrations for both Supervisors and Scholars
  console.log('🔌 Seeding Connected App Integrations (Google Workspace & Zoom)...');
  const allUsersWithIntegrations = [
    supervisor,
    scholar,
    drSudha,
    drRazia,
    drJayanthi,
    gayathri,
    revathi,
    santhosh,
  ].filter(Boolean);

  for (const u of allUsersWithIntegrations) {
    if (!u) continue;
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    // Google Workspace
    await prisma.integrationConnection.upsert({
      where: {
        userId_provider: {
          userId: u.id,
          provider: IntegrationProvider.GOOGLE_WORKSPACE,
        },
      },
      create: {
        userId: u.id,
        provider: IntegrationProvider.GOOGLE_WORKSPACE,
        status: 'CONNECTED',
        accessToken: `active-google-token-${u.id}`,
        refreshToken: `refresh-google-token-${u.id}`,
        tokenExpiresAt: expiresAt,
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar.events',
        externalAccountEmail: u.email,
        connectedAt: new Date(),
      },
      update: {
        status: 'CONNECTED',
        externalAccountEmail: u.email,
      },
    });

    // Zoom Workplace
    await prisma.integrationConnection.upsert({
      where: {
        userId_provider: {
          userId: u.id,
          provider: IntegrationProvider.ZOOM_WORKPLACE,
        },
      },
      create: {
        userId: u.id,
        provider: IntegrationProvider.ZOOM_WORKPLACE,
        status: 'CONNECTED',
        accessToken: `active-zoom-token-${u.id}`,
        refreshToken: `refresh-zoom-token-${u.id}`,
        tokenExpiresAt: expiresAt,
        scopes: 'meeting:write',
        externalAccountEmail: u.email,
        connectedAt: new Date(),
      },
      update: {
        status: 'CONNECTED',
        externalAccountEmail: u.email,
      },
    });
  }

  console.log('✨ CuriousBees Comprehensive Demo Data Generation Complete!');
}

main()
  .catch((e) => {
    console.error('Error generating demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
