import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Never under NODE_ENV=test: tests must not pick up the development database.
if (process.env.NODE_ENV !== 'test') dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Overwrites accounts and affiliations: only ever against a database on this machine.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('../../../scripts/db/reset-guard').assertLocalDatabase(process.env.DATABASE_URL, 'rewrite user affiliations (prisma/backfill-organization.ts)');
import { seedOrganization } from '../src/database/seed-reference';
import { SRM_ORGANIZATION_DATA } from '../src/database/reference-data';
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Running Institutional Organization Backfill & Migration...');

  // 1 & 2. Upsert Campus, Faculties, and Departments
  await seedOrganization(prisma, console.log);
  console.log('✅ Institutional organization hierarchy verified.');

  const facultyMap: Record<string, string> = {};
  const departmentMap: Record<string, any> = {};

  const allFaculties = await prisma.faculty.findMany();
  for (const f of allFaculties) {
    facultyMap[f.name] = f.id;
  }
  const allDepts = await prisma.department.findMany();
  for (const d of allDepts) {
    departmentMap[d.code] = d;
  console.log(`✅ Verified ${Object.keys(facultyMap).length} faculties and ${allDepts.length} departments.`);

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
