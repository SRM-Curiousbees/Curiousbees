import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { SRM_ORGANIZATION_DATA, RESEARCH_INTERESTS, DOMAINS_AND_TOPICS, LEGACY_DEPARTMENT_CODE_MAP } from './reference-data';
import { isEmailDomainAllowed, normalizeEmail } from '../auth/email-policy';

type Log = (message: string) => void;

/** Idempotent: campus, faculties and departments. Safe to re-run on every deploy. */
export async function seedOrganization(prisma: PrismaClient, log: Log = console.log) {
  const { campus: campusData, faculties } = SRM_ORGANIZATION_DATA;
  const campus = await prisma.campus.upsert({
    where: { code: campusData.code },
    update: { name: campusData.name, location: campusData.location, status: campusData.status },
    create: campusData,
  });

  // 1. Resolve and merge faculties
  const facultyMap: Record<string, any> = {};

  for (const item of faculties) {
    let faculty = await prisma.faculty.findUnique({ where: { name: item.name } });

    if (!faculty && item.legacyNames.length > 0) {
      for (const legacy of item.legacyNames) {
        const found = await prisma.faculty.findUnique({ where: { name: legacy } });
        if (found) {
          faculty = await prisma.faculty.update({
            where: { id: found.id },
            data: { name: item.name, campusId: campus.id },
          });
          log(`  🔄 Renamed legacy faculty "${legacy}" -> "${item.name}"`);
          break;
        }
      }
    }

    if (!faculty) {
      faculty = await prisma.faculty.create({
        data: { name: item.name, campusId: campus.id },
      });
      log(`  ✨ Created faculty: "${item.name}"`);
    } else {
      faculty = await prisma.faculty.update({
        where: { id: faculty.id },
        data: { campusId: campus.id },
      });
    }

    facultyMap[item.name] = faculty;
    facultyMap[item.code] = faculty;

    // Check for remaining legacy faculties that should be merged into this canonical faculty
    if (item.legacyNames.length > 0) {
      for (const legacy of item.legacyNames) {
        const redundant = await prisma.faculty.findUnique({ where: { name: legacy } });
        if (redundant && redundant.id !== faculty.id) {
          log(`  🔀 Merging legacy faculty "${legacy}" into canonical "${item.name}"...`);
          await prisma.department.updateMany({
            where: { facultyId: redundant.id },
            data: { facultyId: faculty.id },
          });
          await prisma.supervisorProfile.updateMany({
            where: { facultyId: redundant.id },
            data: { facultyId: faculty.id },
          });
          await prisma.scholarProfile.updateMany({
            where: { facultyId: redundant.id },
            data: { facultyId: faculty.id },
          });
          await prisma.faculty.delete({ where: { id: redundant.id } });
          log(`  ✓ Retired legacy faculty "${legacy}"`);
        }
      }
    }
  }

  // 2. Migrate legacy department codes (e.g. MCA -> CA-FLABS, CSE -> CTECH-CET)
  for (const [oldCode, newCode] of Object.entries(LEGACY_DEPARTMENT_CODE_MAP)) {
    const oldDept = await prisma.department.findUnique({ where: { code: oldCode } });
    if (oldDept) {
      const targetDeptExists = await prisma.department.findUnique({ where: { code: newCode } });
      if (!targetDeptExists) {
        await prisma.department.update({
          where: { id: oldDept.id },
          data: { code: newCode },
        });
        log(`  🔄 Migrated legacy department code "${oldCode}" -> "${newCode}"`);
      }
    }
  }

  // 3. Upsert all 85 official departments
  let departmentCount = 0;
  const officialCodes = new Set<string>();

  for (const item of faculties) {
    const faculty = facultyMap[item.name];

    for (const dept of item.departments) {
      officialCodes.add(dept.code);
      await prisma.department.upsert({
        where: { code: dept.code },
        update: {
          name: dept.name,
          facultyId: faculty.id,
          description: dept.description,
        },
        create: {
          code: dept.code,
          name: dept.name,
          facultyId: faculty.id,
          description: dept.description,
        },
      });
      departmentCount++;
    }
  }

  // 4. Align Computer Applications (CA-FLABS) and other moved departments
  const flabsFaculty = facultyMap['FLABS'] || facultyMap['Faculty of Liberal Arts & Business Studies'];
  if (flabsFaculty) {
    const caDept = await prisma.department.findUnique({ where: { code: 'CA-FLABS' } });
    if (caDept && caDept.facultyId !== flabsFaculty.id) {
      await prisma.department.update({
        where: { id: caDept.id },
        data: { facultyId: flabsFaculty.id },
      });
      await prisma.supervisorProfile.updateMany({
        where: { departmentId: caDept.id },
        data: { facultyId: flabsFaculty.id },
      });
      await prisma.scholarProfile.updateMany({
        where: { departmentId: caDept.id },
        data: { facultyId: flabsFaculty.id },
      });
    }
  }

  // 5. Clean up any obsolete empty departments
  const allDepts = await prisma.department.findMany();
  for (const d of allDepts) {
    if (!officialCodes.has(d.code)) {
      const userCount = await prisma.user.count({ where: { departmentId: d.id } });
      const oppCount = await prisma.opportunity.count({ where: { departmentId: d.id } });
      const eventCount = await prisma.event.count({ where: { departmentId: d.id } });
      if (userCount === 0 && oppCount === 0 && eventCount === 0) {
        await prisma.department.delete({ where: { id: d.id } });
        log(`  🗑 Removed obsolete unused department: ${d.name} (${d.code})`);
      }
    }
  }

  // 6. Synchronize denormalized user department and faculty strings
  const usersWithDept = await prisma.user.findMany({
    where: { departmentId: { not: null } },
    include: { departmentRef: { include: { faculty: true } } },
  });

  for (const u of usersWithDept) {
    if (u.departmentRef) {
      const expectedDept = u.departmentRef.name;
      const expectedFac = u.departmentRef.faculty.name;
      if (u.department !== expectedDept || u.faculty !== expectedFac) {
        await prisma.user.update({
          where: { id: u.id },
          data: { department: expectedDept, faculty: expectedFac },
        });
      }
    }
  }

  log(`Organisation: campus ${campus.code}, ${faculties.length} faculties, ${departmentCount} departments.`);
}

/** Idempotent: research domains, topics and the interest list used by feeds/profiles. */
export async function seedResearchTaxonomy(prisma: PrismaClient, log: Log = console.log) {
  const interestNames = new Set<string>(RESEARCH_INTERESTS);
  let topicCount = 0;

  for (const d of DOMAINS_AND_TOPICS) {
    const domain = await prisma.researchDomain.upsert({
      where: { name: d.domain },
      update: { description: d.description },
      create: { name: d.domain, description: d.description },
    });
    for (const t of d.topics) {
      await prisma.researchTopic.upsert({
        where: { domainId_name: { domainId: domain.id, name: t.name } },
        update: { description: t.description },
        create: { name: t.name, domainId: domain.id, description: t.description },
      });
      interestNames.add(t.name);
      topicCount++;
    }
  }

  for (const name of interestNames) {
    await prisma.researchInterest.upsert({ where: { name }, update: {}, create: { name } });
  }
  log(`Research taxonomy: ${DOMAINS_AND_TOPICS.length} domains, ${topicCount} topics, ${interestNames.size} interests.`);
}

/**
 * Creates the first institute admin from BOOTSTRAP_ADMIN_EMAIL so a fresh
 * database can be administered. Does nothing once any institute admin exists;
 * every later user is created through the Admin Panel.
 */
export async function bootstrapInstituteAdmin(
  prisma: PrismaClient,
  email: string | undefined,
  name: string | undefined,
  log: Log = console.log,
) {
  const existingAdmins = await prisma.user.count({ where: { role: Role.INSTITUTE_ADMIN } });
  if (existingAdmins > 0) {
    log(`Bootstrap admin: skipped (${existingAdmins} institute admin(s) already exist).`);
    return;
  }
  if (!email) {
    log('Bootstrap admin: skipped (BOOTSTRAP_ADMIN_EMAIL not set). No institute admin exists yet.');
    return;
  }

  const normalized = normalizeEmail(email);
  if (!isEmailDomainAllowed(normalized)) {
    throw new Error(`BOOTSTRAP_ADMIN_EMAIL ${normalized} is not in ALLOWED_EMAIL_DOMAINS.`);
  }

  const admin = await prisma.user.upsert({
    where: { email: normalized },
    update: { role: Role.INSTITUTE_ADMIN, status: UserStatus.ACTIVE, approved: true, suspended: false, onboardingCompleted: true },
    create: {
      email: normalized,
      name: name?.trim() || normalized.split('@')[0],
      role: Role.INSTITUTE_ADMIN,
      status: UserStatus.ACTIVE,
      approved: true,
      onboardingCompleted: true,
    },
  });
  log(`Bootstrap admin: ${admin.email} is now the first institute admin.`);
}
