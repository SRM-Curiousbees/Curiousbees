import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UserStatus } from '@prisma/client';
import { AuditHelperService } from './audit-helper';
import { assertKeepsAnActiveAdmin, assertNotRootAdmin, assertNotSelf, parseRole } from './admin-safety';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private prisma: PrismaService,
    private auditHelper: AuditHelperService,
  ) {}

  async getUsers(query: {
    role?: string;
    status?: string;
    faculty?: string;
    departmentId?: string;
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role filter
    if (query.role && query.role !== 'ALL') {
      if (query.role === 'SCHOLAR' || query.role === 'RESEARCH_SCHOLAR') {
        where.role = Role.RESEARCH_SCHOLAR;
      } else if (query.role === 'SUPERVISOR' || query.role === 'RESEARCH_SUPERVISOR') {
        where.role = Role.RESEARCH_SUPERVISOR;
      } else if (query.role === 'ADMIN' || query.role === 'INSTITUTE_ADMIN') {
        where.role = Role.INSTITUTE_ADMIN;
      }
    }

    // Status filter
    if (query.status && query.status !== 'ALL') {
      if (query.status === 'ACTIVE') {
        where.status = UserStatus.ACTIVE;
        where.suspended = false;
      } else if (query.status === 'SUSPENDED') {
        where.OR = [
          { status: UserStatus.SUSPENDED },
          { suspended: true },
        ];
      } else if (query.status === 'DEACTIVATED') {
        where.status = UserStatus.DEACTIVATED;
      } else if (query.status === 'RESTRICTED') {
        where.status = UserStatus.RESTRICTED;
      } else if (query.status === 'PENDING') {
        where.status = UserStatus.PENDING_SUPERVISOR_APPROVAL;
      }
    }

    // Faculty filter
    if (query.faculty && query.faculty !== 'ALL') {
      where.OR = [
        { faculty: query.faculty },
        { departmentRef: { facultyId: query.faculty } },
        { departmentRef: { faculty: { name: query.faculty } } },
      ];
    }

    // Department filter
    if (query.departmentId && query.departmentId !== 'ALL') {
      where.departmentId = query.departmentId;
    } else if (query.department && query.department !== 'ALL') {
      where.department = query.department;
    }

    // Search filter
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { employeeId: { contains: s, mode: 'insensitive' } },
        { department: { contains: s, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortField = query.sortBy || 'createdAt';
    const sortDir = query.sortOrder === 'asc' ? 'asc' : 'desc';
    orderBy[sortField] = sortDir;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          departmentRef: {
            include: {
              faculty: {
                include: {
                  campus: true,
                },
              },
            },
          },
          supervisor: {
            select: { id: true, name: true, email: true },
          },
          scholarProfile: true,
          supervisorProfile: true,
          _count: {
            select: {
              publications: true,
              threads: true,
              scholars: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserGovernanceProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        departmentRef: {
          include: {
            faculty: {
              include: {
                campus: true,
              },
            },
          },
        },
        supervisor: {
          select: { id: true, name: true, email: true, department: true, faculty: true },
        },
        scholars: {
          select: { id: true, name: true, email: true, department: true, status: true },
        },
        scholarProfile: true,
        supervisorProfile: true,
        publications: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        workspaceMembers: {
          include: {
            workspace: true,
          },
        },
        _count: {
          select: {
            threads: true,
            comments: true,
            publications: true,
            scholars: true,
            filedReports: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Fetch recent audit events relating to this user
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { targetId: user.id },
          { actorId: user.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    return {
      user,
      auditLogs,
    };
  }

  async suspendUser(actor: any, userId: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason is required to suspend an account.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    assertNotRootAdmin(user.email, 'suspended');
    assertNotSelf(actor.id, userId, 'suspend');
    await assertKeepsAnActiveAdmin(this.prisma, user, { status: UserStatus.SUSPENDED });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.SUSPENDED,
        suspended: true,
      },
    });

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'USER_SUSPENDED',
      targetId: user.id,
      targetType: 'USER',
      category: 'ACCESS',
      severity: 'HIGH',
      details: `User ${user.email} suspended. Reason: ${reason}`,
      previousState: { status: user.status, suspended: user.suspended },
      newState: { status: UserStatus.SUSPENDED, suspended: true },
      metadata: { reason },
    });

    return updatedUser;
  }

  async reactivateUser(actor: any, userId: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason is required to reactivate an account.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    assertNotRootAdmin(user.email, 'modified or reactivated');

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        suspended: false,
      },
    });

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'USER_REACTIVATED',
      targetId: user.id,
      targetType: 'USER',
      category: 'ACCESS',
      severity: 'MEDIUM',
      details: `User ${user.email} reactivated. Reason: ${reason}`,
      previousState: { status: user.status, suspended: user.suspended },
      newState: { status: UserStatus.ACTIVE, suspended: false },
      metadata: { reason },
    });

    return updatedUser;
  }

  async deactivateUser(actor: any, userId: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason is required to deactivate an account.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    assertNotRootAdmin(user.email, 'deactivated');
    assertNotSelf(actor.id, userId, 'deactivate');
    await assertKeepsAnActiveAdmin(this.prisma, user, { status: UserStatus.DEACTIVATED });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.DEACTIVATED,
        suspended: true,
      },
    });

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'USER_DEACTIVATED',
      targetId: user.id,
      targetType: 'USER',
      category: 'ACCESS',
      severity: 'HIGH',
      details: `User ${user.email} permanently deactivated. Reason: ${reason}`,
      previousState: { status: user.status, suspended: user.suspended },
      newState: { status: UserStatus.DEACTIVATED, suspended: true },
      metadata: { reason },
    });

    return updatedUser;
  }

  async changeUserRole(actor: any, userId: string, newRole: Role, reason: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason is required to change a user role.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    assertNotRootAdmin(user.email, 'demoted or reassigned');
    newRole = parseRole(newRole);
    assertNotSelf(actor.id, userId, 'change the role of');
    await assertKeepsAnActiveAdmin(this.prisma, user, { role: newRole });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'ROLE_CHANGED',
      targetId: user.id,
      targetType: 'USER',
      category: 'ROLE',
      severity: 'HIGH',
      details: `Changed role for ${user.email} from ${user.role} to ${newRole}. Reason: ${reason}`,
      previousState: { role: user.role },
      newState: { role: newRole },
      metadata: { reason, previousRole: user.role, newRole },
    });

    return updatedUser;
  }

  async reassignSupervisor(actor: any, scholarId: string, newSupervisorId: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason is required to reassign a supervisor.');
    }

    const [scholar, newSupervisor] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: scholarId } }),
      this.prisma.user.findUnique({ where: { id: newSupervisorId } }),
    ]);

    if (!scholar) throw new NotFoundException('Scholar not found.');
    if (!newSupervisor) throw new NotFoundException('Selected supervisor not found.');

    assertNotRootAdmin(scholar.email, 'modified or reassigned');
    assertNotRootAdmin(newSupervisor.email, 'assigned as supervisor');

    if (newSupervisor.role !== Role.RESEARCH_SUPERVISOR) {
      throw new BadRequestException('Selected user is not a Research Supervisor.');
    }

    const previousSupervisorId = scholar.supervisorId;
    const previousSupervisorEmail = scholar.supervisorEmail;

    const updatedScholar = await this.prisma.user.update({
      where: { id: scholarId },
      data: {
        supervisorId: newSupervisor.id,
        supervisorEmail: newSupervisor.email,
        status: UserStatus.ACTIVE,
        approved: true,
      },
    });

    // Create institutional audit record
    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'SUPERVISOR_REASSIGNED',
      targetId: scholar.id,
      targetType: 'USER',
      category: 'RESEARCH_GOVERNANCE',
      severity: 'MEDIUM',
      details: `Reassigned supervisor for scholar ${scholar.email} to ${newSupervisor.email}. Reason: ${reason}`,
      previousState: { supervisorId: previousSupervisorId, supervisorEmail: previousSupervisorEmail },
      newState: { supervisorId: newSupervisor.id, supervisorEmail: newSupervisor.email },
      metadata: { reason, scholarId, previousSupervisorId, newSupervisorId },
    });

    // Notify scholar
    await this.prisma.notification.create({
      data: {
        userId: scholar.id,
        title: 'Institutional Supervisor Reassignment',
        body: `Your research supervisor has been institutionally updated to ${newSupervisor.name || newSupervisor.email}.`,
      },
    });

    // Notify new supervisor
    await this.prisma.notification.create({
      data: {
        userId: newSupervisor.id,
        title: 'New Scholar Assigned',
        body: `Scholar ${scholar.name || scholar.email} has been assigned under your supervision by university administration.`,
      },
    });

    return updatedScholar;
  }

  async deleteUser(actor: any, userId: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Reason is required for account deletion.');
    }

    if (actor.id === userId) {
      throw new ForbiddenException('Administrators cannot delete their own account.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    assertNotRootAdmin(user.email, 'deleted');
    await assertKeepsAnActiveAdmin(this.prisma, user, { deleted: true });

    // If supervisor, detach scholars
    await this.prisma.user.updateMany({
      where: { supervisorId: userId },
      data: { supervisorId: null },
    });

    // Delete user
    await this.prisma.user.delete({ where: { id: userId } });

    // Record immutable audit log
    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'USER_DELETED',
      targetId: userId,
      targetType: 'USER',
      category: 'USER_MANAGEMENT',
      severity: 'CRITICAL',
      details: `User "${user.name || user.email}" (${user.role}) permanently deleted. Reason: ${reason}`,
      previousState: { id: user.id, email: user.email, name: user.name, role: user.role, department: user.department },
      newState: null,
      metadata: { deletedUserId: userId, reason },
    });

    return { success: true, message: 'User permanently deleted.' };
  }

  async updateUserAffiliation(
    actor: any,
    userId: string,
    data: { facultyId: string; departmentId: string; reason?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { supervisorProfile: true, scholarProfile: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    assertNotRootAdmin(user.email, 'modified');

    if (!data.departmentId || !data.facultyId) {
      throw new BadRequestException('Both Faculty and Department selections are required.');
    }

    const dept = await this.prisma.department.findUnique({
      where: { id: data.departmentId },
      include: { faculty: { include: { campus: true } } },
    });

    if (!dept) {
      throw new BadRequestException('Selected department does not exist.');
    }

    if (dept.facultyId !== data.facultyId) {
      throw new BadRequestException('Invalid department/faculty combination: The selected department does not belong to the selected faculty.');
    }

    const previousAffiliation = {
      faculty: user.faculty,
      department: user.department,
      departmentId: user.departmentId,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Update User
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          departmentId: dept.id,
          department: dept.name,
          faculty: dept.faculty.name,
        },
        include: {
          departmentRef: {
            include: {
              faculty: {
                include: {
                  campus: true,
                },
              },
            },
          },
        },
      });

      // 2. Synchronize Profile if Supervisor or Scholar
      if (user.role === Role.RESEARCH_SUPERVISOR) {
        await tx.supervisorProfile.upsert({
          where: { userId },
          create: {
            userId,
            facultyId: dept.facultyId,
            departmentId: dept.id,
            designation: 'Supervisor',
            employeeId: user.employeeId || `EMP-${Date.now()}`,
          },
          update: {
            facultyId: dept.facultyId,
            departmentId: dept.id,
          },
        });
      } else if (user.role === Role.RESEARCH_SCHOLAR) {
        await tx.scholarProfile.upsert({
          where: { userId },
          create: {
            userId,
            facultyId: dept.facultyId,
            departmentId: dept.id,
            researchArea: 'General Research',
          },
          update: {
            facultyId: dept.facultyId,
            departmentId: dept.id,
          },
        });
      }

      return updatedUser;
    });

    // 3. Institutional Audit Log
    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'USER_AFFILIATION_UPDATED',
      targetId: user.id,
      targetType: 'USER',
      category: 'INSTITUTION',
      severity: 'MEDIUM',
      details: `Affiliation for user ${user.email} updated to Faculty "${dept.faculty.name}", Department "${dept.name}". ${data.reason ? `Reason: ${data.reason}` : ''}`.trim(),
      previousState: previousAffiliation,
      newState: {
        faculty: dept.faculty.name,
        department: dept.name,
        departmentId: dept.id,
        campus: dept.faculty.campus?.name,
      },
      metadata: { reason: data.reason },
    });

    return updated;
  }
}

