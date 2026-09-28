import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResearchDomainsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.researchDomain.findMany({
      include: {
        topics: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.researchDomain.findUnique({
      where: { id },
      include: {
        topics: true,
      },
    });
  }

  async getTopics(domainId?: string) {
    return this.prisma.researchTopic.findMany({
      where: domainId ? { domainId } : undefined,
      include: {
        domain: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}
