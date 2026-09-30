import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileInput } from '@curiousbees/types';
import { UpdateProfileSchema } from '@curiousbees/shared-utils';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from './mail.service';
import { Role, UserStatus } from '@prisma/client';
import { ROOT_ADMIN_EMAIL } from '../auth/email-policy';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        interests: {
          include: {
            interest: true,
          },
        },
        externalLinks: {
          orderBy: { createdAt: 'asc' },
        },
        departmentRef: {
          include: {
            faculty: {
              include: {
                campus: true,
              },
            },
          },
        },
        supervisorProfile: {
          include: {
            department: true,
            faculty: true,
          },
        },
        scholarProfile: {
          include: {
            department: true,
            faculty: true,
          },
        },
        researchProfile: {
          include: {
            milestones: { orderBy: { dueDate: 'asc' } },
            activities: { take: 10, orderBy: { createdAt: 'desc' } },
          },
        },
        publications: {
          orderBy: { year: 'desc' },
        },
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            role: true,
            supervisorProfile: {
              select: { designation: true, researchArea: true },
            },
          },
        },
        scholars: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            employeeId: true,
            role: true,
            scholarProfile: true,
            researchProfile: true,
          },
        },
        collaborationsRequested: {
          where: { status: 'ACTIVE' },
          include: {
            recipient: { select: { id: true, name: true, image: true, department: true, role: true } },
          },
        },
        collaborationsReceived: {
          where: { status: 'ACTIVE' },
          include: {
            requester: { select: { id: true, name: true, image: true, department: true, role: true } },
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    // Validate with shared Zod schema
    const parsed = UpdateProfileSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors[0].message);
    }

    const { name, department, departmentId, bio, interests, image } = parsed.data;

    let resolvedDept: any = null;
    if (departmentId) {
      resolvedDept = await this.prisma.department.findUnique({
        where: { id: departmentId },
        include: { faculty: { include: { campus: true } } },
      });
      if (!resolvedDept) {
        throw new BadRequestException('Selected department not found.');
      }
    } else if (department && department.trim()) {
      // Deterministic lookup for legacy strings or codes
      resolvedDept = await this.prisma.department.findFirst({
        where: {
          OR: [
            { name: { equals: department.trim(), mode: 'insensitive' } },
            { code: { equals: department.trim().toUpperCase(), mode: 'insensitive' } },
          ],
        },
        include: { faculty: { include: { campus: true } } },
      });
      if (!resolvedDept) {
        throw new BadRequestException(`Invalid department "${department}". Free-text entry is disabled. Please select a valid academic department.`);
      }
    }

    const updateData: any = {
      ...(name && { name }),
      ...(bio !== undefined && { bio }),
      ...(image !== undefined && { image }),
    };

    if (resolvedDept) {
      updateData.departmentId = resolvedDept.id;
      updateData.department = resolvedDept.name;
      updateData.faculty = resolvedDept.faculty.name;
    }

    // Update user base fields
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    if (resolvedDept) {
      // Synchronize SupervisorProfile and ScholarProfile
      await this.prisma.supervisorProfile.updateMany({
        where: { userId },
        data: {
          departmentId: resolvedDept.id,
          facultyId: resolvedDept.facultyId,
        },
      });

      await this.prisma.scholarProfile.updateMany({
        where: { userId },
        data: {
          departmentId: resolvedDept.id,
          facultyId: resolvedDept.facultyId,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'USER_AFFILIATION_UPDATED',
          details: JSON.stringify({
            departmentId: resolvedDept.id,
            departmentName: resolvedDept.name,
            facultyId: resolvedDept.facultyId,
            facultyName: resolvedDept.faculty.name,
            campus: resolvedDept.faculty.campus?.name,
          }),
        },
      });
    }

    // If interests are provided, sync them
    if (interests) {
      // 1. Delete all existing user interests
      await this.prisma.userInterest.deleteMany({
        where: { userId }
      });

      // 2. Add new user interests (upsert research interest if it doesn't exist)
      for (const interestName of interests) {
        const cleanedName = interestName.trim();
        if (cleanedName.length === 0) continue;

        const interestObj = await this.prisma.researchInterest.upsert({
          where: { name: cleanedName },
          update: {},
          create: { name: cleanedName }
        });

        await this.prisma.userInterest.create({
          data: {
            userId,
            interestId: interestObj.id
          }
        });
      }
    }

    return this.getProfile(userId);
  }

  async getCollaborators(userId: string, search?: string, department?: string) {
    const requester = await this.prisma.user.findUnique({ 
      where: { id: userId }, 
      include: { interests: true } 
    });
    if (!requester) throw new BadRequestException('User not found');

    const requesterInterestIds = requester.interests.map((i: any) => i.interestId);

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        role: { in: ['RESEARCH_SCHOLAR', 'RESEARCH_SUPERVISOR'] },
        NOT: { name: { contains: 'admin', mode: 'insensitive' } },
        ...(requesterInterestIds.length > 0 && {
          interests: {
            some: {
              interestId: { in: requesterInterestIds }
            }
          }
        }),
        ...(department && { department }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { bio: { contains: search, mode: 'insensitive' } },
            {
              interests: {
                some: {
                  interest: {
                    name: { contains: search, mode: 'insensitive' }
                  }
                }
              }
            }
          ]
        })
      },
      include: {
        interests: {
          include: {
            interest: true
          }
        }
      },
      take: 20
    });

    const connections = await this.prisma.researchConnection.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { receiverId: userId }
        ]
      }
    });

    return users.map(user => {
      const conn = connections.find(c => 
        (c.requesterId === userId && c.receiverId === user.id) ||
        (c.receiverId === userId && c.requesterId === user.id)
      );
      return {
        ...user,
        connectionStatus: conn ? conn.status : 'NONE'
      };
    });
  }

  async toggleConnection(requesterId: string, receiverId: string) {
    const existing = await this.prisma.researchConnection.findFirst({
      where: {
        OR: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId }
        ]
      }
    });

    if (existing) {
      await this.prisma.researchConnection.delete({ where: { id: existing.id } });
      return { status: 'connect' };
    } else {
      await this.prisma.researchConnection.create({
        data: { requesterId, receiverId, status: 'PENDING' }
      });
      return { status: 'pending' };
    }
  }

  async getAllInterests() {
    return this.prisma.researchInterest.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async requestSupervisor(scholarId: string, supervisorId: string) {
    // Verify supervisor exists and is Faculty
    const supervisor = await this.prisma.user.findUnique({
      where: { id: supervisorId }
    });
    if (!supervisor || supervisor.role !== Role.RESEARCH_SUPERVISOR) {
      throw new BadRequestException('Selected supervisor must be a registered faculty member.');
    }

    return this.prisma.user.update({
      where: { id: scholarId },
      data: { supervisorId, supervisorEmail: supervisor.email, approved: false }
    });
  }

  async getApprovals(supervisorId: string) {
    return this.prisma.user.findMany({
      where: {
        supervisorId,
        approved: false,
        role: Role.RESEARCH_SCHOLAR
      },
      include: {
        interests: {
          include: {
            interest: true
          }
        }
      }
    });
  }

  async approveScholar(supervisorId: string, scholarId: string) {
    const scholar = await this.prisma.user.findFirst({
      where: {
        id: scholarId,
        supervisorId
      }
    });

    if (!scholar) {
      throw new BadRequestException('Scholar mapping request not found for this supervisor.');
    }
    if (scholar.email?.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException(`The permanent root administrator (${ROOT_ADMIN_EMAIL}) cannot be modified.`);
    }

    // Approve the scholar
    const approvedUser = await this.prisma.user.update({
      where: { id: scholarId },
      data: { 
        approved: true,
        status: UserStatus.ACTIVE,
        approvedBy: supervisorId,
        approvedAt: new Date()
      }
    });

    // Write an audit log entry
    await this.prisma.auditLog.create({
      data: {
        userId: supervisorId,
        action: 'APPROVE_SCHOLAR',
        details: `Supervisor approved scholar ${scholar.name || scholar.email} (${scholarId})`
      }
    });

    // Trigger notification
    await this.notificationsService.notifyScholarApproved(scholarId, supervisorId);

    return approvedUser;
  }

  async declineScholar(supervisorId: string, scholarId: string) {
    const scholar = await this.prisma.user.findFirst({
      where: {
        id: scholarId,
        supervisorId
      }
    });

    if (!scholar) {
      throw new BadRequestException('Scholar mapping request not found for this supervisor.');
    }
    if (scholar.email?.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException(`The permanent root administrator (${ROOT_ADMIN_EMAIL}) cannot be modified.`);
    }

    // Reject the scholar
    const declined = await this.prisma.user.update({
      where: { id: scholarId },
      data: { approved: false, status: UserStatus.REJECTED }
    });

    // Write an audit log entry
    await this.prisma.auditLog.create({
      data: {
        userId: supervisorId,
        action: 'DECLINE_SCHOLAR',
        details: `Supervisor declined scholar ${scholar.name || scholar.email} (${scholarId})`
      }
    });

    // Trigger notification
    await this.notificationsService.notifyScholarRejected(scholarId, supervisorId);

    return declined;
  }

  async getAllUsers(adminId: string, limit?: number, page?: number, search?: string, roleFilter?: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== Role.INSTITUTE_ADMIN) {
      throw new ForbiddenException('Only administrators can access this system management API.');
    }

    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const skip = Math.max((Number(page) || 1) - 1, 0) * take;

    const where: any = {
      ...(roleFilter && { role: roleFilter as Role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } },
        ]
      })
    };

    return this.prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateUserRole(adminId: string, targetUserId: string, role: 'SUPERVISOR' | 'SCHOLAR' | 'INSTITUTE_ADMIN' | 'ADMIN') {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== Role.INSTITUTE_ADMIN) {
      throw new ForbiddenException('Only administrators can change user roles.');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new BadRequestException('User not found.');
    if (targetUser.email?.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException(`The permanent root administrator (${ROOT_ADMIN_EMAIL}) cannot be demoted or modified.`);
    }

    let prismaRole: Role;
    if (role === 'SUPERVISOR' || (role as any) === 'RESEARCH_SUPERVISOR') prismaRole = Role.RESEARCH_SUPERVISOR;
    else if (role === 'SCHOLAR' || (role as any) === 'RESEARCH_SCHOLAR') prismaRole = Role.RESEARCH_SCHOLAR;
    else prismaRole = Role.INSTITUTE_ADMIN;

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { 
        role: prismaRole,
        approved: prismaRole === Role.RESEARCH_SUPERVISOR || prismaRole === Role.INSTITUTE_ADMIN ? true : undefined
      }
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_USER_ROLE',
        details: `Admin changed role of user ${updated.email} to ${prismaRole}`
      }
    });

    return updated;
  }

  async getAuditLogs(adminId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== Role.INSTITUTE_ADMIN) {
      throw new ForbiddenException('Only administrators can view audit logs.');
    }

    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  async getSupervisors() {
    return this.prisma.user.findMany({
      where: {
        role: Role.RESEARCH_SUPERVISOR,
        NOT: { name: { contains: 'admin', mode: 'insensitive' } },
        approved: true,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        image: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getMyScholars(supervisorId: string) {
    return this.prisma.user.findMany({
      where: {
        supervisorId,
        role: Role.RESEARCH_SCHOLAR,
        approved: true,
      },
      include: {
        interests: {
          include: { interest: true },
        },
        publications: true,
        submittedReports: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async suspendUser(adminId: string, targetUserId: string, suspended: boolean) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== Role.INSTITUTE_ADMIN) {
      throw new ForbiddenException('Only administrators can suspend or unsuspend users.');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new BadRequestException('User not found.');
    if (targetUser.email?.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException(`The permanent root administrator (${ROOT_ADMIN_EMAIL}) cannot be suspended or modified.`);
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { suspended },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: suspended ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
        details: `Admin ${suspended ? 'suspended' : 'unsuspended'} user ${updated.email}`,
      },
    });

    return updated;
  }

  /**
   * Roles are assigned by administrators. Self-service onboarding/registration
   * may only confirm the role already on the user's record, never change it.
   */
  private assertSelfServiceRoleMatches(currentRole: Role, requested: string) {
    const requestedRole =
      requested === 'SCHOLAR' ? Role.RESEARCH_SCHOLAR : requested === 'SUPERVISOR' ? Role.RESEARCH_SUPERVISOR : null;
    if (!requestedRole) {
      throw new BadRequestException('Invalid role selection.');
    }
    if (requestedRole !== currentRole) {
      throw new ForbiddenException('Your role is assigned by an administrator and cannot be changed during onboarding.');
    }
  }

  async completeOnboarding(
    userId: string,
    payload: { role: 'SCHOLAR' | 'SUPERVISOR'; supervisorId?: string }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User has already completed onboarding.');
    }
    this.assertSelfServiceRoleMatches(user.role, payload.role);

    let status: UserStatus = UserStatus.PENDING_SUPERVISOR_APPROVAL;
    let supervisorEmail = null;

    if (payload.role === 'SCHOLAR') {
      if (!payload.supervisorId) {
        throw new BadRequestException('Research Scholars must select a supervisor.');
      }
      const supervisor = await this.prisma.user.findUnique({ where: { id: payload.supervisorId } });
      if (!supervisor || supervisor.role !== Role.RESEARCH_SUPERVISOR) {
        throw new BadRequestException('Invalid supervisor selected.');
      }
      status = UserStatus.PENDING_SUPERVISOR_APPROVAL;
      supervisorEmail = supervisor.email;
    } else if (payload.role === 'SUPERVISOR') {
      // Supervisor approval is an administrator decision; onboarding never grants it.
      status = user.status;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status,
        approved: payload.role === 'SUPERVISOR' ? user.approved : false,
        supervisorId: payload.role === 'SCHOLAR' ? payload.supervisorId : null,
        supervisorEmail
      }
    });

    return updated;
  }

  async approveSupervisor(adminId: string, supervisorId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== Role.INSTITUTE_ADMIN) {
      throw new ForbiddenException('Only administrators can approve supervisors.');
    }

    const supervisor = await this.prisma.user.findUnique({ where: { id: supervisorId } });
    if (!supervisor || supervisor.role !== Role.RESEARCH_SUPERVISOR) {
      throw new BadRequestException('User is not a Research Supervisor.');
    }
    if (supervisor.email?.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException(`The permanent root administrator (${ROOT_ADMIN_EMAIL}) cannot be modified.`);
    }

    const approvedUser = await this.prisma.user.update({
      where: { id: supervisorId },
      data: { 
        approved: true,
        status: UserStatus.ACTIVE,
        approvedBy: adminId,
        approvedAt: new Date()
      }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'APPROVE_SUPERVISOR',
        details: `Admin approved supervisor ${supervisor.name || supervisor.email} (${supervisorId})`
      }
    });

    // Trigger notification
    await this.notificationsService.notifySupervisorApproved(supervisorId, adminId);

    return approvedUser;
  }

  async declineSupervisor(adminId: string, supervisorId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== Role.INSTITUTE_ADMIN) {
      throw new ForbiddenException('Only administrators can decline supervisors.');
    }

    const supervisor = await this.prisma.user.findUnique({ where: { id: supervisorId } });
    if (!supervisor || supervisor.role !== Role.RESEARCH_SUPERVISOR) {
      throw new BadRequestException('User is not a Research Supervisor.');
    }
    if (supervisor.email?.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException(`The permanent root administrator (${ROOT_ADMIN_EMAIL}) cannot be modified.`);
    }

    const declined = await this.prisma.user.update({
      where: { id: supervisorId },
      data: { 
        approved: false,
        status: UserStatus.REJECTED,
      }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'DECLINE_SUPERVISOR',
        details: `Admin declined supervisor ${supervisor.name || supervisor.email} (${supervisorId})`
      }
    });

    // Trigger notification
    await this.notificationsService.notifySupervisorRejected(supervisorId, adminId);

    return declined;
  }

  async register(userId: string, input: any) {
    console.log(`[BACKEND TRACE] register() called with userId=${userId}`);
    console.log(`[BACKEND TRACE] register() input payload:`, JSON.stringify(input));
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('User profile not found in database.');
    }

    const email = user.email.toLowerCase();
    const { name, role, departmentId, supervisorId, employeeId, faculty } = input;
    this.assertSelfServiceRoleMatches(user.role, role);

    // Verify department exists
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!department) {
      throw new BadRequestException('Selected department does not exist.');
    }

    let status: UserStatus = UserStatus.PENDING_SUPERVISOR_APPROVAL;
    let supervisorEmail = null;

    if (role === 'SCHOLAR') {
      if (!employeeId) {
        throw new BadRequestException('Research Scholars must provide a Registration Number.');
      }
      if (!supervisorId) {
        throw new BadRequestException('Research Scholars must select a research supervisor.');
      }
      const supervisor = await this.prisma.user.findUnique({
        where: { id: supervisorId },
      });
      if (!supervisor || supervisor.role !== Role.RESEARCH_SUPERVISOR) {
        throw new BadRequestException('Selected research supervisor is invalid.');
      }
      if (supervisor.status !== UserStatus.ACTIVE) {
        throw new BadRequestException('Selected research supervisor is not active.');
      }
      supervisorEmail = supervisor.email;
      status = UserStatus.PENDING_SUPERVISOR_APPROVAL;
    } else if (role === 'SUPERVISOR') {
      if (!employeeId) {
        throw new BadRequestException('Research Supervisors must provide an Employee ID.');
      }
      // Keep the administrator-controlled status; self-registration never activates a supervisor.
      status = user.status;
    } else {
      throw new BadRequestException('Invalid registration role.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name,
        departmentId,
        department: department.name,
        faculty: faculty || null,
        supervisorId: role === 'SCHOLAR' ? supervisorId : null,
        supervisorEmail,
        employeeId: employeeId || null,
        status,
        approved: role === 'SUPERVISOR' ? user.approved : false,
      },
    });

    console.log(`[BACKEND TRACE] User database sync completed for ${email}. Status assigned: ${status}`);

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_REGISTER',
        details: `User ${email} registered as ${role}. Status set to ${status}.`,
      },
    });

    // Trigger notification
    if (role === 'SCHOLAR' && supervisorId) {
      await this.notificationsService.notifyScholarRegistrationSubmitted(userId, supervisorId);
    }

    return updatedUser;
  }

  async getPendingSupervisors(adminId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== Role.INSTITUTE_ADMIN) {
      throw new ForbiddenException('Only administrators can access pending supervisor requests.');
    }
    return this.prisma.user.findMany({
      where: {
        role: Role.RESEARCH_SUPERVISOR,
        status: UserStatus.PENDING_SUPERVISOR_APPROVAL,
        approved: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- RESEARCHER NETWORK (FOLLOW) ---

  async getResearchers(userId: string, query: { 
    q?: string; 
    role?: string; 
    department?: string; 
    departmentId?: string;
    facultyId?: string;
    campusId?: string;
    interest?: string; 
    page?: number; 
    limit?: number 
  }) {
    const { q, role, department, departmentId, facultyId, campusId, interest, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      NOT: { name: { contains: 'admin', mode: 'insensitive' } }
    };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
        { departmentRef: { name: { contains: q, mode: 'insensitive' } } },
        { departmentRef: { faculty: { name: { contains: q, mode: 'insensitive' } } } },
        { bio: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    } else {
      where.role = { in: ['RESEARCH_SUPERVISOR', 'RESEARCH_SCHOLAR'] };
    }

    if (departmentId) {
      where.departmentId = departmentId;
    } else if (facultyId) {
      where.departmentRef = { facultyId };
    } else if (campusId) {
      where.departmentRef = { faculty: { campusId } };
    } else if (department) {
      where.OR = [
        { departmentId: department },
        { department: { equals: department, mode: 'insensitive' } },
        { departmentRef: { name: { equals: department, mode: 'insensitive' } } },
        { departmentRef: { code: { equals: department.toUpperCase(), mode: 'insensitive' } } },
      ];
    }

    if (interest) {
      where.interests = {
        some: {
          interest: {
            name: { equals: interest, mode: 'insensitive' }
          }
        }
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          role: true,
          departmentId: true,
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
                  campus: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                    },
                  },
                },
              },
            },
          },
          bio: true,
          image: true,
          interests: { include: { interest: true } },
          userDomains: { include: { domain: true } },
          userTopics: { include: { topic: true } },
          supervisorProfile: true,
          _count: {
            select: {
              scholars: {
                where: {
                  role: Role.RESEARCH_SCHOLAR,
                  status: UserStatus.ACTIVE,
                },
              },
            },
          },
          followers: { where: { followerId: userId }, select: { id: true, notificationsEnabled: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({ where }),
    ]);

    // get current user profile, domains, topics, and interests to compute alignment
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        departmentId: true,
        department: true,
        interests: { include: { interest: true } },
        userDomains: { include: { domain: true } },
        userTopics: { include: { topic: true } },
      }
    });

    const myInterests = currentUser?.interests.map(i => i.interest.name.toLowerCase()) || [];
    const myDomains = currentUser?.userDomains.map(d => d.domain.name.toLowerCase()) || [];
    const myTopics = currentUser?.userTopics.map(t => t.topic.name.toLowerCase()) || [];
    const myDeptId = currentUser?.departmentId;
    const myDept = currentUser?.department?.toLowerCase() || '';

    const items = users.map(user => {
      const userInterests = user.interests.map(i => i.interest.name);
      const userDomains = user.userDomains.map(d => d.domain.name);
      const userTopics = user.userTopics.map(t => t.topic.name);

      const sharedInterests = userInterests.filter(i => myInterests.includes(i.toLowerCase()));
      const sharedDomains = userDomains.filter(d => myDomains.includes(d.toLowerCase()));
      const sharedTopics = userTopics.filter(t => myTopics.includes(t.toLowerCase()));

      // Calculate explainable alignment score (0-100)
      let score = 20; // baseline connection
      if ((myDeptId && user.departmentId && myDeptId === user.departmentId) || 
          (myDept && user.department && myDept === user.department.toLowerCase())) {
        score += 20;
      }
      if (sharedDomains.length > 0) {
        score += Math.min(30, sharedDomains.length * 20);
      }
      if (sharedTopics.length > 0) {
        score += Math.min(30, sharedTopics.length * 15);
      }
      if (sharedInterests.length > 0) {
        score += Math.min(15, sharedInterests.length * 5);
      }
      const alignmentScore = Math.min(98, score);

      const maxScholars = user.supervisorProfile?.maxScholars ?? 8;
      const currentScholars = user._count?.scholars ?? 0;
      const isAtCapacity = currentScholars >= maxScholars;
      const capacityRemaining = Math.max(0, maxScholars - currentScholars);

      const followRec = user.followers[0];
      const combinedShared = Array.from(new Set([...sharedTopics, ...sharedDomains, ...sharedInterests]));

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        department: user.departmentRef?.name || user.department,
        faculty: user.departmentRef?.faculty?.name || user.faculty,
        campus: user.departmentRef?.faculty?.campus?.name || null,
        departmentRef: user.departmentRef,
        bio: user.bio,
        image: user.image,
        designation: user.supervisorProfile?.designation || (user.role === Role.RESEARCH_SUPERVISOR ? 'Research Supervisor' : 'Research Scholar'),
        researchArea: user.supervisorProfile?.researchArea || user.bio,
        researchInterests: userInterests,
        researchDomains: userDomains,
        researchTopics: userTopics,
        currentScholars,
        maxScholars,
        isAtCapacity,
        capacityRemaining,
        alignmentScore,
        isFollowing: !!followRec,
        notificationsEnabled: followRec ? followRec.notificationsEnabled : false,
        sharedInterestCount: combinedShared.length,
        sharedInterests: combinedShared,
        sharedTopics,
        sharedDomains,
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!targetUser) {
      throw new BadRequestException('User not found');
    }

    try {
      await this.prisma.userFollow.upsert({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        },
        create: {
          followerId,
          followingId,
          notificationsEnabled: true
        },
        update: {
          notificationsEnabled: true
        }
      });
    } catch (e) {
      // Ignore if already following
    }

    return { success: true };
  }

  async unfollowUser(followerId: string, followingId: string) {
    await this.prisma.userFollow.deleteMany({
      where: {
        followerId,
        followingId
      }
    });

    return { success: true };
  }

  async setFollowNotifications(followerId: string, followingId: string, enabled: boolean) {
    await this.prisma.userFollow.updateMany({
      where: {
        followerId,
        followingId
      },
      data: {
        notificationsEnabled: enabled
      }
    });

    return { success: true, enabled };
  }

  async getFollowStatus(userId: string, targetId: string) {
    const [followRecord, followersCount, followingCount] = await Promise.all([
      this.prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetId
          }
        }
      }),
      this.prisma.userFollow.count({ where: { followingId: targetId } }),
      this.prisma.userFollow.count({ where: { followerId: targetId } }),
    ]);

    return {
      isFollowing: !!followRecord,
      notificationsEnabled: followRecord ? followRecord.notificationsEnabled : false,
      followersCount,
      followingCount
    };
  }

  async getFollowers(targetId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [followers, total] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { followingId: targetId },
        skip,
        take: limit,
        include: {
          follower: {
            select: { id: true, name: true, role: true, department: true, image: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.userFollow.count({ where: { followingId: targetId } })
    ]);

    return {
      items: followers.map(f => f.follower),
      pagination: { page, limit, total }
    };
  }

  async getFollowing(targetId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [following, total] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { followerId: targetId },
        skip,
        take: limit,
        include: {
          following: {
            select: { id: true, name: true, role: true, department: true, image: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.userFollow.count({ where: { followerId: targetId } })
    ]);

    return {
      items: following.map(f => f.following),
      pagination: { page, limit, total }
    };
  }

  // --- DOMAIN FOLLOW ---
  async followDomain(userId: string, domain: string) {
    const cleanDomain = domain.trim();
    if (!cleanDomain) throw new BadRequestException('Invalid domain');

    try {
      await this.prisma.domainFollow.create({
        data: { userId, domain: cleanDomain }
      });
    } catch (e) {
      // Ignore unique constraint error if already followed
    }

    return { success: true, domain: cleanDomain };
  }

  async unfollowDomain(userId: string, domain: string) {
    const cleanDomain = domain.trim();
    await this.prisma.domainFollow.deleteMany({
      where: { userId, domain: cleanDomain }
    });

    return { success: true, domain: cleanDomain };
  }

  async getFollowedDomains(userId: string) {
    const records = await this.prisma.domainFollow.findMany({
      where: { userId },
      select: { domain: true }
    });
    return records.map(r => r.domain);
  }

  // --- TOPIC / HASHTAG FOLLOW ---
  async followTopic(userId: string, topic: string) {
    const cleanTopic = topic.trim().replace(/^#/, '');
    if (!cleanTopic) throw new BadRequestException('Invalid topic');

    try {
      await this.prisma.topicFollow.create({
        data: { userId, topic: cleanTopic }
      });
    } catch (e) {
      // Ignore unique constraint error if already followed
    }

    return { success: true, topic: cleanTopic };
  }

  async unfollowTopic(userId: string, topic: string) {
    const cleanTopic = topic.trim().replace(/^#/, '');
    await this.prisma.topicFollow.deleteMany({
      where: { userId, topic: cleanTopic }
    });

    return { success: true, topic: cleanTopic };
  }

  async getFollowedTopics(userId: string) {
    const records = await this.prisma.topicFollow.findMany({
      where: { userId },
      select: { topic: true }
    });
    return records.map(r => r.topic);
  }

  // --- COMPREHENSIVE USER FOLLOW STATE ---
  async getUserFollowState(userId: string) {
    const [userFollows, domainFollows, topicFollows] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { followerId: userId },
        select: { followingId: true }
      }),
      this.prisma.domainFollow.findMany({
        where: { userId },
        select: { domain: true }
      }),
      this.prisma.topicFollow.findMany({
        where: { userId },
        select: { topic: true }
      })
    ]);

    return {
      followedUserIds: userFollows.map(f => f.followingId),
      followedDomains: domainFollows.map(d => d.domain),
      followedTopics: topicFollows.map(t => t.topic)
    };
  }

  // ─── EXTERNAL RESEARCH LINKS METHODS ──────────────────────────────────────
  async getExternalLinks(userId: string) {
    return this.prisma.researcherExternalLink.findMany({
      where: { userId, isVisible: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addExternalLink(userId: string, platform: string, label?: string, url?: string) {
    if (!url || !url.trim()) {
      throw new BadRequestException('A valid URL is required.');
    }
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      throw new BadRequestException('URL must start with http:// or https://');
    }

    const cleanPlatform = platform.trim().toUpperCase();

    // Check for existing link for same platform
    const existing = await this.prisma.researcherExternalLink.findUnique({
      where: {
        userId_platform: {
          userId,
          platform: cleanPlatform,
        },
      },
    });

    if (existing) {
      return this.prisma.researcherExternalLink.update({
        where: { id: existing.id },
        data: {
          label: label || null,
          url: cleanUrl,
          isVisible: true,
        },
      });
    }

    return this.prisma.researcherExternalLink.create({
      data: {
        userId,
        platform: cleanPlatform,
        label: label || null,
        url: cleanUrl,
        isVisible: true,
      },
    });
  }

  async updateExternalLink(
    userId: string,
    linkId: string,
    label?: string,
    url?: string,
    isVisible?: boolean,
  ) {
    const existing = await this.prisma.researcherExternalLink.findFirst({
      where: { id: linkId, userId },
    });

    if (!existing) {
      throw new BadRequestException('External link record not found.');
    }

    const updateData: any = {};
    if (label !== undefined) updateData.label = label;
    if (url !== undefined) {
      const cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        throw new BadRequestException('URL must start with http:// or https://');
      }
      updateData.url = cleanUrl;
    }
    if (isVisible !== undefined) updateData.isVisible = isVisible;

    return this.prisma.researcherExternalLink.update({
      where: { id: linkId },
      data: updateData,
    });
  }

  async deleteExternalLink(userId: string, linkId: string) {
    const existing = await this.prisma.researcherExternalLink.findFirst({
      where: { id: linkId, userId },
    });

    if (!existing) {
      throw new BadRequestException('External link record not found.');
    }

    await this.prisma.researcherExternalLink.delete({
      where: { id: linkId },
    });

    return { success: true };
  }
}
