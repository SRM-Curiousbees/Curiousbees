import { Injectable, BadRequestException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UserStatus } from '@prisma/client';
import * as xlsx from 'xlsx';
import { assertKeepsAnActiveAdmin, assertNotSelf, assertProvisionableEmail, isEmailAllowedForImport, parseRole, parseUserStatus } from './admin-safety';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  /** Superadmin is permanently protected — no role change, suspension, or deletion */

  async getUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        departmentRef: true,
        supervisor: true,
      },
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    role: Role;
    departmentId?: string;
    supervisorId?: string;
  }) {
    const email = data.email.trim().toLowerCase();
    assertProvisionableEmail(email);
    data.role = parseRole(data.role);

    // Check if user already exists
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('User with this email address already exists.');
    }

    // Provisioned users are created as ACTIVE, approved = true, onboardingCompleted = false
    const status = UserStatus.ACTIVE;
    const approved = true;

    let departmentName: string | null = null;
    let facultyName: string | null = null;
    if (data.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: data.departmentId },
        include: { faculty: true },
      });
      if (!dept) {
        throw new BadRequestException('Selected department does not exist.');
      }
      departmentName = dept.name;
      facultyName = dept.faculty.name;
    }

    let supervisorEmail: string | null = null;
    if (data.supervisorId) {
      const sup = await this.prisma.user.findUnique({ where: { id: data.supervisorId } });
      if (!sup || sup.role !== Role.RESEARCH_SUPERVISOR) {
        throw new BadRequestException('Selected supervisor is not a Research Supervisor.');
      }
      supervisorEmail = sup.email;
    }

    return this.prisma.user.create({
      data: {
        name: data.name,
        email,
        role: data.role,
        department: departmentName,
        departmentId: data.departmentId || null,
        faculty: facultyName,
        supervisorId: data.supervisorId || null,
        supervisorEmail,
        status,
        approved,
        onboardingCompleted: false,
      },
      include: {
        departmentRef: true,
        supervisor: true,
      },
    });
  }

  async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      role?: Role;
      status?: UserStatus;
      departmentId?: string;
      supervisorId?: string;
      onboardingCompleted?: boolean;
    },
    actorId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    if (data.email) assertProvisionableEmail(data.email);
    if (data.role) data.role = parseRole(data.role);
    if (data.status) data.status = parseUserStatus(data.status);
    if ((data.role && data.role !== user.role) || (data.status && data.status !== user.status)) {
      assertNotSelf(actorId, id, 'change the role or status of');
      await assertKeepsAnActiveAdmin(this.prisma, user, { role: data.role, status: data.status });
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email.toLowerCase();
    if (data.role) {
      updateData.role = data.role;
    }
    if (data.status) {
      updateData.status = data.status;
      updateData.approved = data.status === UserStatus.ACTIVE;
      updateData.suspended = data.status === UserStatus.SUSPENDED;
    }
    if (data.onboardingCompleted !== undefined) {
      updateData.onboardingCompleted = data.onboardingCompleted;
    }

    if (data.departmentId !== undefined) {
      updateData.departmentId = data.departmentId || null;
      if (data.departmentId) {
        const dept = await this.prisma.department.findUnique({ where: { id: data.departmentId } });
        updateData.department = dept ? dept.name : null;
      } else {
        updateData.department = null;
      }
    }

    if (data.supervisorId !== undefined) {
      updateData.supervisorId = data.supervisorId || null;
      if (data.supervisorId) {
        const sup = await this.prisma.user.findUnique({ where: { id: data.supervisorId } });
        updateData.supervisorEmail = sup ? sup.email : null;
      } else {
        updateData.supervisorEmail = null;
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        departmentRef: true,
        supervisor: true,
      },
    });
  }

  async deleteUser(id: string, actorId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    assertNotSelf(actorId, id, 'delete');
    await assertKeepsAnActiveAdmin(this.prisma, user, { deleted: true });
    return this.prisma.user.delete({ where: { id } });
  }

  async importUsers(fileBuffer: Buffer, fileName: string) {
    const isCsv = fileName.toLowerCase().endsWith('.csv');
    let rawRows: any[] = [];

    try {
      if (isCsv) {
        const text = fileBuffer.toString('utf-8');
        rawRows = this.parseCsv(text);
      } else {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rawRows = xlsx.utils.sheet_to_json(worksheet);
      }
    } catch (err: any) {
      throw new BadRequestException(`Failed to read spreadsheet file: ${err.message}`);
    }

    const report = {
      total: rawRows.length,
      successCount: 0,
      failedCount: 0,
      errors: [] as { row: number; email?: string; message: string }[],
      successes: [] as string[],
    };

    // Pre-load lookup tables for high performance
    const allUsers = await this.prisma.user.findMany();
    const allFaculties = await this.prisma.faculty.findMany();
    const allDepts = await this.prisma.department.findMany({
      include: { faculty: true }
    });

    const dbUserEmails = new Set(allUsers.map((u) => u.email.toLowerCase()));
    const fileUserEmails = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2; // Row index 1-based header + 1-based row number
      
      const name = String(row.name || row.Name || '').trim();
      const email = String(row.email || row.Email || '').trim().toLowerCase();
      const roleStr = String(row.role || row.Role || '').trim().toUpperCase();
      const facultyStr = String(row.faculty || row.Faculty || '').trim();
      const departmentStr = String(row.department || row.Department || '').trim();
      const employeeId = String(row.employeeId || row.EmployeeId || row.employee_id || row['Employee ID'] || '').trim();

      if (!email) {
        report.failedCount++;
        report.errors.push({ row: rowNum, message: 'Email is missing.' });
        continue;
      }

      if (!isEmailAllowedForImport(email)) {
        report.failedCount++;
        report.errors.push({ row: rowNum, email, message: 'Email domain is not in ALLOWED_EMAIL_DOMAINS.' });
        continue;
      }

      if (!name) {
        report.failedCount++;
        report.errors.push({ row: rowNum, email, message: 'Name is missing.' });
        continue;
      }

      // Check duplicates in file
      if (fileUserEmails.has(email)) {
        report.failedCount++;
        report.errors.push({ row: rowNum, email, message: `Duplicate email inside upload file.` });
        continue;
      }
      fileUserEmails.add(email);

      // Check duplicates in DB
      if (dbUserEmails.has(email)) {
        report.failedCount++;
        report.errors.push({ row: rowNum, email, message: `User already exists in the database.` });
        continue;
      }

      // Validate role
      let role: Role;
      if (roleStr === 'ADMIN' || roleStr === 'INSTITUTE_ADMIN' || roleStr === 'INSTITUTE-ADMIN') {
        role = Role.INSTITUTE_ADMIN;
      } else if (roleStr === 'SUPERVISOR' || roleStr === 'RESEARCH_SUPERVISOR' || roleStr === 'RESEARCH-SUPERVISOR') {
        role = Role.RESEARCH_SUPERVISOR;
      } else if (roleStr === 'SCHOLAR' || roleStr === 'RESEARCH_SCHOLAR' || roleStr === 'RESEARCH-SCHOLAR') {
        role = Role.RESEARCH_SCHOLAR;
      } else {
        report.failedCount++;
        report.errors.push({ row: rowNum, email, message: `Invalid role "${roleStr}". Must be INSTITUTE_ADMIN, RESEARCH_SUPERVISOR, or RESEARCH_SCHOLAR.` });
        continue;
      }

      // Validate faculty
      let matchedFacultyName: string | null = null;
      if (facultyStr) {
        const fac = allFaculties.find(
          (f) => f.name.toLowerCase() === facultyStr.toLowerCase()
        );
        if (fac) {
          matchedFacultyName = fac.name;
        } else {
          report.failedCount++;
          report.errors.push({ row: rowNum, email, message: `Faculty "${facultyStr}" not found in database.` });
          continue;
        }
      }

      // Validate department
      let departmentId: string | null = null;
      let matchedDeptName: string | null = null;
      if (departmentStr) {
        const dept = allDepts.find(
          (d) => d.code.toLowerCase() === departmentStr.toLowerCase() || d.name.toLowerCase() === departmentStr.toLowerCase()
        );
        if (dept) {
          departmentId = dept.id;
          matchedDeptName = dept.name;
          // Verify faculty links if faculty was provided
          if (matchedFacultyName && dept.faculty.name.toLowerCase() !== matchedFacultyName.toLowerCase()) {
            report.failedCount++;
            report.errors.push({ row: rowNum, email, message: `Department "${departmentStr}" does not belong to Faculty "${facultyStr}".` });
            continue;
          }
          if (!matchedFacultyName) {
            matchedFacultyName = dept.faculty.name;
          }
        } else {
          report.failedCount++;
          report.errors.push({ row: rowNum, email, message: `Department "${departmentStr}" not found in database.` });
          continue;
        }
      }

      // Create user record
      try {
        await this.prisma.user.create({
          data: {
            name,
            email,
            role,
            faculty: matchedFacultyName,
            department: matchedDeptName,
            departmentId,
            employeeId: employeeId || null,
            status: UserStatus.ACTIVE,
            approved: true,
            onboardingCompleted: false,
          },
        });
        report.successCount++;
        report.successes.push(`${email} (${role})`);
      } catch (err: any) {
        report.failedCount++;
        report.errors.push({ row: rowNum, email, message: `Failed to create user: ${err.message}` });
      }
    }

    return report;
  }

  private parseCsv(text: string): any[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    
    // Parse header
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Quick CSV cell parser handling quotes
      const cells: string[] = [];
      let currentCell = '';
      let insideQuotes = false;
      
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"' || char === "'") {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());

      const row: any = {};
      for (let h = 0; h < headers.length; h++) {
        row[headers[h]] = cells[h] || '';
      }
      rows.push(row);
    }

    return rows;
  }
}
