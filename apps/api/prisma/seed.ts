import { PrismaClient, Role, UserStatus, RequestStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env absolutely
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { SRM_ORGANIZATION_DATA, RESEARCH_INTERESTS } from '../src/database/reference-data';

const prisma = new PrismaClient();

// Organisation hierarchy lives in src/database/reference-data.ts


async function main() {
  console.log('🌱 Starting safe, idempotent database seeding...');

  // 1. Upsert Kattankulathur Campus
  const campus = await prisma.campus.upsert({
    where: { code: SRM_ORGANIZATION_DATA.campus.code },
    update: {
      name: SRM_ORGANIZATION_DATA.campus.name,
      location: SRM_ORGANIZATION_DATA.campus.location,
      status: SRM_ORGANIZATION_DATA.campus.status,
    },
    create: {
      code: SRM_ORGANIZATION_DATA.campus.code,
      name: SRM_ORGANIZATION_DATA.campus.name,
      location: SRM_ORGANIZATION_DATA.campus.location,
      status: SRM_ORGANIZATION_DATA.campus.status,
    },
  });
  console.log(`✅ Campus verified: ${campus.name} (${campus.code})`);

  // 2. Upsert Faculties and Departments
  const facultyMap: Record<string, any> = {};
  const deptMap: Record<string, any> = {};

  for (const item of SRM_ORGANIZATION_DATA.faculties) {
    let faculty = await prisma.faculty.findUnique({ where: { name: item.name } });

    if (!faculty && item.legacyNames.length > 0) {
      for (const legacy of item.legacyNames) {
        const found = await prisma.faculty.findUnique({ where: { name: legacy } });
        if (found) {
          faculty = await prisma.faculty.update({
            where: { id: found.id },
            data: { name: item.name, campusId: campus.id },
          });
          break;
        }
      }
    }

    if (!faculty) {
      faculty = await prisma.faculty.create({
        data: {
          name: item.name,
          campusId: campus.id,
        },
      });
    } else {
      faculty = await prisma.faculty.update({
        where: { id: faculty.id },
        data: { campusId: campus.id },
      });
    }

    facultyMap[item.name] = faculty;

    for (const dept of item.departments) {
      const d = await prisma.department.upsert({
        where: { code: dept.code },
        update: {
          name: dept.name,
          facultyId: faculty.id,
          description: dept.description,
        },
        create: {
          name: dept.name,
          code: dept.code,
          facultyId: faculty.id,
          description: dept.description,
        },
      });
      deptMap[dept.code] = d;
      deptMap[dept.name] = d;
    }
  }
  console.log(`✅ Seeded ${Object.keys(facultyMap).length} faculties and ${Object.keys(deptMap).length} departments.`);

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
      facultyName: 'Faculty of Engineering & Technology',
      departmentCode: 'MCA',
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
      facultyName: 'Faculty of Engineering & Technology',
      departmentCode: 'MCA',
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
      departmentCode: 'MCA',
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
      facultyName: 'Faculty of Engineering & Technology',
      departmentCode: 'MCA',
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
      facultyName: 'Faculty of Engineering & Technology',
      departmentCode: 'MCA',
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
      facultyName: 'Faculty of Engineering & Technology',
      departmentCode: 'MCA',
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
      facultyName: 'Faculty of Engineering & Technology',
      departmentCode: 'MCA',
      bio: 'SRMIST Root Administrator for CuriousBees platform.',
      interests: [],
    },
    // Institutional Test Accounts (Requirement 21)
    {
      name: 'CuriousBees Administrator',
      email: 'maddybgmistoreog@gmail.com',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: Role.INSTITUTE_ADMIN,
      facultyName: 'Faculty of Engineering & Technology',
      departmentCode: 'MCA',
      employeeId: 'ADM-89001',
      bio: 'Institute Administrator for CuriousBees Governance & Operations.',
      interests: [],
    },
    {
      name: 'Dr. Matheshwaran (Supervisor)',
      email: 'mrmatheshwaran17@gmail.com',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      role: Role.RESEARCH_SUPERVISOR,
      facultyName: 'Faculty of Engineering & Technology',
      departmentCode: 'MCA',
      designation: 'Associate Professor / Research Supervisor',
      employeeId: 'EMP-600991',
      bio: 'Doctoral Research Supervisor focusing on Autonomous Distributed Systems, Scalable Cloud & AI.',
      interests: ['Generative AI & LLMs', '5G/6G Wireless Networks', 'VLSI System Design'],
    },
    {
      name: 'Matheshwaran R (Scholar)',
      email: 'r.matheshwaran.io@gmail.com',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      role: Role.RESEARCH_SCHOLAR,
      facultyName: 'Faculty of Engineering & Technology',
      departmentCode: 'MCA',
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
