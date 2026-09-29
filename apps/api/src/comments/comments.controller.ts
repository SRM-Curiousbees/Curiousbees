import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { ResearchParticipantGuard } from '../auth/guards/research-participant.guard';
import { ApprovedGuard } from '../auth/approved.guard';
import { CommentsService } from './comments.service';
import { CreateCommentInput } from '@curiousbees/types';

@Controller('comments')
@UseGuards(SupabaseAuthGuard, ApprovedGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('thread/:threadId')
  async getCommentsByThread(@Req() req: any, @Param('threadId') threadId: string) {
    return this.commentsService.getCommentsByThread(threadId, req.user?.id);
  }

  @Post()
  @UseGuards(ResearchParticipantGuard)
  async createComment(@Req() req: any, @Body() body: CreateCommentInput) {
    return this.commentsService.createComment(req.user.id, body);
  }

  @Patch(':id')
  @UseGuards(ResearchParticipantGuard)
  async updateComment(
    @Req() req: any,
    @Param('id') id: string,
    @Body('content') content: string
  ) {
    return this.commentsService.updateComment(req.user.id, id, content);
  }

  @Delete(':id')
  @UseGuards(ResearchParticipantGuard)
  async deleteComment(@Req() req: any, @Param('id') id: string) {
    return this.commentsService.deleteComment(req.user.id, id);
  }

  @Post(':id/like')
  @UseGuards(ResearchParticipantGuard)
  async toggleLike(@Req() req: any, @Param('id') id: string) {
    return this.commentsService.toggleLike(req.user.id, id);
  }
}
