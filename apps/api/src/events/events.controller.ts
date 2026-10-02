import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { EventsService } from './events.service';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { ApprovedGuard } from '../auth/approved.guard';
import { EventStatus, Prisma } from '@prisma/client';

@Controller('events')
@UseGuards(SupabaseAuthGuard, ApprovedGuard)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService
  ) {}

  @Get()
  async getEvents(
    @Req() req: any,
    @Query('status') status?: EventStatus,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string
  ) {
    return this.eventsService.getEvents({
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    }, req.user);
  }

  @Get('review')
  async getReviewEvents(@Req() req: any) {
    return this.eventsService.getReviewEvents(req.user);
  }



  @Post()
  async createEvent(
    @Req() req: any,
    @Body() body: { title: string; date: string; time: string; venue: string; description?: string; eventType?: string; registrationLink?: string }
  ) {
    return this.eventsService.createEvent(req.user, body);
  }

  @Put(':id')
  async updateEvent(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Prisma.EventUpdateInput
  ) {
    return this.eventsService.updateEvent(req.user, id, body);
  }

  @Patch(':id/status')
  async updateEventStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: EventStatus }
  ) {
    return this.eventsService.updateEventStatus(req.user, id, body.status);
  }

  @Delete(':id')
  async deleteEvent(
    @Req() req: any,
    @Param('id') id: string
  ) {
    return this.eventsService.deleteEvent(req.user, id);
  }
}
