import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { AdminUsersService } from './users.service';
import { AdminService } from './admin.service';
import { IMPORT_MAX_BYTES } from './admin-safety';
import { Role as PrismaRole, UserStatus } from '@prisma/client';

@Controller('admin/users')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(Role.INSTITUTE_ADMIN)
export class AdminUsersController {
  constructor(
    private readonly usersService: AdminUsersService,
    private readonly adminService: AdminService,
  ) {}

  @Get()
  async getUsers(@Query() query: any) {
    return this.usersService.getUsers(query);
  }

  @Get(':id/profile')
  async getUserProfile(@Param('id') id: string) {
    return this.usersService.getUserGovernanceProfile(id);
  }

  @Post(':id/suspend')
  async suspendUser(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any
  ) {
    if (!reason) throw new BadRequestException('Reason is required');
    return this.usersService.suspendUser(req.user, id, reason);
  }

  @Post(':id/reactivate')
  async reactivateUser(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any
  ) {
    if (!reason) throw new BadRequestException('Reason is required');
    return this.usersService.reactivateUser(req.user, id, reason);
  }

  @Post(':id/deactivate')
  async deactivateUser(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any
  ) {
    if (!reason) throw new BadRequestException('Reason is required');
    return this.usersService.deactivateUser(req.user, id, reason);
  }

  @Put(':id/role')
  async changeRole(
    @Param('id') id: string,
    @Body('role') role: PrismaRole,
    @Body('reason') reason: string,
    @Req() req: any
  ) {
    if (!role || !reason) throw new BadRequestException('Role and reason are required');
    return this.usersService.changeUserRole(req.user, id, role, reason);
  }

  @Put(':id/reassign-supervisor')
  async reassignSupervisor(
    @Param('id') id: string,
    @Body('supervisorId') supervisorId: string,
    @Body('reason') reason: string,
    @Req() req: any
  ) {
    if (!supervisorId || !reason) throw new BadRequestException('Supervisor ID and reason are required');
    return this.usersService.reassignSupervisor(req.user, id, supervisorId, reason);
  }

  @Put(':id/affiliation')
  async changeAffiliation(
    @Param('id') id: string,
    @Body() body: { facultyId: string; departmentId: string; reason?: string },
    @Req() req: any
  ) {
    if (!body?.facultyId || !body?.departmentId) {
      throw new BadRequestException('Both facultyId and departmentId are required');
    }
    return this.usersService.updateUserAffiliation(req.user, id, body);
  }

  @Post()
  async createUser(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('role') role: PrismaRole,
    @Body('departmentId') departmentId?: string,
    @Body('supervisorId') supervisorId?: string,
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
    @Body('supervisorId') supervisorId?: string,
  ) {
    return this.adminService.updateUser(
      id,
      {
        name,
        email,
        role,
        status,
        departmentId,
        supervisorId,
      },
      req.user.id,
    );
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES, files: 1 } }))
  async importUsers(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Spreadsheet file is required for bulk import.');
    }
    return this.adminService.importUsers(file.buffer, file.originalname);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any
  ) {
    if (!reason) throw new BadRequestException('Reason is required for user deletion');
    return this.usersService.deleteUser(req.user, id, reason);
  }
}

