import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { AdminAdminsService } from './admins.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { IMPORT_MAX_BYTES } from './admin-safety';
import { UserStatus } from '@prisma/client';

@Controller('admin/admins')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(Role.INSTITUTE_ADMIN)
export class AdminAdminsController {
  constructor(private readonly adminsService: AdminAdminsService) {}

  @Get()
  async getAdmins(@Query() query: any) {
    return this.adminsService.getAdmins(query);
  }

  @Post()
  async createAdmin(@Body() body: any, @Req() req: any) {
    if (!body.name || !body.email) {
      throw new BadRequestException('Name and email are required');
    }
    return this.adminsService.createAdmin(req.user.id, body);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: UserStatus, @Req() req: any) {
    if (!status) throw new BadRequestException('Status is required');
    return this.adminsService.updateAdminStatus(req.user.id, id, status);
  }

  @Put(':id')
  async updateAdmin(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    if (!body.name || !body.email) {
      throw new BadRequestException('Name and email are required');
    }
    return this.adminsService.updateAdmin(req.user.id, id, body);
  }

  @Delete(':id')
  async deleteAdmin(@Param('id') id: string, @Req() req: any) {
    return this.adminsService.deleteAdmin(req.user.id, id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES, files: 1 } }))
  async importAdmins(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('File is required');
    return this.adminsService.importAdmins(req.user.id, file.buffer, file.originalname);
  }

  @Get('audit-logs')
  async getAuditLogs() {
    return this.adminsService.getAuditLogs();
  }
}
