import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { DOMAINS_AND_TOPICS } from '../src/database/reference-data';

const prisma = new PrismaClient();

// Research taxonomy lives in src/database/reference-data.ts

async function main() {
  console.log('Seeding Research Domains and Topics...');
  for (const d of DOMAINS_AND_TOPICS) {
    const domainRecord = await prisma.researchDomain.upsert({
      where: { name: d.domain },
      create: { name: d.domain, description: d.description },
      update: { description: d.description },
    });

    for (const t of d.topics) {
      await prisma.researchTopic.upsert({
        where: {
          domainId_name: {
            domainId: domainRecord.id,
            name: t.name,
          },
        },
        create: {
          name: t.name,
          domainId: domainRecord.id,
          description: t.description,
        },
        update: {
          description: t.description,
        },
      });

      // Also ensure it exists as a ResearchInterest for backward-compatibility
      await prisma.researchInterest.upsert({
        where: { name: t.name },
        create: { name: t.name },
        update: {},
      });
    }
  }

  // Link existing users to matching topics/domains based on their interests
  const users = await prisma.user.findMany({
    include: {
      interests: { include: { interest: true } },
      supervisorProfile: true,
      scholarProfile: true,
    },
  });

  const allTopics = await prisma.researchTopic.findMany({ include: { domain: true } });

  for (const user of users) {
    const userInterestNames = user.interests.map((i) => i.interest.name.toLowerCase());
    const userArea = (user.supervisorProfile?.researchArea || user.scholarProfile?.researchArea || user.bio || '').toLowerCase();

    for (const topic of allTopics) {
      const matchTopic = userInterestNames.some((ui) => ui.includes(topic.name.toLowerCase()) || topic.name.toLowerCase().includes(ui)) ||
                         userArea.includes(topic.name.toLowerCase());
      const matchDomain = userArea.includes(topic.domain.name.toLowerCase());

      if (matchTopic) {
        await prisma.userTopic.upsert({
          where: { userId_topicId: { userId: user.id, topicId: topic.id } },
          create: { userId: user.id, topicId: topic.id },
          update: {},
        }).catch(() => {});

        await prisma.userDomain.upsert({
          where: { userId_domainId: { userId: user.id, domainId: topic.domain.id } },
          create: { userId: user.id, domainId: topic.domain.id },
          update: {},
        }).catch(() => {});
      } else if (matchDomain) {
        await prisma.userDomain.upsert({
          where: { userId_domainId: { userId: user.id, domainId: topic.domain.id } },
          create: { userId: user.id, domainId: topic.domain.id },
          update: {},
        }).catch(() => {});
      }
    }
  }

  console.log('✅ Seeded Research Domains, Topics, and User Links successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
