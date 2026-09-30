import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestStatus, UserStatus, Role } from '@prisma/client';
import { MailService } from '../users/mail.service';
import { MAX_SCHOLARS_PER_SUPERVISOR } from '@curiousbees/constants';

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async createRequest(
    scholarId: string,
    supervisorId: string,
    message?: string,
    researchContext?: {
      researchDomain?: string;
      researchTopic?: string;
      proposalTitle?: string;
    }
  ) {
    if (!supervisorId) {
      throw new BadRequestException('Supervisor ID is required.');
    }

    if (scholarId === supervisorId) {
      throw new BadRequestException('You cannot request yourself as a supervisor.');
    }

    const scholar = await this.prisma.user.findUnique({
      where: { id: scholarId },
      include: { scholarProfile: true }
    });

    if (!scholar || scholar.role !== Role.RESEARCH_SCHOLAR) {
      throw new ForbiddenException('Only Research Scholars can create supervisor requests.');
    }

    // Check if scholar already has an assigned active supervisor
    if (scholar.supervisorId && scholar.approved) {
      throw new ConflictException('You already have an assigned and approved research supervisor.');
    }

    // Verify supervisor
    const supervisor = await this.prisma.user.findUnique({
      where: { id: supervisorId },
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

    if (!supervisor || supervisor.role !== Role.RESEARCH_SUPERVISOR) {
      throw new NotFoundException('Selected user is not a valid Research Supervisor.');
    }

    if (supervisor.suspended) {
      throw new BadRequestException('Selected supervisor is currently not available.');
    }

    const currentScholars = supervisor._count.scholars;
    const maxScholars = supervisor.supervisorProfile?.maxScholars ?? MAX_SCHOLARS_PER_SUPERVISOR;
    if (currentScholars >= maxScholars) {
      throw new BadRequestException(`Selected supervisor has reached the maximum capacity of ${maxScholars} scholars.`);
    }

    // Check for existing pending request for this scholar
    const existingPending = await this.prisma.scholarSupervisorRequest.findFirst({
      where: {
        scholarId,
        status: RequestStatus.PENDING,
      },
      include: { supervisor: { select: { name: true } } }
    });

    if (existingPending) {
      throw new ConflictException(
        `You already have a pending supervisor request for Dr. ${existingPending.supervisor?.name || 'a supervisor'}. Please wait for their review or cancel your current request.`
      );
    }

    const req = await this.prisma.$transaction(async (tx) => {
      const createdReq = await tx.scholarSupervisorRequest.create({
        data: {
          scholarId,
          supervisorId,
          message: message?.trim() || null,
          researchDomain: researchContext?.researchDomain?.trim() || null,
          researchTopic: researchContext?.researchTopic?.trim() || null,
          proposalTitle: researchContext?.proposalTitle?.trim() || null,
          status: RequestStatus.PENDING,
        }
      });

      // Update scholar status to pending approval
      await tx.user.update({
        where: { id: scholarId },
        data: {
          status: UserStatus.PENDING_SUPERVISOR_APPROVAL,
          approved: false,
        }
      });

      return createdReq;
    });

    // Trigger Supervisor Email Alert via Brevo REST API
    this.mailService.sendScholarSupervisionRequestAlert({
      supervisorEmail: supervisor.email,
      supervisorName: supervisor.name || 'Faculty Member',
      scholarName: scholar.name || scholar.email,
      scholarEmail: scholar.email,
      department: scholar.department || 'SRMIST',
      campus: scholar.faculty || 'SRMIST Kattankulathur',
      researchArea: scholar.scholarProfile?.researchArea || scholar.bio || 'General Research',
      message: message?.trim() || null,
      requestId: req.id,
      createdAt: req.createdAt,
    }).then(async (emailRes) => {
      const emailAction = emailRes.status === 'SENT' ? 'SUPERVISION_REQUEST_EMAIL_SENT' : 'SUPERVISION_REQUEST_EMAIL_FAILED';
      await this.prisma.auditLog.create({
        data: {
          userId: scholarId,
          action: emailAction,
          details: JSON.stringify({ requestId: req.id, supervisorEmail: supervisor.email, status: emailRes.status, error: emailRes.error }),
        }
      }).catch(() => {});
    }).catch(() => {});

    // Audit Log for request creation
    await this.prisma.auditLog.create({
      data: {
        userId: scholarId,
        action: 'SUPERVISION_REQUEST_CREATED',
        details: JSON.stringify({ requestId: req.id, supervisorId, scholarId }),
      }
    }).catch(() => {});

    return req;
  }

  async getRequests(userId: string, role: Role) {
    if (role === Role.INSTITUTE_ADMIN) {
      return this.prisma.scholarSupervisorRequest.findMany({
        include: {
          scholar: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              faculty: true,
              departmentId: true,
              departmentRef: {
                select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } },
              },
              image: true,
              scholarProfile: true,
            },
          },
          supervisor: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              faculty: true,
              departmentId: true,
              departmentRef: {
                select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } },
              },
              image: true,
              supervisorProfile: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (role === Role.RESEARCH_SUPERVISOR) {
      return this.prisma.scholarSupervisorRequest.findMany({
        where: { supervisorId: userId },
        include: {
          scholar: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              faculty: true,
              departmentId: true,
              departmentRef: {
                select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } },
              },
              image: true,
              bio: true,
              scholarProfile: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (role === Role.RESEARCH_SCHOLAR) {
      return this.prisma.scholarSupervisorRequest.findMany({
        where: { scholarId: userId },
        include: {
          supervisor: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              faculty: true,
              departmentId: true,
              departmentRef: {
                select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } },
              },
              image: true,
              bio: true,
              supervisorProfile: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    throw new ForbiddenException('Invalid role context.');
  }

  async getRequestById(userId: string, role: Role, requestId: string) {
    const request = await this.prisma.scholarSupervisorRequest.findUnique({
      where: { id: requestId },
      include: {
        scholar: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            faculty: true,
            image: true,
            bio: true,
            employeeId: true,
            status: true,
            approved: true,
            scholarProfile: true,
          }
        },
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            faculty: true,
            image: true,
            supervisorProfile: true,
          }
        }
      }
    });

    if (!request) {
      throw new NotFoundException('Supervision request not found.');
    }

    // Security Check: User must be the scholar, supervisor, or Institute Admin
    if (role !== Role.INSTITUTE_ADMIN && request.scholarId !== userId && request.supervisorId !== userId) {
      throw new ForbiddenException('You are not authorized to view this supervision request.');
    }

    return request;
  }

  async approveRequest(supervisorId: string, requestId: string) {
    const request = await this.prisma.scholarSupervisorRequest.findUnique({
      where: { id: requestId },
      include: { scholar: true }
    });

    if (!request) {
      throw new NotFoundException('Supervision request not found.');
    }

    if (request.supervisorId !== supervisorId) {
      throw new ForbiddenException('You are not authorized to approve this request.');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Request cannot be approved because it is already ${request.status.toLowerCase()}.`);
    }

    const supervisor = await this.prisma.user.findUnique({
      where: { id: supervisorId }
    });

    const updatedReq = await this.prisma.$transaction(async (tx) => {
      // 1. Ensure supervisor capacity is not exceeded
      const activeScholarCount = await tx.user.count({
        where: {
          supervisorId,
          role: Role.RESEARCH_SCHOLAR,
          status: UserStatus.ACTIVE,
        }
      });
      const supProfile = await tx.supervisorProfile.findUnique({
        where: { userId: supervisorId }
      });
      const maxScholars = supProfile?.maxScholars ?? MAX_SCHOLARS_PER_SUPERVISOR;
      if (activeScholarCount >= maxScholars) {
        throw new BadRequestException(`Supervisor has reached maximum scholar capacity of ${maxScholars}.`);
      }

      // 2. Double check scholar does not already have an approved supervisor
      const currentScholarState = await tx.user.findUnique({
        where: { id: request.scholarId },
        select: { supervisorId: true, approved: true }
      });
      if (currentScholarState?.supervisorId && currentScholarState.approved) {
        throw new ConflictException('This scholar is already assigned to another supervisor.');
      }

      // 3. Update request status to APPROVED
      const req = await tx.scholarSupervisorRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.APPROVED,
          respondedAt: new Date(),
        },
      });

      // 4. Update scholar user status to ACTIVE, approved = true, link supervisorId
      await tx.user.update({
        where: { id: request.scholarId },
        data: {
          status: UserStatus.ACTIVE,
          approved: true,
          supervisorId,
          supervisorEmail: supervisor?.email || null,
        },
      });

      // 5. Synchronize scholar's research profile and topic from the approved proposal
      if (request.proposalTitle || request.researchTopic || request.researchDomain) {
        const approvedTopic = request.researchTopic || null;
        const approvedDomain = request.researchDomain || null;
        const approvedTitle = request.proposalTitle || approvedTopic || 'Doctoral Dissertation';

        await tx.researchProfile.upsert({
          where: { scholarId: request.scholarId },
          create: {
            scholarId: request.scholarId,
            title: approvedTitle,
            researchArea: approvedDomain || approvedTopic || 'Doctoral Research',
            status: 'ACTIVE',
            currentStage: 'PROPOSAL',
          },
          update: {
            title: approvedTitle,
            researchArea: approvedDomain || approvedTopic || undefined,
          },
        });

        if (approvedTopic) {
          const top = await tx.researchTopic.findFirst({
            where: { name: { equals: approvedTopic, mode: 'insensitive' } },
          });
          if (top) {
            await tx.userTopic.upsert({
              where: { userId_topicId: { userId: request.scholarId, topicId: top.id } },
              create: { userId: request.scholarId, topicId: top.id },
              update: {},
            });
          }
        }
      }

      return req;
    });

    // Send Scholar Approval Email via Brevo REST API
    if (request.scholar?.email) {
      this.mailService.sendScholarSupervisionApprovedAlert({
        scholarEmail: request.scholar.email,
        scholarName: request.scholar.name || request.scholar.email,
        supervisorName: supervisor?.name || 'Your Research Supervisor',
        department: supervisor?.department || 'SRMIST',
      }).then(async (emailRes) => {
        const emailAction = emailRes.status === 'SENT' ? 'SUPERVISION_ACCEPTED_EMAIL_SENT' : 'SUPERVISION_ACCEPTED_EMAIL_FAILED';
        await this.prisma.auditLog.create({
          data: {
            userId: supervisorId,
            action: emailAction,
            details: JSON.stringify({ requestId, scholarEmail: request.scholar?.email, status: emailRes.status, error: emailRes.error }),
          }
        }).catch(() => {});
      }).catch(() => {});
    }

    // Audit Logging
    await this.prisma.auditLog.create({
      data: {
        userId: supervisorId,
        action: 'SUPERVISION_REQUEST_ACCEPTED',
        details: JSON.stringify({ requestId, scholarId: request.scholarId, supervisorId }),
      }
    }).catch(() => {});

    return updatedReq;
  }

  async rejectRequest(supervisorId: string, requestId: string, rejectionReason?: string) {
    const request = await this.prisma.scholarSupervisorRequest.findUnique({
      where: { id: requestId },
      include: { scholar: true }
    });

    if (!request) {
      throw new NotFoundException('Supervision request not found.');
    }

    if (request.supervisorId !== supervisorId) {
      throw new ForbiddenException('You are not authorized to reject this request.');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Request cannot be rejected because it is already ${request.status.toLowerCase()}.`);
    }

    const supervisor = await this.prisma.user.findUnique({
      where: { id: supervisorId }
    });

    const updatedReq = await this.prisma.$transaction(async (tx) => {
      // 1. Update request status
      const req = await tx.scholarSupervisorRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.REJECTED,
          rejectionReason: rejectionReason?.trim() || null,
          respondedAt: new Date(),
        },
      });

      // 2. Allow scholar to choose another supervisor (keep status neutral ACTIVE or unapproved)
      await tx.user.update({
        where: { id: request.scholarId },
        data: {
          status: UserStatus.ACTIVE,
          approved: false,
          supervisorId: null,
          supervisorEmail: null,
        },
      });

      return req;
    });

    // Send Scholar Rejection Email via Brevo REST API
    if (request.scholar?.email) {
      this.mailService.sendScholarSupervisionRejectedAlert({
        scholarEmail: request.scholar.email,
        scholarName: request.scholar.name || request.scholar.email,
        supervisorName: supervisor?.name || 'Research Supervisor',
        rejectionReason: rejectionReason?.trim() || null,
      }).then(async (emailRes) => {
        const emailAction = emailRes.status === 'SENT' ? 'SUPERVISION_REJECTED_EMAIL_SENT' : 'SUPERVISION_REJECTED_EMAIL_FAILED';
        await this.prisma.auditLog.create({
          data: {
            userId: supervisorId,
            action: emailAction,
            details: JSON.stringify({ requestId, scholarEmail: request.scholar?.email, status: emailRes.status, error: emailRes.error }),
          }
        }).catch(() => {});
      }).catch(() => {});
    }

    // Audit Logging
    await this.prisma.auditLog.create({
      data: {
        userId: supervisorId,
        action: 'SUPERVISION_REQUEST_REJECTED',
        details: JSON.stringify({ requestId, scholarId: request.scholarId, supervisorId, rejectionReason }),
      }
    }).catch(() => {});

    return updatedReq;
  }

  async cancelRequest(scholarId: string, requestId: string) {
    const request = await this.prisma.scholarSupervisorRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('Supervision request not found.');
    }

    if (request.scholarId !== scholarId) {
      throw new ForbiddenException('You are not authorized to cancel this request.');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled.');
    }

    const updatedReq = await this.prisma.$transaction(async (tx) => {
      const req = await tx.scholarSupervisorRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.REJECTED,
          rejectionReason: 'Cancelled by scholar',
          respondedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: scholarId },
        data: {
          status: UserStatus.ACTIVE,
          approved: false,
          supervisorId: null,
          supervisorEmail: null,
          onboardingCompleted: false,
        },
      });

      return req;
    });

    // Audit Logging
    await this.prisma.auditLog.create({
      data: {
        userId: scholarId,
        action: 'SUPERVISION_REQUEST_CANCELLED',
        details: JSON.stringify({ requestId, scholarId }),
      }
    }).catch(() => {});

    return updatedReq;
  }

  async reassignScholar(actorUserId: string, actorRole: string, scholarId: string, newSupervisorId: string, notes?: string) {
    const scholar = await this.prisma.user.findUnique({
      where: { id: scholarId }
    });
    if (!scholar) {
      throw new NotFoundException('Scholar user not found.');
    }

    if (actorRole !== Role.INSTITUTE_ADMIN && scholar.supervisorId !== actorUserId) {
      throw new ForbiddenException('Only the current supervisor or Institute Admin can reassign this scholar.');
    }

    const newSupervisor = await this.prisma.user.findUnique({
      where: { id: newSupervisorId }
    });
    if (!newSupervisor || newSupervisor.role !== Role.RESEARCH_SUPERVISOR || !newSupervisor.approved) {
      throw new BadRequestException('Target new supervisor is invalid or inactive.');
    }

    if (newSupervisor.id === scholar.supervisorId) {
      throw new BadRequestException('Scholar is already assigned to this supervisor.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedScholar = await tx.user.update({
        where: { id: scholarId },
        data: {
          supervisorId: newSupervisor.id,
          supervisorEmail: newSupervisor.email,
          approved: true,
          status: UserStatus.ACTIVE,
        }
      });

      const req = await tx.scholarSupervisorRequest.create({
        data: {
          scholarId,
          supervisorId: newSupervisor.id,
          status: RequestStatus.APPROVED,
          message: notes ? `Reassigned from previous supervisor: ${notes}` : `Reassigned from previous supervisor`,
          respondedAt: new Date(),
        }
      });

      return { scholar: updatedScholar, request: req };
    });

    if (newSupervisor.email) {
      this.mailService.sendScholarSupervisionApprovedAlert({
        scholarEmail: newSupervisor.email,
        scholarName: newSupervisor.name || newSupervisor.email,
        supervisorName: newSupervisor.name || 'Research Supervisor',
        department: newSupervisor.department || 'SRMIST',
      }).catch(() => {});
    }

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'SCHOLAR_REASSIGNED_SUPERVISOR',
        details: JSON.stringify({ scholarId, previousSupervisorId: scholar.supervisorId, newSupervisorId: newSupervisor.id, notes }),
      }
    }).catch(() => {});

    return result;
  }
}
