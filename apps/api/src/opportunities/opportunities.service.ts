import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOpportunityInput } from '@curiousbees/types';
import { CreateOpportunitySchema } from '@curiousbees/shared-utils';

@Injectable()
export class OpportunitiesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Securely validates if the current user belongs to the same department as the resource.
   * Bypasses the validation check for INSTITUTE_ADMIN.
   */
  /**
   * Securely validates if the current user belongs to the same department as the resource.
   * Relational check on departmentId is primary, with legacy string comparison as fallback.
   * Bypasses the validation check for INSTITUTE_ADMIN.
   */
  private validateDepartmentAccess(currentUser: any, resourceDepartment: string, resourceDepartmentId?: string | null) {
    if (!currentUser) {
      throw new ForbiddenException('Authentication required.');
    }
    // Admin has global institutional bypass
    if (currentUser.role === 'INSTITUTE_ADMIN') {
      return;
    }

    // 1. Relational check if both have departmentId
    if (currentUser.departmentId && resourceDepartmentId) {
      if (currentUser.departmentId === resourceDepartmentId) {
        return;
      }
      throw new ForbiddenException('Access denied. You do not have permission to access resources outside your department.');
    }

    // 2. Fallback to legacy string check
    const userDept = currentUser.department;
    if (!userDept || !resourceDepartment) {
      throw new ForbiddenException('Access denied. Department assignment required.');
    }

    // Normalize department names (e.g. "Computer Applications (FSH)" vs "Computer Applications")
    const userDeptBase = userDept.split('(')[0].trim().toLowerCase();
    const resourceDeptBase = resourceDepartment.split('(')[0].trim().toLowerCase();

    if (userDeptBase !== resourceDeptBase && !userDeptBase.includes(resourceDeptBase) && !resourceDeptBase.includes(userDeptBase)) {
      throw new ForbiddenException('Access denied. You do not have permission to access resources outside your department.');
    }
  }

  async getOpportunities(currentUser: any, department?: string, researchDomain?: string, departmentId?: string) {
    const deptQuery = department ? department.split('(')[0].trim() : undefined;

    return this.prisma.opportunity.findMany({
      where: {
        ...(departmentId ? { departmentId } : deptQuery ? {
          OR: [
            { departmentId: deptQuery },
            { department: { contains: deptQuery, mode: 'insensitive' } },
          ],
        } : {}),
        ...(researchDomain && {
          researchDomain: { contains: researchDomain, mode: 'insensitive' }
        })
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            departmentId: true,
            department: true
          }
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getOpportunityById(currentUser: any, id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            departmentId: true,
            department: true
          }
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
      }
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found.');
    }

    this.validateDepartmentAccess(currentUser, opportunity.department, opportunity.departmentId);

    return opportunity;
  }

  async createOpportunity(currentUser: any, input: CreateOpportunityInput) {
    const parsed = CreateOpportunitySchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors[0].message);
    }

    const {
      title,
      description,
      researchDomain,
      opportunityType,
      positionsCount,
      funding,
      fundingDetails,
      eligibility,
      deadline,
      mode,
      applicationMethod,
      applicationUrl,
      applicationEmail
    } = parsed.data;

    const author = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { departmentRef: true },
    });

    const allowedRoles = ['RESEARCH_SUPERVISOR', 'SUPERVISOR', 'RESEARCH_SCHOLAR', 'SCHOLAR', 'INSTITUTE_ADMIN'];
    if (!author || !allowedRoles.includes(author.role)) {
      throw new ForbiddenException('Only verified Research Supervisors, Scholars, or Admins are authorized to post research opportunities.');
    }

    // Derive department strictly from database profile and ignore any frontend spoof attempts
    const departmentId = author.departmentId || null;
    const departmentToAssign = author.departmentRef?.name || author.department;
    if (!departmentToAssign && !departmentId) {
      throw new BadRequestException('You must have a department assigned by Institute Administration to post research opportunities.');
    }

    return this.prisma.opportunity.create({
      data: {
        title,
        description,
        department: departmentToAssign || 'General',
        departmentId: departmentId,
        researchDomain,
        opportunityType: opportunityType || 'PhD Position',
        positionsCount: positionsCount || 1,
        funding: funding || 'Fully Funded',
        fundingDetails: fundingDetails || null,
        eligibility: eligibility || [],
        deadline: deadline ? new Date(deadline) : null,
        mode: mode || 'On Campus',
        applicationMethod: applicationMethod || 'CuriousBees',
        applicationUrl: applicationUrl || null,
        applicationEmail: applicationEmail || null,
        authorId: currentUser.id
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            departmentId: true,
            department: true
          }
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
      }
    });
  }

  async updateOpportunity(currentUser: any, id: string, data: any) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id }
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found.');
    }

    if (opportunity.authorId !== currentUser.id && currentUser.role !== 'INSTITUTE_ADMIN') {
      throw new ForbiddenException('You are not authorized to update this opportunity.');
    }

    this.validateDepartmentAccess(currentUser, opportunity.department, opportunity.departmentId);

    return this.prisma.opportunity.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        researchDomain: data.researchDomain,
        opportunityType: data.opportunityType,
        positionsCount: data.positionsCount,
        funding: data.funding,
        fundingDetails: data.fundingDetails,
        eligibility: data.eligibility,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        mode: data.mode,
        applicationMethod: data.applicationMethod,
        applicationUrl: data.applicationUrl,
        applicationEmail: data.applicationEmail
      }
    });
  }

  async deleteOpportunity(currentUser: any, id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id }
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found.');
    }

    if (opportunity.authorId !== currentUser.id && currentUser.role !== 'INSTITUTE_ADMIN') {
      throw new ForbiddenException('You are not authorized to delete this opportunity.');
    }

    this.validateDepartmentAccess(currentUser, opportunity.department, opportunity.departmentId);

    await this.prisma.opportunity.delete({
      where: { id }
    });

    return { success: true };
  }

  async createCollaborationRequest(currentUser: any, opportunityId: string, message?: string) {
    // 1. Verify scholar is approved
    const scholar = await this.prisma.user.findUnique({
      where: { id: currentUser.id }
    });
    if (!scholar) {
      throw new BadRequestException('Scholar not found.');
    }
    if (scholar.role !== 'RESEARCH_SCHOLAR' && (scholar.role as any) !== 'SCHOLAR') {
      throw new BadRequestException('Only scholars can submit collaboration requests.');
    }
    if (!scholar.approved) {
      throw new BadRequestException('Your profile is pending supervisor approval. You cannot request collaborations yet.');
    }

    // 2. Verify opportunity exists
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });
    if (!opportunity) {
      throw new BadRequestException('Opportunity not found.');
    }

    // 3. Department boundary check
    this.validateDepartmentAccess(currentUser, opportunity.department, opportunity.departmentId);

    // 4. Prevent duplicate requests
    const existing = await this.prisma.collaborationRequest.findFirst({
      where: {
        scholarId: currentUser.id,
        opportunityId
      }
    });
    if (existing) {
      throw new BadRequestException('You have already submitted a collaboration request for this opportunity.');
    }

    return this.prisma.collaborationRequest.create({
      data: {
        scholarId: currentUser.id,
        opportunityId,
        status: 'PENDING',
        message
      },
      include: {
        opportunity: true
      }
    });
  }

  async getRequestsForSupervisor(currentUser: any) {
    return this.prisma.collaborationRequest.findMany({
      where: {
        opportunity: {
          authorId: currentUser.id
        }
      },
      include: {
        scholar: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true
          }
        },
        opportunity: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getRequestsForScholar(currentUser: any) {
    return this.prisma.collaborationRequest.findMany({
      where: { scholarId: currentUser.id },
      include: {
        opportunity: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                department: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async updateRequestStatus(currentUser: any, requestId: string, status: 'PUBLISHED' | 'REJECTED' | 'NEEDS_INFO') {
    const request = await this.prisma.collaborationRequest.findUnique({
      where: { id: requestId },
      include: {
        opportunity: { include: { author: { select: { name: true } } } },
        scholar: true
      }
    });

    if (!request) {
      throw new BadRequestException('Collaboration request not found.');
    }

    if (!request.opportunity) {
      throw new BadRequestException('Collaboration request does not have an associated opportunity.');
    }

    if (request.opportunity.authorId !== currentUser.id && currentUser.role !== 'INSTITUTE_ADMIN') {
      throw new ForbiddenException('You are not authorized to update requests for this opportunity.');
    }

    // Secure department boundary check
    this.validateDepartmentAccess(currentUser, request.opportunity.department, request.opportunity.departmentId);

    const updated = await this.prisma.collaborationRequest.update({
      where: { id: requestId },
      data: { status }
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'UPDATE_COLLAB_REQUEST',
        details: `Supervisor updated request ${requestId} to status ${status}`
      }
    });

    // If approved (PUBLISHED), automatically spin up a collaboration workspace
    if (status === 'PUBLISHED') {
      const workspace = await this.prisma.workspace.create({
        data: {
          title: `Workspace: ${request.opportunity.title}`,
          description: `Research collaboration space for "${request.opportunity.title}" between ${request.opportunity.author?.name || 'the supervisor'} and ${request.scholar.name || request.scholar.email}.`
        }
      });

      // Add Supervisor as Owner
      await this.prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: request.opportunity.authorId,
          role: 'OWNER'
        }
      });

      // Add Scholar as Member
      await this.prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: request.scholarId,
          role: 'MEMBER'
        }
      });

      // Write audit log for workspace creation
      await this.prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'WORKSPACE_CREATE',
          details: `Auto-created workspace ${workspace.id} for opportunity ${request.opportunityId}`
        }
      });
    }

    return updated;
  }
}
