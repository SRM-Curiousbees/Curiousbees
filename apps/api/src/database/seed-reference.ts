import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { SRM_ORGANIZATION_DATA, RESEARCH_INTERESTS, DOMAINS_AND_TOPICS } from './reference-data';
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

  let departmentCount = 0;
  for (const item of faculties) {
    const faculty = await prisma.faculty.upsert({
      where: { name: item.name },
      update: { campusId: campus.id },
      create: { name: item.name, campusId: campus.id },
    });
    for (const dept of item.departments) {
      await prisma.department.upsert({
        where: { code: dept.code },
        update: { name: dept.name, facultyId: faculty.id, description: dept.description },
        create: { code: dept.code, name: dept.name, facultyId: faculty.id, description: dept.description },
      });
      departmentCount++;
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
