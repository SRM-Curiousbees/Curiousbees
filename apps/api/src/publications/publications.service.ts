import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_AUTHOR_SELECT } from '../users/discovery';

@Injectable()
export class PublicationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: { title: string; authors: string; doi?: string; publisher?: string; year: number; status: string }) {
    return this.prisma.publication.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async findAll(userId?: string, cursor?: string, limit?: number, search?: string, departmentId?: string, facultyId?: string) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const where: any = {
      hidden: false,
      ...(userId ? { userId } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { authors: { contains: search, mode: 'insensitive' } },
        ]
      } : {}),
      ...(departmentId ? {
        user: { departmentId }
      } : facultyId ? {
        user: { departmentRef: { facultyId } }
      } : {})
    };

    return this.prisma.publication.findMany({
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where,
      include: {
        user: {
          select: PUBLIC_AUTHOR_SELECT,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const pub = await this.prisma.publication.findUnique({
      where: { id },
      include: {
        user: {
          select: PUBLIC_AUTHOR_SELECT,
        },
      },
    });
    if (!pub || pub.hidden) {
      throw new NotFoundException('Publication not found.');
    }
    return pub;
  }

  async update(
    id: string,
    userId: string,
    role: string,
    data: { title?: string; authors?: string; doi?: string; publisher?: string; year?: number; status?: string }
  ) {
    const pub = await this.findOne(id);

    if (pub.userId !== userId && role !== 'INSTITUTE_ADMIN') {
      throw new ForbiddenException('Access denied. You can only edit your own publications.');
    }

    return this.prisma.publication.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string, role: string) {
    const pub = await this.findOne(id);

    if (pub.userId !== userId && role !== 'INSTITUTE_ADMIN') {
      throw new ForbiddenException('Access denied. You can only delete your own publications.');
    }

    return this.prisma.publication.delete({
      where: { id },
    });
  }
}
