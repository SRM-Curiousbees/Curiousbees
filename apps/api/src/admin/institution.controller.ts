import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { AdminInstitutionService } from './institution.service';

@Controller('admin/institution')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(Role.INSTITUTE_ADMIN)
export class AdminInstitutionController {
  constructor(private readonly institutionService: AdminInstitutionService) {}

  @Get('faculties')
  async getFaculties() {
    return this.institutionService.getFaculties();
  }

  @Post('faculties')
  async createFaculty(@Body() body: any, @Req() req: any) {
    const name = typeof body === 'string' ? body : body?.name;
    if (!name) throw new BadRequestException('Faculty name is required');
    return this.institutionService.createFaculty(req.user, {
      name,
      campusId: body?.campusId,
    });
  }

  @Put('faculties/:id')
  async updateFaculty(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const name = typeof body === 'string' ? body : body?.name;
    return this.institutionService.updateFaculty(req.user, id, {
      name,
      campusId: body?.campusId,
    });
  }

  @Delete('faculties/:id')
  async deleteFaculty(@Param('id') id: string, @Req() req: any) {
    return this.institutionService.deleteFaculty(req.user, id);
  }

  @Get('departments')
  async getDepartments() {
    return this.institutionService.getDepartments();
  }

  @Post('departments')
  async createDepartment(@Body() body: any, @Req() req: any) {
    return this.institutionService.createDepartment(req.user, body);
  }

  @Put('departments/:id')
  async updateDepartment(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.institutionService.updateDepartment(req.user, id, body);
  }

  @Delete('departments/:id')
  async deleteDepartment(@Param('id') id: string, @Req() req: any) {
    return this.institutionService.deleteDepartment(req.user, id);
  }

  @Get('campuses')
  async getCampuses() {
    return this.institutionService.getCampuses();
  }

  @Post('campuses')
  async createCampus(@Body() body: any, @Req() req: any) {
    return this.institutionService.createCampus(req.user, body);
  }

  @Put('campuses/:id')
  async updateCampus(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.institutionService.updateCampus(req.user, id, body);
  }
}
