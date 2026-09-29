import { Injectable, BadRequestException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../auth/supabase.service';
import { Role, UserStatus } from '@prisma/client';
import * as xlsx from 'xlsx';
import { assertKeepsAnActiveAdmin, assertNotRootAdmin, assertNotSelf, assertProvisionableEmail, isEmailAllowedForImport, parseUserStatus } from './admin-safety';

@Injectable()
export class AdminAdminsService {
  private readonly logger = new Logger(AdminAdminsService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService
  ) {}

  async getAdmins(query: any = {}) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 25);
    const skip = (page - 1) * limit;

    const where: any = { role: Role.INSTITUTE_ADMIN };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sort) {
      const order = query.order === 'asc' ? 'asc' : 'desc';
      if (query.sort === 'name') orderBy = { name: order };
      else if (query.sort === 'email') orderBy = { email: order };
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

  async createAdmin(adminId: string, data: any) {
    const email = String(data.email).trim().toLowerCase();
    assertProvisionableEmail(email);
    
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('User with this email already exists.');
    }

    const admin = await this.prisma.user.create({
      data: {
        name: data.name,
        email,
        role: Role.INSTITUTE_ADMIN,
        status: UserStatus.ACTIVE,
        approved: true,
        onboardingCompleted: true,
      },
    });

    await this.logAudit(adminId, 'CREATE_ADMIN', `Created institute admin ${email}`);

    try {
      if (this.supabaseService.client) {
        await this.supabaseService.client.auth.admin.inviteUserByEmail(email);
        this.logger.log(`Sent Supabase invitation to admin ${email}`);
      }
    } catch (err: any) {
      this.logger.warn(`Pre-provisioned admin ${email} without direct Supabase invite email: ${err.message}`);
    }

    return admin;
  }

  async updateAdminStatus(adminId: string, id: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Admin not found.');
    assertNotRootAdmin(user.email, 'suspended or deactivated');
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

    await this.logAudit(adminId, 'UPDATE_ADMIN_STATUS', `Changed status to ${status} for admin ${user.email}`);
    return updated;
  }

  async updateAdmin(adminId: string, id: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Admin not found.');
    assertNotRootAdmin(user.email, 'modified');
    if (data.email) {
      assertProvisionableEmail(data.email);
      assertNotRootAdmin(data.email, 'reassigned to root email');
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
        employeeId,
      },
    });

    await this.logAudit(adminId, 'UPDATE_ADMIN', `Updated details for admin ${user.email}`);
    return updated;
  }

  async deleteAdmin(adminId: string, id: string) {
    if (adminId === id) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Admin user not found.');
    assertNotRootAdmin(user.email, 'deleted');
    await assertKeepsAnActiveAdmin(this.prisma, user, { deleted: true });

    await this.prisma.user.updateMany({
      where: { supervisorId: id },
      data: { supervisorId: null },
    });

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

    await this.logAudit(adminId, 'DELETE_ADMIN', `Deleted admin ${user.email}`);
    return { success: true };
  }

  async importAdmins(adminId: string, fileBuffer: Buffer, fileName: string) {
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
    const userEmails = new Set(dbUsers.map(u => u.email.toLowerCase()));

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2;
      const email = String(row.email || row.Email || '').trim().toLowerCase();
      const name = String(row.name || row.Name || '').trim();

      if (!email) { report.failedCount++; report.errors.push({ row: rowNum, message: 'Missing email' }); continue; }
      if (!isEmailAllowedForImport(email)) { report.failedCount++; report.errors.push({ row: rowNum, email, message: 'Email domain is not in ALLOWED_EMAIL_DOMAINS' }); continue; }
      if (!name) { report.failedCount++; report.errors.push({ row: rowNum, email, message: 'Missing name' }); continue; }
      if (userEmails.has(email)) { report.failedCount++; report.errors.push({ row: rowNum, email, message: 'User already exists' }); continue; }

      try {
        await this.prisma.user.create({
          data: {
            name, email, role: Role.INSTITUTE_ADMIN, status: UserStatus.ACTIVE, approved: true, onboardingCompleted: true
          }
        });

        try {
          if (this.supabaseService.client) {
            await this.supabaseService.client.auth.admin.inviteUserByEmail(email);
          }
        } catch (invErr: any) {
          this.logger.debug(`Pre-provisioned imported admin ${email}`);
        }

        userEmails.add(email);
        report.successCount++;
        report.successes.push(email);
      } catch (e: any) {
        report.failedCount++;
        report.errors.push({ row: rowNum, email, message: e.message });
      }
    }

    await this.logAudit(adminId, 'IMPORT_ADMINS', `Imported ${report.successCount} admins, ${report.failedCount} failed.`);
    return report;
  }

  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 for performance
    });
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
