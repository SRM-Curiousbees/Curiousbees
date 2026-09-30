import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResearchStatus, ResearchStage, MilestoneStatus, MilestonePriority } from '@prisma/client';

@Injectable()
export class MyResearchService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateResearchProfile(scholarId: string) {
    let profile = await this.prisma.researchProfile.findUnique({
      where: { scholarId },
      include: {
        milestones: {
          orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        },
        activities: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: { id: true, name: true, image: true, role: true },
            },
          },
        },
      },
    });

    if (!profile) {
      const user = await this.prisma.user.findUnique({
        where: { id: scholarId },
        select: { department: true, faculty: true },
      });

      const latestReq = await this.prisma.scholarSupervisorRequest.findFirst({
        where: { scholarId },
        orderBy: { createdAt: 'desc' },
      });

      const initialTitle = latestReq?.proposalTitle || latestReq?.researchTopic || '';
      const initialArea = latestReq?.researchDomain || latestReq?.researchTopic || user?.department || '';

      profile = await this.prisma.researchProfile.create({
        data: {
          scholarId,
          title: initialTitle,
          researchArea: initialArea,
          abstract: null,
          status: ResearchStatus.ACTIVE,
          currentStage: ResearchStage.PROPOSAL,
          activities: {
            create: {
              actorId: scholarId,
              type: 'PROFILE_CREATED',
              description: 'Research profile created.',
            },
          },
        },
        include: {
          milestones: true,
          activities: {
            include: {
              actor: { select: { id: true, name: true, image: true, role: true } },
            },
          },
        },
      });
    }

    // Fetch scholar's assigned supervisor details
    const scholarUser = await this.prisma.user.findUnique({
      where: { id: scholarId },
      select: {
        supervisorId: true,
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            faculty: true,
            role: true,
            supervisorProfile: {
              select: { designation: true, researchArea: true },
            },
          },
        },
      },
    });

    let activeCollabId: string | null = null;
    if (scholarUser?.supervisorId) {
      const activeCollab = await this.prisma.researchCollaboration.findFirst({
        where: {
          status: 'ACTIVE',
          OR: [
            { requesterId: scholarId, recipientId: scholarUser.supervisorId },
            { requesterId: scholarUser.supervisorId, recipientId: scholarId },
          ],
        },
        select: { id: true },
      });
      if (activeCollab) {
        activeCollabId = activeCollab.id;
      }
    }

    return {
      ...profile,
      supervisor: scholarUser?.supervisor || null,
      activeCollabId,
    };
  }

  async updateResearchProfile(
    scholarId: string,
    dto: {
      title?: string;
      researchArea?: string;
      abstract?: string;
      status?: ResearchStatus;
      currentStage?: ResearchStage;
      startDate?: string;
      expectedCompletionDate?: string;
    },
  ) {
    const profile = await this.getOrCreateResearchProfile(scholarId);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.researchArea !== undefined) updateData.researchArea = dto.researchArea;
    if (dto.abstract !== undefined) updateData.abstract = dto.abstract;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.currentStage !== undefined) updateData.currentStage = dto.currentStage;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.expectedCompletionDate !== undefined)
      updateData.expectedCompletionDate = dto.expectedCompletionDate ? new Date(dto.expectedCompletionDate) : null;

    const stageChanged = dto.currentStage && dto.currentStage !== profile.currentStage;

    const updated = await this.prisma.researchProfile.update({
      where: { id: profile.id },
      data: updateData,
      include: {
        milestones: { orderBy: { dueDate: 'asc' } },
        activities: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { id: true, name: true, image: true, role: true } } },
        },
      },
    });

    if (stageChanged) {
      await this.prisma.researchActivity.create({
        data: {
          researchProfileId: profile.id,
          actorId: scholarId,
          type: 'STAGE_CHANGED',
          description: `Research stage advanced to ${dto.currentStage?.replace('_', ' ')}.`,
        },
      });
    }

    if (dto.researchArea || dto.title) {
      await this.prisma.scholarProfile.updateMany({
        where: { userId: scholarId },
        data: {
          researchArea: dto.title || dto.researchArea,
        },
      }).catch(() => {});
    }

    return updated;
  }

  async getMilestones(scholarId: string) {
    const profile = await this.getOrCreateResearchProfile(scholarId);
    return this.prisma.researchMilestone.findMany({
      where: { researchProfileId: profile.id },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async createMilestone(
    scholarId: string,
    dto: {
      title: string;
      description?: string;
      stage?: ResearchStage;
      priority?: MilestonePriority;
      dueDate?: string;
    },
  ) {
    const profile = await this.getOrCreateResearchProfile(scholarId);

    const milestone = await this.prisma.researchMilestone.create({
      data: {
        researchProfileId: profile.id,
        title: dto.title,
        description: dto.description || null,
        stage: dto.stage || profile.currentStage,
        priority: dto.priority || MilestonePriority.MEDIUM,
        status: MilestoneStatus.UPCOMING,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        createdById: scholarId,
      },
    });

    await this.prisma.researchActivity.create({
      data: {
        researchProfileId: profile.id,
        actorId: scholarId,
        type: 'MILESTONE_CREATED',
        description: `Created research milestone "${dto.title}".`,
      },
    });

    return milestone;
  }

  async updateMilestone(
    scholarId: string,
    milestoneId: string,
    dto: {
      title?: string;
      description?: string;
      stage?: ResearchStage;
      status?: MilestoneStatus;
      priority?: MilestonePriority;
      dueDate?: string;
    },
  ) {
    const profile = await this.getOrCreateResearchProfile(scholarId);

    const existing = await this.prisma.researchMilestone.findFirst({
      where: { id: milestoneId, researchProfileId: profile.id },
    });

    if (!existing) {
      throw new NotFoundException('Milestone not found for your research profile.');
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.stage !== undefined) updateData.stage = dto.stage;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.status === MilestoneStatus.COMPLETED && existing.status !== MilestoneStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const updated = await this.prisma.researchMilestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    if (dto.status === MilestoneStatus.COMPLETED && existing.status !== MilestoneStatus.COMPLETED) {
      await this.prisma.researchActivity.create({
        data: {
          researchProfileId: profile.id,
          actorId: scholarId,
          type: 'MILESTONE_COMPLETED',
          description: `Completed milestone "${updated.title}".`,
        },
      });
    }

    return updated;
  }

  async completeMilestone(scholarId: string, milestoneId: string) {
    return this.updateMilestone(scholarId, milestoneId, {
      status: MilestoneStatus.COMPLETED,
    });
  }

  async getActivityTimeline(scholarId: string) {
    const profile = await this.getOrCreateResearchProfile(scholarId);
    return this.prisma.researchActivity.findMany({
      where: { researchProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        actor: {
          select: { id: true, name: true, image: true, role: true },
        },
      },
    });
  }

  async getResearchMaterials(scholarId: string) {
    // 1. Workspace files from workspaces scholar is a member of
    const workspaceFiles = await this.prisma.workspaceFile.findMany({
      where: {
        workspace: {
          members: {
            some: { userId: scholarId },
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
      take: 20,
      include: {
        uploadedBy: { select: { id: true, name: true } },
        workspace: { select: { id: true, title: true } },
      },
    });

    // 2. Scholar progress reports
    const reports = await this.prisma.report.findMany({
      where: { scholarId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        supervisor: { select: { id: true, name: true } },
      },
    });

    const materials: any[] = [];

    workspaceFiles.forEach((file) => {
      materials.push({
        id: `file-${file.id}`,
        name: file.name,
        url: file.url,
        // Linked files have no stored size.
        size: file.storageKey && file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Link',
        updatedDate: file.uploadedAt,
        type: file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCUMENT',
        source: 'Workspace',
        workspaceTitle: file.workspace.title,
        uploadedBy: file.uploadedBy.name,
      });
    });

    reports.forEach((rep) => {
      materials.push({
        id: `report-${rep.id}`,
        name: rep.title,
        url: rep.evidenceUrl || '#',
        size: 'Report Submission',
        updatedDate: rep.createdAt,
        type: 'PROGRESS_REPORT',
        source: 'Supervision Report',
        status: rep.status,
        supervisorName: rep.supervisor.name,
      });
    });

    return materials.sort(
      (a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime(),
    );
  }
}
