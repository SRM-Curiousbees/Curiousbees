import { Controller, Get, Post, Put, Body, UseGuards, Req, Param, BadRequestException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { ApprovedGuard } from '../auth/approved.guard';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
@UseGuards(SupabaseAuthGuard, ApprovedGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  async getWorkspaces(@Req() req: any) {
    return this.workspacesService.getWorkspaces(req.user.id);
  }

  @Post()
  async createWorkspace(
    @Req() req: any,
    @Body('title') title: string,
    @Body('description') description?: string,
    @Body('researchDomain') researchDomain?: string,
    @Body('researchDomainId') researchDomainId?: string,
    @Body('researchTopic') researchTopic?: string,
    @Body('researchTopicId') researchTopicId?: string,
    @Body('scholarIds') scholarIds?: string[],
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
    });
  }

  @Get(':id')
  async getWorkspace(@Req() req: any, @Param('id') workspaceId: string) {
    return this.workspacesService.getWorkspace(req.user.id, workspaceId);
  }

  @Post(':id/files')
  async addFile(
    @Req() req: any,
    @Param('id') workspaceId: string,
    @Body('name') name: string,
    @Body('url') url: string,
    @Body('size') size: number
  ) {
    if (!name || !url) {
      throw new BadRequestException('File name and URL are required.');
    }
    return this.workspacesService.addFile(req.user.id, workspaceId, name, url, size || 0);
  }

  @Post(':id/milestones')
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
}
