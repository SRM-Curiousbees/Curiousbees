import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus, RequestStatus, Role, ResearchStatus, ResearchStage } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../users/mail.service';
import { MAX_SCHOLARS_PER_SUPERVISOR } from '@curiousbees/constants';

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mailService: MailService,
  ) {}

  private async syncInterests(tx: any, userId: string, researchArea?: string, interests?: string[]) {
    const rawList = Array.isArray(interests) && interests.length > 0
      ? interests
      : researchArea
      ? researchArea.split(',').map(s => s.trim())
      : [];

    const cleanList = Array.from(new Set(rawList.filter(Boolean)));
    if (cleanList.length === 0) return;

    await tx.userInterest.deleteMany({ where: { userId } });

    for (const name of cleanList) {
      const interestObj = await tx.researchInterest.upsert({
        where: { name },
        update: {},
        create: { name }
      });
      await tx.userInterest.create({
        data: {
          userId,
          interestId: interestObj.id
        }
      });
    }
  }

  async onboardSupervisor(
    userId: string,
    data: {
      facultyId?: string;
      departmentId?: string;
      designation?: string;
      employeeId?: string;
      researchArea: string;
      maxScholars?: number;
    }
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { supervisorProfile: true }
    });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    // Roles are assigned by administrators; onboarding only completes the profile for that role.
    if (user.role !== Role.RESEARCH_SUPERVISOR) {
      throw new ForbiddenException('Supervisor onboarding is only available to accounts an administrator created as Research Supervisor.');
    }
    if (user.onboardingCompleted && user.departmentId) {
      throw new BadRequestException('User has already completed onboarding.');
    }

    // Prioritize admin-provisioned department, faculty, designation, employeeId
    let effectiveDepartmentId = user.departmentId || user.supervisorProfile?.departmentId || data.departmentId;

    if (!effectiveDepartmentId && user.department) {
      const foundDept = await this.prisma.department.findFirst({
        where: { name: { equals: user.department.trim(), mode: 'insensitive' } }
      });
      if (foundDept) {
        effectiveDepartmentId = foundDept.id;
      }
    }

    if (!effectiveDepartmentId) {
      throw new BadRequestException('Department selection is required.');
    }

    const dept = await this.prisma.department.findUnique({
      where: { id: effectiveDepartmentId },
      include: { faculty: { include: { campus: true } } }
    });
    if (!dept) {
      throw new BadRequestException('Invalid department selection.');
    }

    const effectiveFacultyId = user.supervisorProfile?.facultyId || data.facultyId || dept.facultyId;
    if (dept.facultyId !== effectiveFacultyId) {
      throw new BadRequestException('Invalid department/faculty combination: The selected department does not belong to the selected faculty.');
    }

    const effectiveDesignation = user.supervisorProfile?.designation || data.designation || 'Supervisor';
    const effectiveEmployeeId = user.employeeId || user.supervisorProfile?.employeeId || data.employeeId || `EMP-${Date.now()}`;

    // Verify employeeId is unique if not already set for this user
    if (!user.employeeId && !user.supervisorProfile?.employeeId && effectiveEmployeeId) {
      const existingProfile = await this.prisma.supervisorProfile.findFirst({
        where: { employeeId: effectiveEmployeeId, NOT: { userId } },
      });
      if (existingProfile) {
        throw new BadRequestException('Employee ID is already in use by another supervisor.');
      }
    }

    // Start transaction to create profile and update user
    const updated = await this.prisma.$transaction(async (tx) => {
      const profile = await tx.supervisorProfile.upsert({
        where: { userId },
        create: {
          userId,
          facultyId: effectiveFacultyId,
          departmentId: effectiveDepartmentId,
          designation: effectiveDesignation,
          employeeId: effectiveEmployeeId,
          researchArea: data.researchArea,
          maxScholars: MAX_SCHOLARS_PER_SUPERVISOR,
        },
        update: {
          facultyId: effectiveFacultyId,
          departmentId: effectiveDepartmentId,
          designation: effectiveDesignation,
          employeeId: effectiveEmployeeId,
          researchArea: data.researchArea,
          maxScholars: MAX_SCHOLARS_PER_SUPERVISOR,
        },
      });

      await this.syncInterests(tx, userId, data.researchArea, (data as any).interests);

      // Link supervisor's research areas to ResearchDomains
      if (tx.researchDomain?.findFirst) {
        const supervisorDomainList = data.researchArea.split(',').map((s) => s.trim()).filter(Boolean);
        for (const domainName of supervisorDomainList) {
          const dom = await tx.researchDomain.findFirst({
            where: { name: { equals: domainName, mode: 'insensitive' } },
          });
          if (dom && tx.userDomain?.upsert) {
            await tx.userDomain.upsert({
              where: { userId_domainId: { userId, domainId: dom.id } },
              create: { userId, domainId: dom.id },
              update: {},
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'SUPERVISOR_ONBOARDING_COMPLETED',
          details: JSON.stringify({
            facultyId: dept.facultyId,
            departmentId: dept.id,
            facultyName: dept.faculty.name,
            departmentName: dept.name,
            campus: dept.faculty.campus?.name,
          }),
        },
      });

      return tx.user.update({
        where: { id: userId },
        data: {
          onboardingCompleted: true,
          // Approval/status remain administrator decisions.
          status: user.status,
          approved: user.approved,
          employeeId: effectiveEmployeeId,
          departmentId: effectiveDepartmentId,
          department: dept.name,
          faculty: dept.faculty.name,
        },
        include: {
          supervisorProfile: true,
          departmentRef: { include: { faculty: { include: { campus: true } } } },
          interests: { include: { interest: true } },
        },
      });
    });

    return updated;
  }

  async onboardScholar(
    userId: string,
    data: {
      facultyId: string;
      departmentId: string;
      researchArea: string;
      supervisorId?: string;
      researchDomain?: string;
      researchTopic?: string;
      proposalTitle?: string;
    }
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    if (user.role !== Role.RESEARCH_SCHOLAR) {
      throw new ForbiddenException('Scholar onboarding is only available to accounts an administrator created as Research Scholar.');
    }
    if (user.onboardingCompleted && user.supervisorId) {
      throw new BadRequestException('User has already completed onboarding and has a supervisor assigned.');
    }

    // Accounts are created by administrators; a department they assigned can't be changed here.
    if (user.departmentId && data.departmentId !== user.departmentId) {
      throw new BadRequestException('Your department was set by your institute administrator. Ask them if it needs to change.');
    }

    // Verify faculty and department relationally
    const dept = await this.prisma.department.findUnique({
      where: { id: data.departmentId },
      include: { faculty: { include: { campus: true } } }
    });
    if (!dept) {
      throw new BadRequestException('Selected department not found.');
    }
    if (dept.facultyId !== data.facultyId) {
      throw new BadRequestException('Invalid department/faculty selection: The selected department does not belong to the selected faculty.');
    }

    let supervisor: any = null;
    if (data.supervisorId) {
      // Verify supervisor exists and is active/not at capacity
      supervisor = await this.prisma.user.findUnique({
        where: { id: data.supervisorId },
        include: {
          supervisorProfile: true,
          _count: {
            select: {
              scholars: {
                where: {
                  role: Role.RESEARCH_SCHOLAR,
                  status: UserStatus.ACTIVE,
                }
              }
            }
          }
        }
      });

      if (!supervisor || supervisor.role !== Role.RESEARCH_SUPERVISOR || supervisor.status !== UserStatus.ACTIVE) {
        throw new BadRequestException('Selected supervisor is not active.');
      }

      const currentScholars = supervisor._count.scholars;
      const maxScholars = supervisor.supervisorProfile?.maxScholars ?? MAX_SCHOLARS_PER_SUPERVISOR;
      if (currentScholars >= maxScholars) {
        throw new BadRequestException(`Selected supervisor has reached maximum scholar capacity of ${maxScholars}.`);
      }
    }

    const effectiveTopic = data.researchTopic?.trim() || null;
    const effectiveDomain = data.researchDomain?.trim() || data.researchArea?.trim() || null;
    const effectiveTitle = data.proposalTitle?.trim() || effectiveTopic || 'Doctoral Dissertation';

    // Start transaction to create profile, update user, and create request
    return this.prisma.$transaction(async (tx) => {
      await tx.scholarProfile.upsert({
        where: { userId },
        create: {
          userId,
          facultyId: data.facultyId,
          departmentId: data.departmentId,
          researchArea: effectiveTopic || effectiveDomain || data.researchArea,
        },
        update: {
          facultyId: data.facultyId,
          departmentId: data.departmentId,
          researchArea: effectiveTopic || effectiveDomain || data.researchArea,
        }
      });

      // Upsert scholar's ResearchProfile with specific thesis title & domain
      if (tx.researchProfile?.upsert) {
        await tx.researchProfile.upsert({
          where: { scholarId: userId },
          create: {
            scholarId: userId,
            title: effectiveTitle,
            researchArea: effectiveDomain || data.researchArea,
            status: ResearchStatus.ACTIVE,
            currentStage: ResearchStage.PROPOSAL,
          },
          update: {
            title: effectiveTitle,
            researchArea: effectiveDomain || data.researchArea,
          },
        });
      }

      // Link UserDomain and UserTopic if matching records exist
      if (effectiveDomain && tx.researchDomain?.findFirst) {
        const dom = await tx.researchDomain.findFirst({
          where: { name: { equals: effectiveDomain, mode: 'insensitive' } },
        });
        if (dom && tx.userDomain?.upsert) {
          await tx.userDomain.upsert({
            where: { userId_domainId: { userId, domainId: dom.id } },
            create: { userId, domainId: dom.id },
            update: {},
          });
        }
      }
      if (effectiveTopic && tx.researchTopic?.findFirst) {
        const top = await tx.researchTopic.findFirst({
          where: { name: { equals: effectiveTopic, mode: 'insensitive' } },
        });
        if (top && tx.userTopic?.upsert) {
          await tx.userTopic.upsert({
            where: { userId_topicId: { userId, topicId: top.id } },
            create: { userId, topicId: top.id },
            update: {},
          });
        }
      }

      await this.syncInterests(tx, userId, [effectiveDomain, effectiveTopic, data.researchArea].filter(Boolean).join(', '), (data as any).interests);

      if (data.supervisorId) {
        await tx.scholarSupervisorRequest.create({
          data: {
            scholarId: userId,
            supervisorId: data.supervisorId,
            status: RequestStatus.PENDING,
            researchDomain: effectiveDomain,
            researchTopic: effectiveTopic,
            proposalTitle: effectiveTitle,
          },
        });
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          role: Role.RESEARCH_SCHOLAR,
          onboardingCompleted: true,
          status: data.supervisorId ? UserStatus.PENDING_SUPERVISOR_APPROVAL : UserStatus.ACTIVE,
          approved: !data.supervisorId,
          departmentId: data.departmentId,
          department: dept.name,
          faculty: dept.faculty.name,
        },
        include: {
          scholarProfile: true,
          interests: { include: { interest: true } },
        },
      });

      // Trigger supervisor notification asynchronously if supervisor chosen
      if (data.supervisorId && supervisor) {
        try {
          await this.notifications.notifyScholarRegistrationSubmitted(userId, data.supervisorId);
        } catch (err) {
          console.error('Failed to notify supervisor on onboarding:', err);
        }

        const request = await tx.scholarSupervisorRequest.findFirst({
          where: { scholarId: userId, supervisorId: data.supervisorId, status: RequestStatus.PENDING },
        });
        if (request) {
          this.mailService.sendScholarSupervisionRequestAlert({
            supervisorEmail: supervisor.email,
            supervisorName: supervisor.name || 'Supervisor',
            scholarName: user.name || user.email,
            scholarEmail: user.email,
            department: dept.name,
            researchArea: data.researchArea,
            requestId: request.id,
            createdAt: request.createdAt,
          }).catch(() => {});
        }
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: data.supervisorId ? 'SCHOLAR_SUPERVISION_REQUEST_CREATED' : 'SCHOLAR_ONBOARDING_COMPLETED',
          details: JSON.stringify({
            supervisorId: data.supervisorId || null,
            facultyId: dept.facultyId,
            departmentId: dept.id,
            facultyName: dept.faculty.name,
            departmentName: dept.name,
            campus: dept.faculty.campus?.name,
          }),
        }
      });

      return updatedUser;
    });
  }

  async resetOnboarding(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    // Restricted accounts and admins are managed by administrators, not self-service resets.
    if (user.status === UserStatus.RESTRICTED || user.role === Role.INSTITUTE_ADMIN) {
      throw new BadRequestException('Onboarding cannot be reset for this account. Contact an administrator.');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: false,
        status: UserStatus.ACTIVE,
        approved: false,
        supervisorId: null,
        supervisorEmail: null,
      },
    });
  }
}
