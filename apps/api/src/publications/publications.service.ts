import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            faculty: true,
            departmentRef: {
              select: {
                id: true,
                name: true,
                code: true,
                faculty: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
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
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    if (!pub) {
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

    // Only owner, supervisor, or admin can edit
    if (pub.userId !== userId && role !== 'SUPERVISOR' && role !== 'INSTITUTE_ADMIN') {
      throw new ForbiddenException('Access denied. You cannot edit this publication.');
    }

    return this.prisma.publication.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string, role: string) {
    const pub = await this.findOne(id);

    // Only owner, supervisor, or admin can delete
    if (pub.userId !== userId && role !== 'SUPERVISOR' && role !== 'INSTITUTE_ADMIN') {
      throw new ForbiddenException('Access denied. You cannot delete this publication.');
    }

    return this.prisma.publication.delete({
      where: { id },
    });
  }
}
