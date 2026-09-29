/**
 * Production-safe seed. Run after `prisma migrate deploy`:
 *
 *   node apps/api/dist/scripts/seed-production.js
 *
 * Seeds only reference data the application needs (organisation hierarchy and
 * research taxonomy) and, on an empty directory, the first institute admin
 * from BOOTSTRAP_ADMIN_EMAIL. It never creates demo users or content and never
 * deletes anything, so it is safe to run on every deployment.
 */
import { PrismaClient } from '@prisma/client';
import { seedOrganization, seedResearchTaxonomy, bootstrapInstituteAdmin } from '../database/seed-reference';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }
  const prisma = new PrismaClient();
  try {
    console.log('Seeding production reference data...');
    await seedOrganization(prisma);
    await seedResearchTaxonomy(prisma);
    await bootstrapInstituteAdmin(prisma, process.env.BOOTSTRAP_ADMIN_EMAIL, process.env.BOOTSTRAP_ADMIN_NAME);
    console.log('Production seed completed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Production seed failed:', err?.message || err);
  process.exit(1);
});
