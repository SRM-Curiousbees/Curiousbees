import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationsService } from './integrations.service';
import { GoogleWorkspaceService } from './google-workspace.service';
import { MeetingProvider, MeetingStatus, IntegrationProvider } from '@prisma/client';

export interface CreateMeetingDto {
  title: string;
  description?: string;
  provider: MeetingProvider;
  scheduledAt: string | Date;
  duration?: number;
  externalMeetingUrl?: string;
}

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationsService: IntegrationsService,
    private readonly googleWorkspace: GoogleWorkspaceService
  ) {}

  /**
   * Helper to ensure user is an active member or owner of the Workspace
   */
  private async ensureWorkspaceMember(userId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace node not found.');
    }

    const isMember = workspace.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not authorized to access this research workspace.');
    }

    return workspace;
  }

  /**
   * Lists all meetings for a workspace
   */
  async getMeetings(userId: string, workspaceId: string) {
    await this.ensureWorkspaceMember(userId, workspaceId);

    return this.prisma.researchMeeting.findMany({
      where: { workspaceId },
      orderBy: { scheduledAt: 'asc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Creates a meeting for a research collaboration workspace
   */
  async createMeeting(userId: string, workspaceId: string, dto: CreateMeetingDto) {
    const workspace = await this.ensureWorkspaceMember(userId, workspaceId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    const scheduledDate = new Date(dto.scheduledAt);
    const duration = dto.duration || 30;
    const participantEmails = workspace.members.map((m) => m.user.email);

    let meetingUrl = dto.externalMeetingUrl || '';
    let externalMeetingId: string | null = null;

    if (dto.provider === MeetingProvider.GOOGLE_MEET) {
      const accessToken = await this.integrationsService.getValidAccessToken(
        userId,
        IntegrationProvider.GOOGLE_WORKSPACE
      );
      const result = await this.googleWorkspace.createMeeting(accessToken, {
        title: dto.title,
        description: dto.description,
        scheduledAt: scheduledDate,
        duration,
        hostEmail: user?.email || '',
        participantEmails,
      });
      meetingUrl = result.joinUrl;
      externalMeetingId = result.externalMeetingId;
    } else if (dto.provider === MeetingProvider.EXTERNAL) {
      if (!meetingUrl) {
        throw new BadRequestException('External meeting URL is required.');
      }
    }

    const meeting = await this.prisma.researchMeeting.create({
      data: {
        workspaceId,
        createdById: userId,
        provider: dto.provider,
        externalMeetingId,
        meetingUrl,
        title: dto.title,
        description: dto.description,
        scheduledAt: scheduledDate,
        duration,
        status: MeetingStatus.SCHEDULED,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    // Notify workspace members
    const otherMembers = workspace.members.filter((m) => m.userId !== userId);
    for (const member of otherMembers) {
      await this.prisma.notification.create({
        data: {
          userId: member.userId,
          title: 'Research Meeting Scheduled',
          body: `${user?.name || 'A team member'} scheduled "${dto.title}" for ${scheduledDate.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
          })} at ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          type: 'MEETING_SCHEDULED',
          actionUrl: `/workspace/${workspaceId}?tab=meetings`,
        },
      }).catch(() => {});
    }

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MEETING_CREATED',
        details: `Created ${dto.provider} meeting "${dto.title}" in workspace ${workspaceId}`,
      },
    }).catch(() => {});

    return meeting;
  }

  /**
   * Updates meeting details
   */
  async updateMeeting(
    userId: string,
    workspaceId: string,
    meetingId: string,
    data: Partial<CreateMeetingDto> & { status?: MeetingStatus }
  ) {
    await this.ensureWorkspaceMember(userId, workspaceId);

    const meeting = await this.prisma.researchMeeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting || meeting.workspaceId !== workspaceId) {
      throw new NotFoundException('Meeting not found.');
    }

    const updated = await this.prisma.researchMeeting.update({
      where: { id: meetingId },
      data: {
        title: data.title || undefined,
        description: data.description !== undefined ? data.description : undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        duration: data.duration || undefined,
        status: data.status || undefined,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MEETING_UPDATED',
        details: `Updated meeting ${meetingId} in workspace ${workspaceId}`,
      },
    }).catch(() => {});

    return updated;
  }

  /**
   * Cancels a meeting
   */
  async cancelMeeting(userId: string, workspaceId: string, meetingId: string) {
    await this.ensureWorkspaceMember(userId, workspaceId);

    const meeting = await this.prisma.researchMeeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting || meeting.workspaceId !== workspaceId) {
      throw new NotFoundException('Meeting not found.');
    }

    const cancelled = await this.prisma.researchMeeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.CANCELLED,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MEETING_CANCELLED',
        details: `Cancelled meeting ${meetingId} in workspace ${workspaceId}`,
      },
    }).catch(() => {});

    return cancelled;
  }
}
