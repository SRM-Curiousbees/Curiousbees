import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { AdminUsersService } from './users.service';
import { Role as PrismaRole } from '@prisma/client';

@Controller('admin/users')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(Role.INSTITUTE_ADMIN)
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

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

