import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { AdminScholarsService } from './scholars.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { IMPORT_MAX_BYTES } from './admin-safety';
import { UserStatus } from '@prisma/client';

@Controller('admin/scholars')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(Role.INSTITUTE_ADMIN)
export class AdminScholarsController {
  constructor(private readonly scholarsService: AdminScholarsService) {}

  @Get()
  async getScholars(@Query() query: any) {
    return this.scholarsService.getScholars(query);
  }

  @Post()
  async createScholar(@Body() body: any, @Req() req: any) {
    if (!body.name || !body.email) {
      throw new BadRequestException('Name and email are required');
    }
    return this.scholarsService.createScholar(req.user.id, body);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: UserStatus, @Req() req: any) {
    if (!status) throw new BadRequestException('Status is required');
    return this.scholarsService.updateScholarStatus(req.user.id, id, status);
  }

  @Put(':id/supervisor')
  async assignSupervisor(@Param('id') id: string, @Body('supervisorId') supervisorId: string, @Req() req: any) {
    if (!supervisorId) throw new BadRequestException('Supervisor ID is required');
    return this.scholarsService.assignSupervisor(req.user.id, id, supervisorId);
  }

  @Put(':id')
  async updateScholar(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    if (!body.name || !body.email) {
      throw new BadRequestException('Name and email are required');
    }
    return this.scholarsService.updateScholar(req.user.id, id, body);
  }

  @Delete(':id')
  async deleteScholar(@Param('id') id: string, @Req() req: any) {
    return this.scholarsService.deleteScholar(req.user.id, id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES, files: 1 } }))
  async importScholars(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('File is required');
    return this.scholarsService.importScholars(req.user.id, file.buffer, file.originalname);
  }
}
