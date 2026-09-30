import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { SupabaseAuthGuard } from '../auth/supabase.guard';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  // Institutional notices are for signed-in members only.
  @Get()
  @UseGuards(SupabaseAuthGuard)
  async getPublishedAnnouncements() {
    return this.announcementsService.getPublishedAnnouncements();
  }

  @Get('admin')
  @UseGuards(SupabaseAuthGuard)
  async getAnnouncementsForAdmin(@Req() req: any) {
    if (req.user.role !== 'INSTITUTE_ADMIN') {
      throw new BadRequestException('Only administrators can view all announcements.');
    }
    return this.announcementsService.getAnnouncements();
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async createAnnouncement(@Body() body: any, @Req() req: any) {
    if (req.user.role !== 'INSTITUTE_ADMIN') {
      throw new BadRequestException('Only administrators can create announcements.');
    }
    return this.announcementsService.createAnnouncement({
      title: body.title,
      content: body.content,
      status: body.status || 'DRAFT',
      pushToEmail: !!body.pushToEmail,
      authorId: req.user.id,
    });
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  async updateAnnouncement(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (req.user.role !== 'INSTITUTE_ADMIN') {
      throw new BadRequestException('Only administrators can update announcements.');
    }
    return this.announcementsService.updateAnnouncement(id, body);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  async deleteAnnouncement(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'INSTITUTE_ADMIN') {
      throw new BadRequestException('Only administrators can delete announcements.');
    }
    return this.announcementsService.deleteAnnouncement(id);
  }

  @Post(':id/publish')
  @UseGuards(SupabaseAuthGuard)
  async publishAnnouncement(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'INSTITUTE_ADMIN') {
      throw new BadRequestException('Only administrators can publish announcements.');
    }
    return this.announcementsService.publishAnnouncement(id);
  }
}
