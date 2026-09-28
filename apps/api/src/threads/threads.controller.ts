import { Controller, Get, Post, Body, Query, Param, UseGuards, Req, Put, Delete, NotFoundException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
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

  @Get(':id')
  async getThreadById(@Req() req: any, @Param('id') id: string) {
    return this.threadsService.getThreadById(id, req.user?.id);
  }

  @Post()
  async createThread(@Req() req: any, @Body() body: CreateThreadInput) {
    return this.threadsService.createThread(req.user.id, body);
  }

  @Delete(':id')
  async deleteThread(@Req() req: any, @Param('id') id: string) {
    return this.threadsService.deleteThread(id, req.user.id);
  }

  @Put(':id')
  async updateThread(@Req() req: any, @Param('id') id: string, @Body() body: Partial<CreateThreadInput>) {
    return this.threadsService.updateThread(id, req.user.id, body);
  }

  @Post(':id/like')
  async toggleLike(@Req() req: any, @Param('id') id: string) {
    return this.threadsService.toggleLike(id, req.user.id);
  }

  @Post(':id/save')
  async toggleSave(@Req() req: any, @Param('id') id: string) {
    return this.threadsService.toggleSave(id, req.user.id);
  }

  @Post(':id/share')
  async shareThread(@Req() req: any, @Param('id') id: string, @Body('platform') platform?: string) {
    return this.threadsService.shareThread(id, req.user.id, platform);
  }

  @Post(':id/report')
  async reportThread(@Req() req: any, @Param('id') id: string, @Body('reason') reason: string, @Body('description') description?: string) {
    return this.threadsService.reportThread(id, req.user.id, reason, description);
  }

  @Post(':id/collaborate')
  async requestCollaboration(@Req() req: any, @Param('id') id: string, @Body('message') message?: string) {
    return this.threadsService.requestCollaboration(id, req.user.id, message);
  }
}

// Public controller — no auth required (for share links)
@Controller('threads/public')
export class ThreadsPublicController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Get(':id')
  async getThreadPublic(@Param('id') id: string) {
    const thread = await this.threadsService.getThreadPublic(id);
    if (!thread) {
      throw new NotFoundException('This post is no longer available.');
    }
    return thread;
  }
}
