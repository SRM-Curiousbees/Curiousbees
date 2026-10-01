import { Controller, Get, Post, Put, Delete, Body, UseGuards, Req, Param, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { ResearchParticipantGuard } from '../auth/guards/research-participant.guard';
import { ApprovedGuard } from '../auth/approved.guard';
import { WorkspacesService } from './workspaces.service';
import { AddWorkspaceFileDto, RequestFileUploadDto } from './dto/workspace-file.dto';

@Controller('workspaces')
@UseGuards(SupabaseAuthGuard, ApprovedGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  async getWorkspaces(@Req() req: any) {
    return this.workspacesService.getWorkspaces(req.user.id);
  }

  @Post()
  @UseGuards(ResearchParticipantGuard)
  async createWorkspace(
    @Req() req: any,
    @Body('title') title: string,
    @Body('description') description?: string,
    @Body('researchDomain') researchDomain?: string,
    @Body('researchDomainId') researchDomainId?: string,
    @Body('researchTopic') researchTopic?: string,
    @Body('researchTopicId') researchTopicId?: string,
    @Body('scholarIds') scholarIds?: string[],
    @Body('memberIds') memberIds?: string[],
    @Body('supervisorId') supervisorId?: string,
  ) {
    if (!title) {
      throw new BadRequestException('Workspace title is required.');
    }
    return this.workspacesService.createWorkspace(req.user.id, {
      title,
      description,
      researchDomain,
      researchDomainId,
      researchTopic,
      researchTopicId,
      scholarIds,
      memberIds,
      supervisorId,
    });
  }

  @Post(':id/members')
  @UseGuards(ResearchParticipantGuard)
  async addMember(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Body('userId') memberUserId: string,
  ) {
    if (!memberUserId) {
      throw new BadRequestException('userId is required.');
    }
    return this.workspacesService.addMember(req.user.id, workspaceId, memberUserId);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(ResearchParticipantGuard)
  async removeMember(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.workspacesService.removeMember(req.user.id, workspaceId, memberId);
  }

  @Get(':id')
  async getWorkspace(@Req() req: any, @Param('id') workspaceId: string) {
    return this.workspacesService.getWorkspace(req.user.id, workspaceId);
  }

  /** Step 1 of an upload: a short-lived presigned PUT URL for a workspace member. */
  @Post(':id/files/upload-url')
  @UseGuards(ResearchParticipantGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async requestFileUpload(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Body() body: RequestFileUploadDto,
  ) {
    return this.workspacesService.createFileUpload(req.user.id, workspaceId, body);
  }

  /** Step 2: register the uploaded object (or an external link) on the workspace. */
  @Post(':id/files')
  @UseGuards(ResearchParticipantGuard)
  async addFile(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Body() body: AddWorkspaceFileDto,
  ) {
    return this.workspacesService.addFile(req.user.id, workspaceId, body);
  }

  /** Short-lived download URL, issued only to members of the owning workspace. */
  @Get(':id/files/:fileId/download')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async downloadFile(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.workspacesService.getFileDownload(req.user.id, workspaceId, fileId);
  }

  @Post(':id/milestones')
  @UseGuards(ResearchParticipantGuard)
  async addMilestone(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Body('title') title: string,
    @Body('description') description?: string,
    @Body('dueDate') dueDate?: string
  ) {
    if (!title) {
      throw new BadRequestException('Milestone title is required.');
    }
    return this.workspacesService.addMilestone(req.user.id, workspaceId, title, description, dueDate);
  }

  @Put(':id/milestones/:milestoneId')
  @UseGuards(ResearchParticipantGuard)
  async toggleMilestone(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Param('milestoneId') milestoneId: string,
    @Body('completed') completed: boolean
  ) {
    if (completed === undefined) {
      throw new BadRequestException('completed flag is required.');
    }
    return this.workspacesService.toggleMilestone(req.user.id, workspaceId, milestoneId, completed);
  }

  @Post(':id/announcements')
  @UseGuards(ResearchParticipantGuard)
  async addAnnouncement(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Body('title') title: string,
    @Body('content') content: string
  ) {
    if (!title || !content) {
      throw new BadRequestException('Announcement title and content are required.');
    }
    return this.workspacesService.addAnnouncement(req.user.id, workspaceId, title, content);
  }

  @Delete(':id/leave')
  async leaveWorkspace(
    @Req() req: any,
    @Param('id') workspaceId: string,
  ) {
    return this.workspacesService.leaveWorkspace(req.user.id, workspaceId);
  }
}
