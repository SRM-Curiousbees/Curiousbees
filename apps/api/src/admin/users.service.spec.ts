import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditHelperService } from './audit-helper';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('AdminUsersService - Institutional Affiliation', () => {
  let service: AdminUsersService;
  let mockPrisma: any;
  let mockAuditHelper: any;

  const mockActor = {
    id: 'admin-1',
    email: 'admin@curiousbees.edu',
    name: 'Admin User',
    role: 'INSTITUTE_ADMIN',
  };

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      department: {
        findUnique: jest.fn(),
      },
      scholarProfile: {
        upsert: jest.fn(),
      },
      supervisorProfile: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    };

    mockAuditHelper = {
      log: jest.fn().mockResolvedValue({ id: 'log-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditHelperService,
          useValue: mockAuditHelper,
        },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException if user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.updateUserAffiliation(mockActor, 'non-existent-user', {
        facultyId: 'fac-1',
        departmentId: 'dept-1',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if department does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      role: Role.RESEARCH_SCHOLAR,
    });
    mockPrisma.department.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.updateUserAffiliation(mockActor, 'user-1', {
        facultyId: 'fac-1',
        departmentId: 'dept-999',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject invalid combination where department does not belong to selected faculty', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      role: Role.RESEARCH_SCHOLAR,
    });
    mockPrisma.department.findUnique.mockResolvedValueOnce({
      id: 'dept-1',
      name: 'Computer Science and Engineering',
      facultyId: 'fac-engineering',
      faculty: {
        id: 'fac-engineering',
        name: 'Faculty of Engineering and Technology',
        campus: { name: 'Kattankulathur' },
      },
    });

    // Passing wrong facultyId 'fac-science'
    await expect(
      service.updateUserAffiliation(mockActor, 'user-1', {
        facultyId: 'fac-science',
        departmentId: 'dept-1',
      }),
    ).rejects.toThrow(
      'Invalid department/faculty combination: The selected department does not belong to the selected faculty.',
    );
  });

  it('should successfully update user and sync scholarProfile when valid', async () => {
    const existingUser = {
      id: 'scholar-1',
      email: 'scholar@curiousbees.edu',
      name: 'Scholar User',
      role: Role.RESEARCH_SCHOLAR,
      faculty: 'Old Faculty',
      department: 'Old Dept',
      departmentId: 'old-dept-id',
    };

    const targetDept = {
      id: 'dept-1',
      name: 'Computer Science and Engineering',
      facultyId: 'fac-engineering',
      faculty: {
        id: 'fac-engineering',
        name: 'Faculty of Engineering and Technology',
        campus: { name: 'Kattankulathur' },
      },
    };

    const updatedUser = {
      ...existingUser,
      departmentId: targetDept.id,
      department: targetDept.name,
      faculty: targetDept.faculty.name,
      departmentRef: targetDept,
    };

    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.department.findUnique.mockResolvedValueOnce(targetDept);
    mockPrisma.user.update.mockResolvedValueOnce(updatedUser);

    const result = await service.updateUserAffiliation(mockActor, 'scholar-1', {
      facultyId: 'fac-engineering',
      departmentId: 'dept-1',
      reason: 'Departmental transfer',
    });

    // User update called with relational fields
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'scholar-1' },
      data: {
        departmentId: targetDept.id,
        department: targetDept.name,
        faculty: targetDept.faculty.name,
      },
      include: expect.any(Object),
    });

    // ScholarProfile upserted
    expect(mockPrisma.scholarProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'scholar-1' },
      create: expect.objectContaining({
        facultyId: 'fac-engineering',
        departmentId: 'dept-1',
      }),
      update: {
        facultyId: 'fac-engineering',
        departmentId: 'dept-1',
      },
    });

    // Audit log recorded
    expect(mockAuditHelper.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_AFFILIATION_UPDATED',
        targetId: 'scholar-1',
        category: 'INSTITUTION',
        severity: 'MEDIUM',
      }),
    );

    expect(result).toEqual(updatedUser);
  });

  it('should successfully update user and sync supervisorProfile when role is RESEARCH_SUPERVISOR', async () => {
    const existingUser = {
      id: 'sup-1',
      email: 'supervisor@curiousbees.edu',
      name: 'Supervisor User',
      role: Role.RESEARCH_SUPERVISOR,
      faculty: 'Old Faculty',
      department: 'Old Dept',
      departmentId: null,
      employeeId: 'EMP-12345',
    };

    const targetDept = {
      id: 'dept-1',
      name: 'Computer Science and Engineering',
      facultyId: 'fac-engineering',
      faculty: {
        id: 'fac-engineering',
        name: 'Faculty of Engineering and Technology',
        campus: { name: 'Kattankulathur' },
      },
    };

    const updatedUser = {
      ...existingUser,
      departmentId: targetDept.id,
      department: targetDept.name,
      faculty: targetDept.faculty.name,
      departmentRef: targetDept,
    };

    mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
    mockPrisma.department.findUnique.mockResolvedValueOnce(targetDept);
    mockPrisma.user.update.mockResolvedValueOnce(updatedUser);

    await service.updateUserAffiliation(mockActor, 'sup-1', {
      facultyId: 'fac-engineering',
      departmentId: 'dept-1',
    });

    // SupervisorProfile upserted
    expect(mockPrisma.supervisorProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'sup-1' },
      create: expect.objectContaining({
        facultyId: 'fac-engineering',
        departmentId: 'dept-1',
        employeeId: 'EMP-12345',
      }),
      update: {
        facultyId: 'fac-engineering',
        departmentId: 'dept-1',
      },
    });
  });

  it('should reject affiliation update for the permanent root admin', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'root-admin-id',
      email: 'srmcuriousbees@gmail.com',
      role: Role.INSTITUTE_ADMIN,
    });

    await expect(
      service.updateUserAffiliation(mockActor, 'root-admin-id', {
        facultyId: 'fac-1',
        departmentId: 'dept-1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
