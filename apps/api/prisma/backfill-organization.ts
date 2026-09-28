import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

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
  console.log('🚀 Running Institutional Organization Backfill & Migration...');

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
  const facultyMap: Record<string, string> = {};
  const departmentMap: Record<string, any> = {};

  for (const facData of SRM_ORGANIZATION_DATA.faculties) {
    // Check if faculty exists by canonical name or any legacy name
    let faculty = await prisma.faculty.findUnique({ where: { name: facData.name } });

    if (!faculty && facData.legacyNames.length > 0) {
      for (const legacy of facData.legacyNames) {
        const found = await prisma.faculty.findUnique({ where: { name: legacy } });
        if (found) {
          faculty = await prisma.faculty.update({
            where: { id: found.id },
            data: { name: facData.name, campusId: campus.id },
          });
          console.log(`🔄 Renamed legacy faculty "${legacy}" -> "${facData.name}"`);
          break;
        }
      }
    }

    if (!faculty) {
      faculty = await prisma.faculty.create({
        data: {
          name: facData.name,
          campusId: campus.id,
        },
      });
      console.log(`✨ Created faculty: "${facData.name}"`);
    } else {
      // Ensure campusId is attached
      faculty = await prisma.faculty.update({
        where: { id: faculty.id },
        data: { campusId: campus.id },
      });
    }

    facultyMap[facData.name] = faculty.id;

    // Upsert Departments
    for (const deptData of facData.departments) {
      const dept = await prisma.department.upsert({
        where: { code: deptData.code },
        update: {
          name: deptData.name,
          facultyId: faculty.id,
          description: deptData.description,
        },
        create: {
          code: deptData.code,
          name: deptData.name,
          facultyId: faculty.id,
          description: deptData.description,
        },
      });
      departmentMap[deptData.code] = dept;
    }
  }
  console.log(`✅ Verified ${Object.keys(facultyMap).length} faculties and ${Object.keys(departmentMap).length} departments.`);

  // 3. User Backfill & Verification
  console.log('\n📊 Auditing & Migrating User Affiliations...');
  const users = await prisma.user.findMany({
    include: {
      supervisorProfile: true,
      scholarProfile: true,
    },
  });

  let resolvedCount = 0;
  let unresolvedCount = 0;
  const unresolvedList: any[] = [];

  for (const user of users) {
    if (user.departmentId) {
      // User has relational departmentId
      const dept = await prisma.department.findUnique({
        where: { id: user.departmentId },
        include: { faculty: true },
      });

      if (dept) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            department: dept.name,
            faculty: dept.faculty.name,
          },
        });

        if (user.supervisorProfile) {
          await prisma.supervisorProfile.update({
            where: { id: user.supervisorProfile.id },
            data: {
              departmentId: dept.id,
              facultyId: dept.facultyId,
            },
          });
        }

        if (user.scholarProfile) {
          await prisma.scholarProfile.update({
            where: { id: user.scholarProfile.id },
            data: {
              departmentId: dept.id,
              facultyId: dept.facultyId,
            },
          });
        }

        resolvedCount++;
        console.log(`  ✓ Resolved user ${user.email} -> ${dept.name} (${dept.code}) [${dept.faculty.name}]`);
      } else {
        unresolvedCount++;
        unresolvedList.push({ id: user.id, email: user.email, issue: `departmentId ${user.departmentId} not found` });
      }
    } else if (user.department) {
      // User has department string but null departmentId - attempt deterministic match
      const matchedDept = await prisma.department.findFirst({
        where: {
          OR: [
            { name: { equals: user.department.trim(), mode: 'insensitive' } },
            { code: { equals: user.department.trim().toUpperCase(), mode: 'insensitive' } },
          ],
        },
        include: { faculty: true },
      });

      if (matchedDept) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            departmentId: matchedDept.id,
            department: matchedDept.name,
            faculty: matchedDept.faculty.name,
          },
        });
        resolvedCount++;
        console.log(`  ✓ Matched text user ${user.email} ("${user.department}") -> ${matchedDept.name}`);
      } else {
        // Governance / Admin accounts without an academic department
        if (user.role === 'INSTITUTE_ADMIN') {
          console.log(`  ℹ Institute Admin ${user.email} retained with governance label ("${user.department}")`);
        } else {
          unresolvedCount++;
          unresolvedList.push({ id: user.id, email: user.email, departmentString: user.department });
        }
      }
    } else {
      // User has no department at all
      console.log(`  ℹ User ${user.email} (${user.role}) has no departmental assignment.`);
    }
  }

  console.log(`\n🎉 Migration Complete! Resolved: ${resolvedCount}, Unresolved researchers: ${unresolvedCount}`);
  if (unresolvedList.length > 0) {
    console.log('Unresolved records:', JSON.stringify(unresolvedList, null, 2));
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
