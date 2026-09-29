import { Injectable, BadRequestException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../auth/supabase.service';
import { Role, UserStatus } from '@prisma/client';
import * as xlsx from 'xlsx';
import { assertKeepsAnActiveAdmin, assertNotSelf, assertProvisionableEmail, isEmailAllowedForImport, parseUserStatus } from './admin-safety';

@Injectable()
export class AdminScholarsService {
  private readonly logger = new Logger(AdminScholarsService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService
  ) {}

  async getScholars(query: any = {}) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 25);
    const skip = (page - 1) * limit;

    const where: any = { role: Role.RESEARCH_SCHOLAR };

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

    if (query.supervisorId) {
      where.supervisorId = query.supervisorId;
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
          supervisor: true,
          scholarProfile: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
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

  async createScholar(adminId: string, data: any) {
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

    let supervisorEmail: string | null = null;
    if (data.supervisorId) {
      const sup = await this.prisma.user.findUnique({ where: { id: data.supervisorId } });
      if (sup) supervisorEmail = sup.email;
    }

    const scholar = await this.prisma.user.create({
      data: {
        name: data.name,
        email,
        role: Role.RESEARCH_SCHOLAR,
        department: departmentName,
        departmentId: data.departmentId || null,
        faculty: facultyName,
        supervisorId: data.supervisorId || null,
        supervisorEmail,
        status: UserStatus.ACTIVE,
        approved: true,
        onboardingCompleted: true,
        employeeId: data.employeeId || null,
        scholarProfile: data.departmentId && data.facultyId ? {
          create: {
            facultyId: data.facultyId,
            departmentId: data.departmentId,
            researchArea: data.researchArea || 'General Research',
          }
        } : undefined
      },
      include: {
        departmentRef: true,
        supervisor: true,
        scholarProfile: true,
      },
    });

    await this.logAudit(adminId, 'CREATE_SCHOLAR', `Created scholar ${email}`);

    try {
      if (this.supabaseService.client) {
        await this.supabaseService.client.auth.admin.inviteUserByEmail(email);
        this.logger.log(`Sent Supabase invitation to scholar ${email}`);
      }
    } catch (err: any) {
      this.logger.warn(`Pre-provisioned scholar ${email} without direct Supabase invite email: ${err.message}`);
    }

    return scholar;
  }

  async updateScholarStatus(adminId: string, id: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Scholar not found.');
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

    await this.logAudit(adminId, 'UPDATE_SCHOLAR_STATUS', `Changed status to ${status} for scholar ${user.email}`);
    return updated;
  }

  async assignSupervisor(adminId: string, scholarId: string, supervisorId: string) {
    const scholar = await this.prisma.user.findUnique({ where: { id: scholarId } });
    if (!scholar) throw new BadRequestException('Scholar not found.');

    const supervisor = await this.prisma.user.findUnique({ where: { id: supervisorId } });
    if (!supervisor) throw new BadRequestException('Supervisor not found.');

    const updated = await this.prisma.user.update({
      where: { id: scholarId },
      data: {
        supervisorId: supervisor.id,
        supervisorEmail: supervisor.email,
      },
      include: { supervisor: true }
    });

    await this.logAudit(adminId, 'ASSIGN_SUPERVISOR', `Assigned supervisor ${supervisor.email} to scholar ${scholar.email}`);
  }

  async updateScholar(adminId: string, id: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Scholar not found.');
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

    let supervisorEmail = user.supervisorEmail;
    if (data.supervisorId) {
      const sup = await this.prisma.user.findUnique({ where: { id: data.supervisorId } });
      if (sup) supervisorEmail = sup.email;
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
        supervisorId: data.supervisorId || null,
        supervisorEmail,
        employeeId,
      },
    });

    if (resolvedFacultyId || data.departmentId) {
      await this.prisma.scholarProfile.updateMany({
        where: { userId: id },
        data: {
          ...(data.departmentId && { departmentId: data.departmentId }),
          ...(resolvedFacultyId && { facultyId: resolvedFacultyId }),
        },
      });
    }

    await this.logAudit(adminId, 'UPDATE_SCHOLAR', `Updated details for scholar ${user.email}`);
    return updated;
  }

  async deleteScholar(adminId: string, id: string) {
    if (adminId === id) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Scholar not found.');
    await assertKeepsAnActiveAdmin(this.prisma, user, { deleted: true });

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

    await this.logAudit(adminId, 'DELETE_SCHOLAR', `Deleted scholar ${user.email}`);
    return { success: true };
  }

  async importScholars(adminId: string, fileBuffer: Buffer, fileName: string) {
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
    const dbFaculties = await this.prisma.faculty.findMany();
    const dbDepts = await this.prisma.department.findMany({ include: { faculty: true } });
    const userEmails = new Set(dbUsers.map(u => u.email.toLowerCase()));

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2;
      const email = String(row.email || row.Email || '').trim().toLowerCase();
      const name = String(row.name || row.Name || '').trim();
      const facultyStr = String(row.faculty || row.Faculty || '').trim();
      const departmentStr = String(row.department || row.Department || '').trim();
      const supervisorStr = String(row.supervisor || row.Supervisor || '').trim().toLowerCase();

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

      let supervisorId = null;
      let supervisorEmail = null;
      if (supervisorStr) {
        const sup = dbUsers.find(u => u.role === Role.RESEARCH_SUPERVISOR && (u.email.toLowerCase() === supervisorStr || u.name?.toLowerCase() === supervisorStr));
        if (sup) {
          supervisorId = sup.id;
          supervisorEmail = sup.email;
        } else {
          report.failedCount++; report.errors.push({ row: rowNum, email, message: `Supervisor '${supervisorStr}' not found.` }); continue;
        }
      }

      try {
        await this.prisma.user.create({
          data: {
            name, email, role: Role.RESEARCH_SCHOLAR, status: UserStatus.ACTIVE, approved: true, onboardingCompleted: true,
            faculty: facultyName, department: departmentName, departmentId, supervisorId, supervisorEmail,
            scholarProfile: facultyId && departmentId ? {
              create: { facultyId, departmentId, researchArea: 'Imported Scholar' }
            } : undefined
          }
        });

        try {
          if (this.supabaseService.client) {
            await this.supabaseService.client.auth.admin.inviteUserByEmail(email);
          }
        } catch (invErr: any) {
          this.logger.debug(`Pre-provisioned imported scholar ${email}`);
        }

        userEmails.add(email);
        report.successCount++;
        report.successes.push(email);
      } catch (e: any) {
        report.failedCount++;
        report.errors.push({ row: rowNum, email, message: e.message });
      }
    }

    await this.logAudit(adminId, 'IMPORT_SCHOLARS', `Imported ${report.successCount} scholars, ${report.failedCount} failed.`);
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
