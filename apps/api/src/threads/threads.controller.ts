import { Controller, Get, Post, Body, Query, Param, UseGuards, Req, Res, Put, Delete, NotFoundException, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { ResearchParticipantGuard } from '../auth/guards/research-participant.guard';
import { ApprovedGuard } from '../auth/approved.guard';
import { ThreadsService } from './threads.service';
import { CreateThreadInput } from '@curiousbees/types';

@Controller('threads')
@UseGuards(SupabaseAuthGuard, ApprovedGuard)
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Get()
  async getThreads(
    @Req() req: any, 
    @Query('search') search?: string, 
    @Query('tag') tag?: string, 
    @Query('type') type?: string,
    @Query('sort') sort?: 'latest' | 'top',
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.threadsService.getThreads(search, tag, type, req.user?.id, sort, cursor, limit);
  }

  @Get('counts')
  async getThreadCounts(@Req() req: any, @Query('search') search?: string) {
    return this.threadsService.getThreadCounts(search, req.user?.id);
  }

  @Get('saved')
  async getSavedThreads(@Req() req: any) {
    return this.threadsService.getSavedThreads(req.user.id);
  }

  @Post('files/upload-url')
  @UseGuards(ResearchParticipantGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async requestFileUpload(
    @Req() req: any,
    @Body() body: { filename: string; contentType: string; sizeBytes: number },
  ) {
    if (!body?.filename || !body?.contentType || !body?.sizeBytes) {
      throw new BadRequestException('filename, contentType, and sizeBytes are required.');
    }
    return this.threadsService.createFileUpload(req.user.id, body);
  }

  @Get('files/download')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async downloadFile(
    @Query('key') key: string,
    @Res() res: any,
  ) {
    if (!key) {
      throw new BadRequestException('Storage key is required.');
    }
    const { downloadUrl } = await this.threadsService.getFileDownload(key);
    return res.redirect(downloadUrl);
  }

  @Get(':id')
  async getThreadById(@Req() req: any, @Param('id') id: string) {
    return this.threadsService.getThreadById(id, req.user?.id);
  }

  @Post()
  @UseGuards(ResearchParticipantGuard)
  async createThread(@Req() req: any, @Body() body: CreateThreadInput) {
    return this.threadsService.createThread(req.user.id, body);
  }

  @Delete(':id')
  @UseGuards(ResearchParticipantGuard)
  async deleteThread(@Req() req: any, @Param('id') id: string) {
    return this.threadsService.deleteThread(id, req.user.id);
  }

  @Put(':id')
  @UseGuards(ResearchParticipantGuard)
  async updateThread(@Req() req: any, @Param('id') id: string, @Body() body: Partial<CreateThreadInput>) {
    return this.threadsService.updateThread(id, req.user.id, body);
  }

  @Post(':id/like')
  @UseGuards(ResearchParticipantGuard)
  async toggleLike(@Req() req: any, @Param('id') id: string) {
    return this.threadsService.toggleLike(id, req.user.id);
  }

  @Post(':id/save')
  @UseGuards(ResearchParticipantGuard)
  async toggleSave(@Req() req: any, @Param('id') id: string) {
    return this.threadsService.toggleSave(id, req.user.id);
  }

  @Post(':id/share')
  @UseGuards(ResearchParticipantGuard)
  async shareThread(@Req() req: any, @Param('id') id: string, @Body('platform') platform?: string) {
    return this.threadsService.shareThread(id, req.user.id, platform);
  }

  @Post(':id/report')
  @UseGuards(ResearchParticipantGuard)
  async reportThread(@Req() req: any, @Param('id') id: string, @Body('reason') reason: string, @Body('description') description?: string) {
    return this.threadsService.reportThread(id, req.user.id, reason, description);
  }

  @Post(':id/collaborate')
  @UseGuards(ResearchParticipantGuard)
  async requestCollaboration(@Req() req: any, @Param('id') id: string, @Body('message') message?: string) {
    return this.threadsService.requestCollaboration(id, req.user.id, message);
  }
}

// Public controller — no auth required (for share links)
@Controller('threads/public')
export class ThreadsPublicController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Get('files/download')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async downloadFilePublic(
    @Query('key') key: string,
    @Res() res: any,
  ) {
    if (!key) {
      throw new BadRequestException('Storage key is required.');
    }
    const { downloadUrl } = await this.threadsService.getFileDownload(key);
    return res.redirect(downloadUrl);
  }

  @Get(':id')
  async getThreadPublic(@Param('id') id: string) {
    const thread = await this.threadsService.getThreadPublic(id);
    if (!thread) {
      throw new NotFoundException('This post is no longer available.');
    }
    return thread;
  }
}
