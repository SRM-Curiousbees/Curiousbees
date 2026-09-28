import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { FacultiesService } from './faculties.service';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { ApprovedGuard } from '../auth/approved.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('faculties')
export class FacultiesController {
  constructor(private readonly facultiesService: FacultiesService) {}

  @Get()
  async findAll(@Query('campusId') campusId?: string) {
    return this.facultiesService.findAll(campusId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.facultiesService.findOne(id);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard, ApprovedGuard, AdminGuard)
  async create(@Body() body: { name: string; campusId?: string }) {
    return this.facultiesService.create(body);
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard, ApprovedGuard, AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; campusId?: string }
  ) {
    return this.facultiesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard, ApprovedGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    return this.facultiesService.remove(id);
  }
}
