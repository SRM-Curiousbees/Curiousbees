import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus, RequestStatus } from '@prisma/client';
import { MAX_SCHOLARS_PER_SUPERVISOR } from '@curiousbees/constants';

@Injectable()
export class SupervisorsService {
  private readonly logger = new Logger(SupervisorsService.name);

  constructor(private prisma: PrismaService) {}

  async getSupervisors(departmentId?: string, facultyId?: string, search?: string) {
    let deptName: string | undefined;
    let effectiveFacultyId = facultyId;

    if (departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (dept) {
        deptName = dept.name;
        if (!effectiveFacultyId) effectiveFacultyId = dept.facultyId;
      }
    }

    const where: any = {
      role: 'RESEARCH_SUPERVISOR',
      status: 'ACTIVE',
    };

    if (departmentId) {
      where.OR = [
        { departmentId },
        { supervisorProfile: { departmentId } },
      ];
    } else if (effectiveFacultyId) {
      where.OR = [
        { supervisorProfile: { facultyId: effectiveFacultyId } },
        { departmentRef: { facultyId: effectiveFacultyId } },
      ];
    }

    if (search) {
      const searchCondition = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          searchCondition,
        ];
        delete where.OR;
      } else {
        where.OR = searchCondition.OR;
      }
    }

    const supervisors = await this.prisma.user.findMany({
      where,
      include: {
        supervisorProfile: true,
        departmentRef: {
          include: {
            faculty: {
              include: {
                campus: true,
              },
            },
          },
        },
        _count: {
          select: {
            scholars: {
              where: {
                role: 'RESEARCH_SCHOLAR',
                status: 'ACTIVE',
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    return supervisors.map(sup => {
      const currentScholars = sup._count.scholars;
      const maxScholars = sup.supervisorProfile?.maxScholars ?? MAX_SCHOLARS_PER_SUPERVISOR;
      return {
        id: sup.id,
        name: sup.name,
        email: sup.email,
        image: sup.image,
        departmentId: sup.departmentId || sup.supervisorProfile?.departmentId,
        department: sup.departmentRef?.name || sup.department,
        faculty: sup.departmentRef?.faculty?.name || sup.faculty,
        campus: sup.departmentRef?.faculty?.campus?.name || 'Kattankulathur',
        campusCode: sup.departmentRef?.faculty?.campus?.code || 'KTR',
        designation: sup.supervisorProfile?.designation || 'Faculty',
        researchArea: sup.supervisorProfile?.researchArea,
        currentScholars,
        maxScholars,
        isAtCapacity: currentScholars >= maxScholars,
      };
    });
  }

  async getPendingScholars(supervisorId: string) {
    const requests = await this.prisma.scholarSupervisorRequest.findMany({
      where: {
        supervisorId,
        status: 'PENDING',
      },
      include: {
        scholar: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            scholarProfile: true,
            createdAt: true,
          }
        }
      }
    });

    return requests.map(req => ({
      requestId: req.id,
      id: req.scholar.id,
      name: req.scholar.name,
      email: req.scholar.email,
      department: req.scholar.department,
      image: req.scholar.image,
      researchArea: req.scholar.scholarProfile?.researchArea || 'N/A',
      createdAt: req.createdAt,
    }));
  }

  async approveScholar(supervisorId: string, requestId: string) {
    const request = await this.prisma.scholarSupervisorRequest.findUnique({
      where: { id: requestId },
      include: { scholar: true }
    });

    if (!request || request.supervisorId !== supervisorId) {
      throw new BadRequestException('Pending scholar request not found.');
    }

    const supervisor = await this.prisma.user.findUnique({
      where: { id: supervisorId }
    });

    return this.prisma.$transaction(async (tx) => {
      const activeScholarCount = await tx.user.count({
        where: {
          supervisorId,
          role: 'RESEARCH_SCHOLAR',
          status: 'ACTIVE',
        }
      });
      const supProfile = await tx.supervisorProfile.findUnique({
        where: { userId: supervisorId }
      });
      const maxScholars = supProfile?.maxScholars ?? MAX_SCHOLARS_PER_SUPERVISOR;
      if (activeScholarCount >= maxScholars) {
        throw new BadRequestException(`Supervisor has reached maximum scholar capacity of ${maxScholars}.`);
      }

      // 1. Update the request status
      await tx.scholarSupervisorRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      });

      // 2. Update scholar status to ACTIVE and approved = true, and link supervisorId
      return tx.user.update({
        where: { id: request.scholarId },
        data: {
          status: 'ACTIVE',
          approved: true,
          supervisorId,
          supervisorEmail: supervisor?.email || null,
        },
      });
    });
  }

  async rejectScholar(supervisorId: string, requestId: string) {
    const request = await this.prisma.scholarSupervisorRequest.findUnique({
      where: { id: requestId },
      include: { scholar: true }
    });

    if (!request || request.supervisorId !== supervisorId) {
      throw new BadRequestException('Pending scholar request not found.');
    }

    // 1. Update request status
    await this.prisma.scholarSupervisorRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    // 2. Update scholar status to REJECTED and approved = false
    return this.prisma.user.update({
      where: { id: request.scholarId },
      data: {
        status: 'REJECTED',
        approved: false,
      },
    });
  }
}
