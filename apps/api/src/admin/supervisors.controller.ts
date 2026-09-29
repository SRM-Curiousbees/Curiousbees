import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { AdminSupervisorsService } from './supervisors.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { IMPORT_MAX_BYTES } from './admin-safety';
import { UserStatus } from '@prisma/client';

@Controller('admin/supervisors')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(Role.INSTITUTE_ADMIN)
export class AdminSupervisorsController {
  constructor(private readonly supervisorsService: AdminSupervisorsService) {}

  @Get()
  async getSupervisors(@Query() query: any) {
    return this.supervisorsService.getSupervisors(query);
  }

  @Post()
  async createSupervisor(@Body() body: any, @Req() req: any) {
    if (!body.name || !body.email) {
      throw new BadRequestException('Name and email are required');
    }
    return this.supervisorsService.createSupervisor(req.user.id, body);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: UserStatus, @Req() req: any) {
    if (!status) throw new BadRequestException('Status is required');
    return this.supervisorsService.updateSupervisorStatus(req.user.id, id, status);
  }

  @Put(':id')
  async updateSupervisor(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    if (!body.name || !body.email) {
      throw new BadRequestException('Name and email are required');
    }
    return this.supervisorsService.updateSupervisor(req.user.id, id, body);
  }

  @Delete(':id')
  async deleteSupervisor(@Param('id') id: string, @Req() req: any) {
    return this.supervisorsService.deleteSupervisor(req.user.id, id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES, files: 1 } }))
  async importSupervisors(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('File is required');
    return this.supervisorsService.importSupervisors(req.user.id, file.buffer, file.originalname);
  }
}
