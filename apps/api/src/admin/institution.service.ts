import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditHelperService } from './audit-helper';

@Injectable()
export class AdminInstitutionService {
  private readonly logger = new Logger(AdminInstitutionService.name);

  constructor(
    private prisma: PrismaService,
    private auditHelper: AuditHelperService,
  ) {}

  // ─── FACULTIES ─────────────────────────────────────────────────────────────

  async getFaculties() {
    return this.prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      include: {
        campus: true,
        departments: {
          include: {
            _count: {
              select: {
                users: true,
                supervisorProfiles: true,
                scholarProfiles: true,
              },
            },
          },
        },
        _count: {
          select: {
            departments: true,
            supervisorProfiles: true,
            scholarProfiles: true,
          },
        },
      },
    });
  }

  async createFaculty(actor: any, data: { name: string; campusId?: string }) {
    if (!data.name || !data.name.trim()) throw new BadRequestException('Faculty name is required.');
    const trimmed = data.name.trim();

    const existing = await this.prisma.faculty.findUnique({ where: { name: trimmed } });
    if (existing) throw new ConflictException('A faculty with this name already exists.');

    if (data.campusId) {
      const campus = await this.prisma.campus.findUnique({ where: { id: data.campusId } });
      if (!campus) throw new NotFoundException('Selected campus not found.');
    }

    const faculty = await this.prisma.faculty.create({
      data: { 
        name: trimmed,
        campusId: data.campusId || null,
      },
      include: { campus: true },
    });

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'FACULTY_CREATED',
      targetId: faculty.id,
      targetType: 'FACULTY',
      category: 'INSTITUTION',
      severity: 'MEDIUM',
      details: `Faculty "${faculty.name}" created under campus "${faculty.campus?.name || 'None'}".`,
      newState: { name: faculty.name, campusId: faculty.campusId },
    });

    return faculty;
  }

  async updateFaculty(actor: any, id: string, data: { name?: string; campusId?: string }) {
    const faculty = await this.prisma.faculty.findUnique({ where: { id } });
    if (!faculty) throw new NotFoundException('Faculty not found.');

    const updateData: any = {};
    if (data.name && data.name.trim()) updateData.name = data.name.trim();
    if (data.campusId !== undefined) {
      if (data.campusId) {
        const campus = await this.prisma.campus.findUnique({ where: { id: data.campusId } });
        if (!campus) throw new NotFoundException('Selected campus not found.');
      }
      updateData.campusId = data.campusId || null;
    }

    const updated = await this.prisma.faculty.update({
      where: { id },
      data: updateData,
      include: { campus: true },
    });

    // If faculty name changed, synchronize User.faculty for all users under its departments
    if (data.name && data.name.trim() !== faculty.name) {
      const newName = data.name.trim();
      const depts = await this.prisma.department.findMany({ where: { facultyId: id } });
      const deptIds = depts.map(d => d.id);
      if (deptIds.length > 0) {
        await this.prisma.user.updateMany({
          where: { departmentId: { in: deptIds } },
          data: { faculty: newName },
        });
      }
    }

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'FACULTY_UPDATED',
      targetId: id,
      targetType: 'FACULTY',
      category: 'INSTITUTION',
      severity: 'LOW',
      details: `Faculty updated. Renamed from "${faculty.name}" to "${updated.name}".`,
      previousState: { name: faculty.name, campusId: faculty.campusId },
      newState: { name: updated.name, campusId: updated.campusId },
    });

    return updated;
  }

  async deleteFaculty(actor: any, id: string) {
    const faculty = await this.prisma.faculty.findUnique({ where: { id } });
    if (!faculty) throw new NotFoundException('Faculty not found.');

    const deptCount = await this.prisma.department.count({ where: { facultyId: id } });
    if (deptCount > 0) {
      throw new BadRequestException(`Cannot delete faculty "${faculty.name}": it has ${deptCount} departments. Remove or reassign departments first.`);
    }

    await this.prisma.faculty.delete({ where: { id } });

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'FACULTY_DELETED',
      targetId: id,
      targetType: 'FACULTY',
      category: 'INSTITUTION',
      severity: 'HIGH',
      details: `Faculty "${faculty.name}" deleted.`,
    });

    return { success: true };
  }

  // ─── DEPARTMENTS ───────────────────────────────────────────────────────────

  async getDepartments() {
    return this.prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        faculty: {
          include: {
            campus: true,
          },
        },
        _count: {
          select: {
            users: true,
            supervisorProfiles: true,
            scholarProfiles: true,
          },
        },
      },
    });
  }

  async createDepartment(actor: any, data: { name: string; code: string; facultyId: string; description?: string }) {
    if (!data.name || !data.code || !data.facultyId) {
      throw new BadRequestException('Name, code, and faculty are required.');
    }

    const faculty = await this.prisma.faculty.findUnique({ where: { id: data.facultyId } });
    if (!faculty) throw new NotFoundException('Selected faculty not found.');

    const existing = await this.prisma.department.findUnique({ where: { code: data.code.trim().toUpperCase() } });
    if (existing) throw new ConflictException(`Department code "${data.code}" already exists.`);

    const dept = await this.prisma.department.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        facultyId: data.facultyId,
        description: data.description || null,
      },
      include: { 
        faculty: {
          include: { campus: true }
        } 
      },
    });

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'DEPARTMENT_CREATED',
      targetId: dept.id,
      targetType: 'DEPARTMENT',
      category: 'INSTITUTION',
      severity: 'MEDIUM',
      details: `Department "${dept.name}" (${dept.code}) created under Faculty "${faculty.name}".`,
      newState: { name: dept.name, code: dept.code, faculty: faculty.name },
    });

    return dept;
  }

  async updateDepartment(actor: any, id: string, data: { name?: string; code?: string; facultyId?: string; description?: string }) {
    const dept = await this.prisma.department.findUnique({ 
      where: { id },
      include: { faculty: true }
    });
    if (!dept) throw new NotFoundException('Department not found.');

    const updateData: any = {};
    if (data.name) updateData.name = data.name.trim();
    if (data.code) updateData.code = data.code.trim().toUpperCase();
    if (data.facultyId) {
      const newFaculty = await this.prisma.faculty.findUnique({ where: { id: data.facultyId } });
      if (!newFaculty) throw new NotFoundException('Selected new faculty not found.');
      updateData.facultyId = data.facultyId;
    }
    if (data.description !== undefined) updateData.description = data.description;

    const updated = await this.prisma.department.update({
      where: { id },
      data: updateData,
      include: { faculty: { include: { campus: true } } },
    });

    // Synchronize denormalized department name across users and opportunities
    if (data.name && data.name.trim() !== dept.name) {
      const newDeptName = data.name.trim();
      await this.prisma.user.updateMany({
        where: { departmentId: id },
        data: { department: newDeptName },
      });
      await this.prisma.opportunity.updateMany({
        where: { departmentId: id },
        data: { department: newDeptName },
      });
    }

    // If faculty changed, synchronize user faculty name and profiles
    if (data.facultyId && data.facultyId !== dept.facultyId) {
      await this.prisma.user.updateMany({
        where: { departmentId: id },
        data: { faculty: updated.faculty.name },
      });
      await this.prisma.supervisorProfile.updateMany({
        where: { departmentId: id },
        data: { facultyId: data.facultyId },
      });
      await this.prisma.scholarProfile.updateMany({
        where: { departmentId: id },
        data: { facultyId: data.facultyId },
      });
    }

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'DEPARTMENT_UPDATED',
      targetId: id,
      targetType: 'DEPARTMENT',
      category: 'INSTITUTION',
      severity: 'LOW',
      details: `Department "${dept.name}" updated.`,
      previousState: { name: dept.name, code: dept.code, facultyId: dept.facultyId },
      newState: { name: updated.name, code: updated.code, facultyId: updated.facultyId },
    });

    return updated;
  }

  async deleteDepartment(actor: any, id: string) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found.');

    // Prevent destructive deletion if any researchers or dependent records exist
    const userCount = await this.prisma.user.count({ where: { departmentId: id } });
    const oppCount = await this.prisma.opportunity.count({ where: { departmentId: id } });
    const eventCount = await this.prisma.event.count({ where: { departmentId: id } });

    if (userCount > 0 || oppCount > 0 || eventCount > 0) {
      throw new BadRequestException(
        `Cannot delete department "${dept.name}": ${userCount} researchers, ${oppCount} opportunities, and ${eventCount} events are attached. Reassign them first.`
      );
    }

    await this.prisma.department.delete({ where: { id } });

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'DEPARTMENT_DELETED',
      targetId: id,
      targetType: 'DEPARTMENT',
      category: 'INSTITUTION',
      severity: 'HIGH',
      details: `Department "${dept.name}" deleted.`,
    });

    return { success: true };
  }

  // ─── CAMPUSES ──────────────────────────────────────────────────────────────

  async getCampuses() {
    return this.prisma.campus.findMany({
      orderBy: { name: 'asc' },
      include: {
        faculties: {
          select: {
            id: true,
            name: true,
            _count: {
              select: { departments: true },
            },
          },
        },
      },
    });
  }

  async createCampus(actor: any, data: { name: string; code: string; location?: string }) {
    if (!data.name || !data.code) throw new BadRequestException('Campus name and code are required.');

    const campus = await this.prisma.campus.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        location: data.location || null,
        status: 'ACTIVE',
      },
    });

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CAMPUS_CREATED',
      targetId: campus.id,
      targetType: 'CAMPUS',
      category: 'INSTITUTION',
      severity: 'LOW',
      details: `Campus "${campus.name}" created.`,
      newState: { name: campus.name, code: campus.code },
    });

    return campus;
  }

  async updateCampus(actor: any, id: string, data: { name?: string; code?: string; location?: string; status?: string }) {
    const campus = await this.prisma.campus.findUnique({ where: { id } });
    if (!campus) throw new NotFoundException('Campus not found.');

    const updated = await this.prisma.campus.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        code: data.code ? data.code.trim().toUpperCase() : undefined,
        location: data.location !== undefined ? data.location : undefined,
        status: data.status ? data.status : undefined,
      },
    });

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CAMPUS_UPDATED',
      targetId: id,
      targetType: 'CAMPUS',
      category: 'INSTITUTION',
      severity: 'LOW',
      details: `Campus "${campus.name}" updated.`,
      previousState: campus,
      newState: updated,
    });

    return updated;
  }
}
