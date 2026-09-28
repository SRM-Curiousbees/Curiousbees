import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env absolutely
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

const SRM_ORGANIZATION_DATA = {
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
  const interestsData = [
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
      name: 'CuriousBees Admin',
      email: 'admin@srmist.edu.in',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: Role.INSTITUTE_ADMIN,
      facultyName: 'Faculty of Engineering & Technology',
      departmentCode: 'MCA',
      bio: 'SRMIST System Administrator for CuriousBees platform.',
      interests: [],
    },
  ];

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
