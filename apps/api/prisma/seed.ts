import { PrismaClient, Role, UserStatus, RequestStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env absolutely
// Never under NODE_ENV=test: tests must not pick up the development database.
if (process.env.NODE_ENV !== 'test') dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Overwrites accounts and affiliations: only ever against a database on this machine.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('../../../scripts/db/reset-guard').assertLocalDatabase(process.env.DATABASE_URL, 'seed named demo accounts (prisma/seed.ts); production uses src/scripts/seed-production.ts');

import { seedOrganization } from '../src/database/seed-reference';
import { SRM_ORGANIZATION_DATA, RESEARCH_INTERESTS } from '../src/database/reference-data';

const prisma = new PrismaClient();

// Organisation hierarchy lives in src/database/reference-data.ts


async function main() {
  console.log('🌱 Starting safe, idempotent database seeding...');

  // 1 & 2. Seed Campus, Faculties, and Departments (Delegated to seedOrganization)
  await seedOrganization(prisma, console.log);

  const facultyMap: Record<string, any> = {};
  const deptMap: Record<string, any> = {};

  const allFaculties = await prisma.faculty.findMany();
  for (const f of allFaculties) {
    facultyMap[f.name] = f;
  }

  const allDepts = await prisma.department.findMany();
  for (const d of allDepts) {
    deptMap[d.code] = d;
    deptMap[d.name] = d;
  }
  console.log(`✅ Verified ${Object.keys(facultyMap).length} faculties and ${allDepts.length} departments.`);

  // 3. Create Research Interests (Idempotent)
  const interestsData = RESEARCH_INTERESTS;

  const interestsMap: Record<string, any> = {};
  for (const name of interestsData) {
    const interest = await prisma.researchInterest.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    interestsMap[name] = interest;
  }
  console.log(`✅ Created/verified ${Object.keys(interestsMap).length} research interests.`);

  // 4. Upsert Users (Faculty, Scholars, and Admins) safely
  const seedUsers = [
    {
      name: 'Dr. SUDHA M R',
      email: 'dr.sudha@srmist.edu.in',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      role: Role.RESEARCH_SUPERVISOR,
      facultyName: 'Faculty of Liberal Arts & Business Studies',
      departmentCode: 'CA-FLABS',
      designation: 'Assistant Professor grade I',
      employeeId: '600215',
      bio: 'Assistant Professor grade I. Focused on genomic sequencing algorithms, web applications, and data science.',
      interests: ['Generative AI & LLMs', 'Reinforcement Learning', 'Blockchains & Smart Contracts'],
    },
    {
      name: 'Dr. RAZIA BEGUM S',
      email: 'dr.razia@srmist.edu.in',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      role: Role.RESEARCH_SUPERVISOR,
      facultyName: 'Faculty of Liberal Arts & Business Studies',
      departmentCode: 'CA-FLABS',
      designation: 'Associate Professor',
      employeeId: '600180',
      bio: 'Associate Professor in Computer Applications. Focus on computer networks, IoT and smart infrastructure.',
      interests: ['Cancer Immunotherapy', 'Bioinformatics', 'Nanomaterials & Thin Films'],
    },
    {
      name: 'Dr. JAYANTHI D',
      email: 'dr.jayanthi@srmist.edu.in',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: Role.RESEARCH_SUPERVISOR,
      facultyName: 'Faculty of Engineering & Technology',
      departmentCode: 'ECE-CET',
      designation: 'Assistant Professor',
      employeeId: '600183',
      bio: 'Assistant Professor in ECE. Researching silicon photonics and wireless body area networks.',
      interests: ['Silicon Photonics', '5G/6G Wireless Networks', 'VLSI System Design'],
    },
    {
      name: 'GAYATHRI R',
      email: 'gr2516@srmist.edu.in',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      role: Role.RESEARCH_SCHOLAR,
      facultyName: 'Faculty of Liberal Arts & Business Studies',
      departmentCode: 'CA-FLABS',
      employeeId: '800180',
      researchArea: 'Generative AI and Cloud Architectures',
      bio: 'PhD Candidate working on parameter-efficient fine-tuning methods for cloud environments.',
      interests: ['Generative AI & LLMs', 'Reinforcement Learning'],
    },
    {
      name: 'SANTHOSHKUMAR S',
      email: 'santhosh.s@srmist.edu.in',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      role: Role.RESEARCH_SCHOLAR,
      facultyName: 'Faculty of Liberal Arts & Business Studies',
      departmentCode: 'CA-FLABS',
      employeeId: '800217',
      researchArea: 'Bioinformatics and genomic target sequence analysis',
      bio: 'PhD Scholar researching nano-carriers in bioinformatics.',
      interests: ['Bioinformatics', 'Cancer Immunotherapy', 'Nanomaterials & Thin Films'],
    },
    {
      name: 'REVATHI M',
      email: 'rm9040@srmist.edu.in',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      role: Role.RESEARCH_SCHOLAR,
      facultyName: 'Faculty of Liberal Arts & Business Studies',
      departmentCode: 'CA-FLABS',
      employeeId: '800237',
      researchArea: 'Cryptography and distributed ledger systems',
      bio: 'Research scholar focusing on zero knowledge proof verification.',
      interests: ['Blockchains & Smart Contracts', 'VLSI System Design'],
    },
    {
      name: 'Curiousbees',
      email: 'srmcuriousbees@gmail.com',
      image: 'https://lh3.googleusercontent.com/a/ACg8ocLyDIHFe7iTqEvN7tEbBWueG5lliIQdj-h6W0kcBD_teR0QyA=s96-c',
      role: Role.INSTITUTE_ADMIN,
      facultyName: 'Faculty of Liberal Arts & Business Studies',
      departmentCode: 'CA-FLABS',
      bio: 'SRMIST Root Administrator for CuriousBees platform.',
      interests: [],
    },
    // Institutional Test Accounts (Requirement 21)
    {
      name: 'CuriousBees Administrator',
      email: 'maddybgmistoreog@gmail.com',
      image: null,
      role: Role.INSTITUTE_ADMIN,
      facultyName: 'Faculty of Liberal Arts & Business Studies',
      departmentCode: 'CA-FLABS',
      employeeId: 'ADM-89001',
      bio: 'Institute Administrator for CuriousBees Governance & Operations.',
      interests: [],
    },
    {
      name: 'Dr. Matheshwaran',
      email: 'mrmatheshwaran17@gmail.com',
      image: null,
      role: Role.RESEARCH_SUPERVISOR,
      facultyName: 'Faculty of Liberal Arts & Business Studies',
      departmentCode: 'CA-FLABS',
      designation: 'Associate Professor / Research Supervisor',
      employeeId: 'EMP-600991',
      bio: 'Research Supervisor and Associate Professor focusing on Autonomous Distributed Systems, Scalable Cloud & AI.',
      interests: ['Generative AI & LLMs', '5G/6G Wireless Networks', 'VLSI System Design'],
    },
    {
      name: 'Matheshwaran R',
      email: 'r.matheshwaran.io@gmail.com',
      image: null,
      role: Role.RESEARCH_SCHOLAR,
      facultyName: 'Faculty of Liberal Arts & Business Studies',
      departmentCode: 'CA-FLABS',
      employeeId: 'SCH-800991',
      researchArea: 'Autonomous Distributed Computing and AI Workload Optimization',
      bio: 'Doctoral Research Scholar researching parameter-efficient LLMs in distributed environments.',
      interests: ['Generative AI & LLMs', 'Quantum Computing'],
      supervisorEmail: 'mrmatheshwaran17@gmail.com',
    },
  ];

  // First pass: upsert all users
  for (const u of seedUsers) {
    const deptRef = deptMap[u.departmentCode];
    const facultyRef = facultyMap[u.facultyName];

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        ...(u.image ? { image: u.image } : {}),
        role: u.role,
        employeeId: u.employeeId || null,
        department: deptRef ? deptRef.name : null,
        departmentId: deptRef ? deptRef.id : null,
        faculty: facultyRef ? facultyRef.name : null,
        bio: u.bio,
        approved: true,
        status: UserStatus.ACTIVE,
        onboardingCompleted: true,
        ...(u.role === Role.INSTITUTE_ADMIN ? { supervisorId: null, supervisorEmail: null } : {}),
      },
      create: {
        name: u.name,
        email: u.email,
        image: u.image,
        role: u.role,
        employeeId: u.employeeId || null,
        department: deptRef ? deptRef.name : null,
        departmentId: deptRef ? deptRef.id : null,
        faculty: facultyRef ? facultyRef.name : null,
        bio: u.bio,
        approved: true,
        status: UserStatus.ACTIVE,
        onboardingCompleted: true,
      },
    });

    if (u.role === Role.RESEARCH_SUPERVISOR && facultyRef && deptRef) {
      await prisma.supervisorProfile.upsert({
        where: { userId: user.id },
        update: {
          facultyId: facultyRef.id,
          departmentId: deptRef.id,
          designation: u.designation || 'Faculty Member',
          employeeId: u.employeeId || `EMP-${user.id.substring(0, 6)}`,
          maxScholars: 5,
        },
        create: {
          userId: user.id,
          facultyId: facultyRef.id,
          departmentId: deptRef.id,
          designation: u.designation || 'Faculty Member',
          employeeId: u.employeeId || `EMP-${user.id.substring(0, 6)}`,
          maxScholars: 5,
        },
      });
    } else if (u.role === Role.RESEARCH_SCHOLAR && facultyRef && deptRef) {
      await prisma.scholarProfile.upsert({
        where: { userId: user.id },
        update: {
          facultyId: facultyRef.id,
          departmentId: deptRef.id,
          researchArea: (u as any).researchArea || 'Computer Science and Engineering',
        },
        create: {
          userId: user.id,
          facultyId: facultyRef.id,
          departmentId: deptRef.id,
          researchArea: (u as any).researchArea || 'Computer Science and Engineering',
        },
      });
    }

    if (u.interests && u.interests.length > 0) {
      for (const interestName of u.interests) {
        const intObj = interestsMap[interestName];
        if (intObj) {
          await prisma.userInterest.upsert({
            where: {
              userId_interestId: {
                userId: user.id,
                interestId: intObj.id,
              },
            },
            update: {},
            create: {
              userId: user.id,
              interestId: intObj.id,
            },
          });
        }
      }
    }
  }

  // Second pass: link scholar supervisors
  for (const u of seedUsers) {
    if (u.role === Role.RESEARCH_SCHOLAR && (u as any).supervisorEmail) {
      const supervisor = await prisma.user.findUnique({
        where: { email: (u as any).supervisorEmail },
      });
      if (supervisor) {
        const scholarUser = await prisma.user.update({
          where: { email: u.email },
          data: {
            supervisorId: supervisor.id,
            supervisorEmail: supervisor.email,
          },
        });

        // Ensure approved request record exists for portal views
        const existingReq = await prisma.scholarSupervisorRequest.findFirst({
          where: {
            scholarId: scholarUser.id,
            supervisorId: supervisor.id,
          },
        });

        if (!existingReq) {
          await prisma.scholarSupervisorRequest.create({
            data: {
              scholarId: scholarUser.id,
              supervisorId: supervisor.id,
              status: RequestStatus.APPROVED,
              researchDomain: 'Computer Science & Engineering',
              researchTopic: 'Autonomous Distributed Computing and AI Workload Optimization',
              proposalTitle: 'Energy-Efficient Distributed Consensus Mechanisms for Scalable Computing',
              message: 'Doctoral research supervision request under Dr. Matheshwaran.',
              respondedAt: new Date(),
            },
          });
        }
      }
    }
  }

  console.log('✅ Safely seeded users and affiliations without data loss.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
