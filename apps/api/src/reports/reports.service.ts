import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(scholarId: string, data: { title: string; description?: string; evidenceUrl?: string; supervisorId?: string }) {
    // A report always goes to the scholar's own assigned supervisor; the client can't choose.
    const scholar = await this.prisma.user.findUnique({
      where: { id: scholarId },
      select: { role: true, supervisorId: true },
    });
    if (!scholar || (scholar.role !== 'RESEARCH_SCHOLAR' && (scholar.role as string) !== 'SCHOLAR')) {
      throw new ForbiddenException('Only research scholars submit progress reports.');
    }
    if (!scholar.supervisorId) {
      throw new BadRequestException('You need an assigned supervisor before you can submit progress reports.');
    }
    if (data.supervisorId && data.supervisorId !== scholar.supervisorId) {
      throw new ForbiddenException('Progress reports can only be sent to your own supervisor.');
    }

    const title = (data.title || '').trim();
    if (title.length < 3 || title.length > 200) {
      throw new BadRequestException('Give the report a title of 3 to 200 characters.');
    }
    const description = data.description?.trim() || undefined;
    if (description && description.length > 5000) {
      throw new BadRequestException('Keep the summary under 5,000 characters.');
    }
    const evidenceUrl = data.evidenceUrl?.trim() || undefined;
    if (evidenceUrl && (!/^https?:\/\/\S+$/i.test(evidenceUrl) || evidenceUrl.length > 2048)) {
      throw new BadRequestException('The evidence link must be an http(s) URL.');
    }

    return this.prisma.report.create({
      data: {
        title,
        description,
        evidenceUrl,
        status: 'PENDING',
        scholarId,
        supervisorId: scholar.supervisorId,
      },
      include: {
        scholar: {
          select: { id: true, name: true, email: true },
        },
        supervisor: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAll(userId: string, role: string) {
    if (role === 'SCHOLAR' || role === 'RESEARCH_SCHOLAR') {
      return this.prisma.report.findMany({
        where: { scholarId: userId },
        include: {
          supervisor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'SUPERVISOR' || role === 'RESEARCH_SUPERVISOR') {
      return this.prisma.report.findMany({
        where: { supervisorId: userId },
        include: {
          scholar: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'ADMIN' || role === 'INSTITUTE_ADMIN') {
      return this.prisma.report.findMany({
        include: {
          scholar: {
            select: { id: true, name: true, email: true, department: true },
          },
          supervisor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    return [];
  }

  async findOne(id: string, userId: string, role: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        scholar: {
          select: { id: true, name: true, email: true, department: true },
        },
        supervisor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    if (
      report.scholarId !== userId &&
      report.supervisorId !== userId &&
      role !== 'ADMIN' &&
      role !== 'INSTITUTE_ADMIN'
    ) {
      throw new ForbiddenException('Access denied. You cannot view this report.');
    }

    return report;
  }

  async review(id: string, supervisorId: string, data: { status: string; feedback?: string }) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    if (report.supervisorId !== supervisorId) {
      throw new ForbiddenException('Access denied. Only the assigned supervisor can review this report.');
    }

    return this.prisma.report.update({
      where: { id },
      data: {
        status: data.status,
        feedback: data.feedback,
      },
      include: {
        scholar: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
