import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FacultiesService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; campusId?: string }) {
    const existing = await this.prisma.faculty.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictException('Faculty with this name already exists.');
    }

    if (data.campusId) {
      const campus = await this.prisma.campus.findUnique({ where: { id: data.campusId } });
      if (!campus) throw new NotFoundException('Selected campus not found.');
    }

    return this.prisma.faculty.create({
      data: {
        name: data.name,
        campusId: data.campusId || null,
      },
      include: { campus: true },
    });
  }

  async findAll(campusId?: string) {
    return this.prisma.faculty.findMany({
      where: campusId ? { campusId } : {},
      include: {
        campus: true,
        _count: {
          select: { departments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id },
      include: {
        campus: true,
        departments: true,
      },
    });
    if (!faculty) {
      throw new NotFoundException('Faculty not found.');
    }
    return faculty;
  }

  async update(id: string, data: { name?: string; campusId?: string }) {
    const faculty = await this.findOne(id);

    if (data.name) {
      const existingName = await this.prisma.faculty.findFirst({
        where: { name: data.name, id: { not: id } },
      });
      if (existingName) {
        throw new ConflictException('Another faculty with this name already exists.');
      }
    }

    if (data.campusId) {
      const campus = await this.prisma.campus.findUnique({ where: { id: data.campusId } });
      if (!campus) throw new NotFoundException('Selected campus not found.');
    }

    const updated = await this.prisma.faculty.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.campusId !== undefined && { campusId: data.campusId || null }),
      },
      include: { campus: true },
    });

    if (data.name && data.name !== faculty.name) {
      const depts = await this.prisma.department.findMany({ where: { facultyId: id } });
      const deptIds = depts.map(d => d.id);
      if (deptIds.length > 0) {
        await this.prisma.user.updateMany({
          where: { departmentId: { in: deptIds } },
          data: { faculty: data.name },
        });
      }
    }

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    const deptCount = await this.prisma.department.count({ where: { facultyId: id } });
    if (deptCount > 0) {
      throw new ConflictException(`Cannot delete faculty: ${deptCount} departments exist under it.`);
    }

    return this.prisma.faculty.delete({
      where: { id },
    });
  }
}
