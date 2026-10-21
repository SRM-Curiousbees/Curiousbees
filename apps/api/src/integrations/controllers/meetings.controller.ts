import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../auth/supabase.guard';
import { ApprovedGuard } from '../../auth/approved.guard';
import { MeetingsService, type CreateMeetingDto } from '../services/meetings.service';

@Controller('workspaces/:workspaceId/meetings')
@UseGuards(SupabaseAuthGuard, ApprovedGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  /**
   * Retrieves all meetings for a research workspace
   */
  @Get()
  async getMeetings(@Req() req: any, @Param('workspaceId') workspaceId: string) {
    return this.meetingsService.getMeetings(req.user.id, workspaceId);
  }

  /**
   * Schedules a research meeting for a workspace
   */
  @Post()
  async createMeeting(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateMeetingDto
  ) {
    if (!dto.title || !dto.scheduledAt || !dto.provider) {
      throw new BadRequestException('title, scheduledAt, and provider are required.');
    }
    return this.meetingsService.createMeeting(req.user.id, workspaceId, dto);
  }

  /**
   * Updates a research meeting
   */
  @Patch(':meetingId')
  async updateMeeting(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('meetingId') meetingId: string,
    @Body() data: any
  ) {
    return this.meetingsService.updateMeeting(req.user.id, workspaceId, meetingId, data);
  }

  /**
   * Cancels a research meeting
   */
  @Delete(':meetingId')
  async cancelMeeting(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('meetingId') meetingId: string
  ) {
    return this.meetingsService.cancelMeeting(req.user.id, workspaceId, meetingId);
  }
}
