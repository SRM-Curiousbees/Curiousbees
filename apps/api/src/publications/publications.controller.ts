import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { PublicationsService } from './publications.service';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { ResearchParticipantGuard } from '../auth/guards/research-participant.guard';
import { ApprovedGuard } from '../auth/approved.guard';

@Controller('publications')
@UseGuards(SupabaseAuthGuard, ApprovedGuard)
export class PublicationsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('facultyId') facultyId?: string,
  ) {
    return this.publicationsService.findAll(userId, cursor, limit, search, departmentId, facultyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.publicationsService.findOne(id);
  }

  @Post()
  @UseGuards(ResearchParticipantGuard)
  async create(
    @Req() req: any,
    @Body() body: { title: string; authors: string; doi?: string; publisher?: string; year: number; status: string }
  ) {
    return this.publicationsService.create(req.user.id, body);
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { title?: string; authors?: string; doi?: string; publisher?: string; year?: number; status?: string }
  ) {
    return this.publicationsService.update(id, req.user.id, req.user.role, body);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.publicationsService.remove(id, req.user.id, req.user.role);
  }
}
