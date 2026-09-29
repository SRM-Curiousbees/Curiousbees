import { Controller, Get, Post, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { CollaborationsService } from './collaborations.service';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { ResearchParticipantGuard } from '../auth/guards/research-participant.guard';
import { ApprovedGuard } from '../auth/approved.guard';

@Controller('collaborations')
@UseGuards(SupabaseAuthGuard, ApprovedGuard)
export class CollaborationsController {
  constructor(private readonly collaborationsService: CollaborationsService) {}

  @Post('request')
  @UseGuards(ResearchParticipantGuard)
  async sendRequest(
    @Req() req: any,
    @Body('recipientId') recipientId: string,
    @Body('threadId') threadId?: string,
    @Body('message') message?: string,
  ) {
    return this.collaborationsService.sendRequest(req.user.id, recipientId, threadId, message);
  }

  @Get('requests')
  async getMyRequests(@Req() req: any) {
    return this.collaborationsService.getMyRequests(req.user.id);
  }

  @Post('requests/:id/cancel')
  @UseGuards(ResearchParticipantGuard)
  async cancelRequest(@Req() req: any, @Param('id') id: string) {
    return this.collaborationsService.cancelRequest(id, req.user.id);
  }

  @Post('requests/:id/accept')
  @UseGuards(ResearchParticipantGuard)
  async acceptRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body('provider') provider?: any
  ) {
    return this.collaborationsService.acceptRequest(id, req.user.id, provider);
  }

  @Post('requests/:id/decline')
  @UseGuards(ResearchParticipantGuard)
  async declineRequest(@Req() req: any, @Param('id') id: string) {
    return this.collaborationsService.declineRequest(id, req.user.id);
  }

  @Get('status/:targetUserId')
  async getCollaborationStatus(
    @Req() req: any,
    @Param('targetUserId') targetUserId: string,
    @Query('threadId') threadId?: string,
  ) {
    return this.collaborationsService.getCollaborationStatus(req.user.id, targetUserId, threadId);
  }

  @Get()
  async getMyCollaborations(@Req() req: any) {
    return this.collaborationsService.getMyCollaborations(req.user.id);
  }

  @Get(':id')
  async getCollaboration(@Req() req: any, @Param('id') id: string) {
    return this.collaborationsService.getCollaboration(id, req.user.id);
  }

  @Post(':id/messages')
  @UseGuards(ResearchParticipantGuard)
  async sendMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    return this.collaborationsService.sendMessage(id, req.user.id, content);
  }

  @Get(':id/messages')
  async getMessages(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page: string,
  ) {
    return this.collaborationsService.getMessages(id, req.user.id, page ? parseInt(page) : 1);
  }

  @Post(':id/close')
  @UseGuards(ResearchParticipantGuard)
  async closeCollaboration(@Req() req: any, @Param('id') id: string) {
    return this.collaborationsService.closeCollaboration(id, req.user.id);
  }
}
