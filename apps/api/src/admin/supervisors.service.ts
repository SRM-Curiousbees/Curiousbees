import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../auth/supabase.service';
import { Role, UserStatus } from '@prisma/client';
import * as xlsx from 'xlsx';
import { assertKeepsAnActiveAdmin, assertNotSelf, assertProvisionableEmail, isEmailAllowedForImport, parseUserStatus } from './admin-safety';

@Injectable()
export class AdminSupervisorsService {
  private readonly logger = new Logger(AdminSupervisorsService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService
  ) {}

  async getSupervisors(query: any = {}) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 25);
    const skip = (page - 1) * limit;

    const where: any = { role: Role.RESEARCH_SUPERVISOR };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { employeeId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.department) {
      where.OR = [
        { department: { contains: query.department, mode: 'insensitive' } },
        { departmentId: query.department }
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.access) {
      if (query.access === 'MATCHED') {
        where.supabaseAuthId = { not: null };
        where.employeeId = { not: null };
      } else if (query.access === 'UNMATCHED') {
        where.supabaseAuthId = null;
      } else if (query.access === 'REQUIRES REVIEW') {
        where.supabaseAuthId = { not: null };
        where.employeeId = null;
      }
    }

    if (query.hasScholars === 'YES') {
      where.scholars = { some: {} };
    } else if (query.hasScholars === 'NO') {
      where.scholars = { none: {} };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sort) {
      const order = query.order === 'asc' ? 'asc' : 'desc';
      if (query.sort === 'name') orderBy = { name: order };
      else if (query.sort === 'employeeId') orderBy = { employeeId: order };
      else if (query.sort === 'department') orderBy = { department: order };
      else if (query.sort === 'status') orderBy = { status: order };
      else if (query.sort === 'createdAt') orderBy = { createdAt: order };
    }

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          departmentRef: true,
          supervisorProfile: true,
          _count: {
            select: { scholars: true }
          }
        },
      }),
    ]);

    const formattedData = data.map(s => ({
      ...s,
      scholarCount: s._count.scholars,
      _count: undefined,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async createSupervisor(adminId: string, data: any) {
    const email = String(data.email).trim().toLowerCase();
    assertProvisionableEmail(email);
    
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('User with this email already exists.');
    }

    let departmentName: string | null = null;
    let facultyName: string | null = null;

    if (data.departmentId) {
      const dept = await this.prisma.department.findUnique({ 
        where: { id: data.departmentId },
        include: { faculty: true }
      });
      if (dept) {
        departmentName = dept.name;
        facultyName = dept.faculty.name;
      }
    }

    const supervisor = await this.prisma.user.create({
      data: {
        name: data.name,
        email,
        role: Role.RESEARCH_SUPERVISOR,
        department: departmentName,
        departmentId: data.departmentId || null,
        faculty: facultyName,
        status: UserStatus.ACTIVE,
        approved: true,
        onboardingCompleted: !!(data.departmentId && data.facultyId),
        employeeId: data.employeeId || null,
        supervisorProfile: data.departmentId && data.facultyId ? {
          create: {
            facultyId: data.facultyId,
            departmentId: data.departmentId,
            designation: data.designation || 'Supervisor',
            employeeId: data.employeeId || `EMP-${Date.now()}`,
          }
        } : undefined
      },
      include: {
        departmentRef: true,
        supervisorProfile: true,
      },
    });

    await this.logAudit(adminId, 'CREATE_SUPERVISOR', `Created supervisor ${email}`);

    try {
      if (this.supabaseService.client) {
        await this.supabaseService.client.auth.admin.inviteUserByEmail(email);
        this.logger.log(`Sent Supabase invitation to supervisor ${email}`);
      }
    } catch (err: any) {
      this.logger.warn(`Pre-provisioned supervisor ${email} without direct Supabase invite email: ${err.message}`);
    }

    return supervisor;
  }

  async updateSupervisorStatus(adminId: string, id: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Supervisor not found.');
    status = parseUserStatus(status);
    if (status !== user.status) {
      assertNotSelf(adminId, id, 'change the status of');
      await assertKeepsAnActiveAdmin(this.prisma, user, { status });
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status,
        approved: status === UserStatus.ACTIVE,
        suspended: status === UserStatus.SUSPENDED,
      },
    });

    await this.logAudit(adminId, 'UPDATE_SUPERVISOR_STATUS', `Changed status to ${status} for supervisor ${user.email}`);
  }

  async updateSupervisor(adminId: string, id: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Supervisor not found.');
    if (data.email) assertProvisionableEmail(data.email);

    let departmentName = user.department;
    let facultyName = user.faculty;
    let resolvedFacultyId: string | null = null;
    if (data.departmentId) {
      const dept = await this.prisma.department.findUnique({ 
        where: { id: data.departmentId },
        include: { faculty: true }
      });
      if (dept) {
        departmentName = dept.name;
        facultyName = dept.faculty?.name || user.faculty;
        resolvedFacultyId = dept.facultyId;
      }
    }

    // Extract employeeId from email prefix
    let employeeId = user.employeeId;
    if (data.email) {
      const prefix = data.email.split('@')[0];
      employeeId = prefix.toUpperCase();
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email?.toLowerCase(),
        department: departmentName,
        departmentId: data.departmentId || null,
        faculty: facultyName,
        employeeId,
      },
    });

    if (data.designation || resolvedFacultyId || data.departmentId) {
      await this.prisma.supervisorProfile.updateMany({
        where: { userId: id },
        data: {
          ...(data.designation && { designation: data.designation }),
          ...(employeeId && { employeeId }),
          ...(data.departmentId && { departmentId: data.departmentId }),
          ...(resolvedFacultyId && { facultyId: resolvedFacultyId }),
        },
      });
    }

    await this.logAudit(adminId, 'UPDATE_SUPERVISOR', `Updated details for supervisor ${user.email}`);
    return updated;
  }

  async deleteSupervisor(adminId: string, id: string) {
    if (adminId === id) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Supervisor not found.');
    await assertKeepsAnActiveAdmin(this.prisma, user, { deleted: true });

    // 1. Unlink any scholars assigned to this supervisor
    await this.prisma.user.updateMany({
      where: { supervisorId: id },
      data: { supervisorId: null },
    });

    // 2. Delete dependent records cleanly in transaction
    await this.prisma.$transaction([
      this.prisma.scholarSupervisorRequest.deleteMany({ where: { OR: [{ scholarId: id }, { supervisorId: id }] } }),
      this.prisma.report.deleteMany({ where: { OR: [{ scholarId: id }, { supervisorId: id }] } }),
      this.prisma.researchConnection.deleteMany({ where: { OR: [{ requesterId: id }, { receiverId: id }] } }),
      this.prisma.comment.deleteMany({ where: { authorId: id } }),
      this.prisma.thread.deleteMany({ where: { authorId: id } }),
      this.prisma.supervisorProfile.deleteMany({ where: { userId: id } }),
      this.prisma.scholarProfile.deleteMany({ where: { userId: id } }),
      this.prisma.userInterest.deleteMany({ where: { userId: id } }),
      this.prisma.notificationToken.deleteMany({ where: { userId: id } }),
      this.prisma.notification.deleteMany({ where: { userId: id } }),
      this.prisma.workspaceMember.deleteMany({ where: { userId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    await this.logAudit(adminId, 'DELETE_SUPERVISOR', `Deleted supervisor ${user.email}`);
    return { success: true };
  }

  async importSupervisors(adminId: string, fileBuffer: Buffer, fileName: string) {
    const isCsv = fileName.toLowerCase().endsWith('.csv');
    let rawRows: any[] = [];

    try {
      if (isCsv) {
        rawRows = this.parseCsv(fileBuffer.toString('utf-8'));
      } else {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      }
    } catch (err: any) {
      throw new BadRequestException(`Failed to read file: ${err.message}`);
    }

    const report = { total: rawRows.length, successCount: 0, failedCount: 0, errors: [] as any[], successes: [] as string[] };
    
    const dbUsers = await this.prisma.user.findMany();
    const dbDepts = await this.prisma.department.findMany({ include: { faculty: true } });
    const userEmails = new Set(dbUsers.map(u => u.email.toLowerCase()));

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2;
      const email = String(row.email || row.Email || '').trim().toLowerCase();
      const name = String(row.name || row.Name || '').trim();
      const departmentStr = String(row.department || row.Department || '').trim();
      const designationStr = String(row.designation || row.Designation || 'Supervisor').trim();
      const employeeIdStr = String(row.employeeId || row.EmployeeId || '').trim();

      if (!email) { report.failedCount++; report.errors.push({ row: rowNum, message: 'Missing email' }); continue; }
      if (!isEmailAllowedForImport(email)) { report.failedCount++; report.errors.push({ row: rowNum, email, message: 'Email domain is not in ALLOWED_EMAIL_DOMAINS' }); continue; }
      if (!name) { report.failedCount++; report.errors.push({ row: rowNum, email, message: 'Missing name' }); continue; }
      if (userEmails.has(email)) { report.failedCount++; report.errors.push({ row: rowNum, email, message: 'User already exists' }); continue; }

      let facultyId = null;
      let departmentId = null;
      let facultyName = null;
      let departmentName = null;

      if (departmentStr) {
        const dept = dbDepts.find(d => d.name.toLowerCase() === departmentStr.toLowerCase() || d.code.toLowerCase() === departmentStr.toLowerCase());
        if (dept) {
          departmentId = dept.id;
          departmentName = dept.name;
          facultyId = dept.facultyId;
          facultyName = dept.faculty.name;
        } else {
          report.failedCount++; report.errors.push({ row: rowNum, email, message: `Department '${departmentStr}' not found.` }); continue;
        }
      }

      try {
        await this.prisma.user.create({
          data: {
            name, email, role: Role.RESEARCH_SUPERVISOR, status: UserStatus.ACTIVE, approved: true, onboardingCompleted: !!(facultyId && departmentId),
            faculty: facultyName, department: departmentName, departmentId, employeeId: employeeIdStr || null,
            supervisorProfile: facultyId && departmentId ? {
              create: { facultyId, departmentId, designation: designationStr, employeeId: employeeIdStr || `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}` }
            } : undefined
          }
        });

        // Send Supabase invitation for imported user if admin configured
        try {
          if (this.supabaseService.client) {
            await this.supabaseService.client.auth.admin.inviteUserByEmail(email);
          }
        } catch (invErr: any) {
          this.logger.debug(`Pre-provisioned imported supervisor ${email}`);
        }

        userEmails.add(email);
        report.successCount++;
        report.successes.push(email);
      } catch (e: any) {
        report.failedCount++;
        report.errors.push({ row: rowNum, email, message: e.message });
      }
    }

    await this.logAudit(adminId, 'IMPORT_SUPERVISORS', `Imported ${report.successCount} supervisors, ${report.failedCount} failed.`);
    return report;
  }

  private parseCsv(text: string): any[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cells: string[] = [];
      let current = ''; let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        if (line[c] === '"' || line[c] === "'") inQuotes = !inQuotes;
        else if (line[c] === ',' && !inQuotes) { cells.push(current.trim()); current = ''; }
        else current += line[c];
      }
      cells.push(current.trim());
      const row: any = {};
      for (let h = 0; h < headers.length; h++) row[headers[h]] = cells[h] || '';
      rows.push(row);
    }
    return rows;
  }

  private async logAudit(userId: string, action: string, details: string) {
    try {
      await this.prisma.auditLog.create({
        data: { userId, action, details }
      });
    } catch (e) {
      this.logger.error('Failed to write audit log', e);
    }
  }
}
