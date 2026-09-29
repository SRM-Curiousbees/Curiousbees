import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { AdminService } from './admin.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { IMPORT_MAX_BYTES } from './admin-safety';
import { Role as PrismaRole, UserStatus } from '@prisma/client';

@Controller('admin/users')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(Role.INSTITUTE_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Post()
  async createUser(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('role') role: PrismaRole,
    @Body('departmentId') departmentId?: string,
    @Body('supervisorId') supervisorId?: string
  ) {
    if (!name || !email || !role) {
      throw new BadRequestException('Name, email, and role are required.');
    }
    return this.adminService.createUser({
      name,
      email,
      role,
      departmentId,
      supervisorId,
    });
  }

  @Put(':id')
  async updateUser(
    @Req() req: any,
    @Param('id') id: string,
    @Body('name') name?: string,
    @Body('email') email?: string,
    @Body('role') role?: PrismaRole,
    @Body('status') status?: UserStatus,
    @Body('departmentId') departmentId?: string,
    @Body('supervisorId') supervisorId?: string
  ) {
    return this.adminService.updateUser(id, {
      name,
      email,
      role,
      status,
      departmentId,
      supervisorId,
    }, req.user.id);
  }

  @Delete(':id')
  async deleteUser(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteUser(id, req.user.id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES, files: 1 } }))
  async importUsers(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Spreadsheet file is required for bulk import.');
    }
    return this.adminService.importUsers(file.buffer, file.originalname);
  }
}
