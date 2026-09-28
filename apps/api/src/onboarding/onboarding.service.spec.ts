import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../users/mail.service';
import { BadRequestException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';

describe('Institutional Hierarchy & Onboarding Validation', () => {
  let service: OnboardingService;
  let mockPrisma: any;
  let mockNotifications: any;
  let mockMail: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      department: {
        findUnique: jest.fn(),
      },
      faculty: {
        findUnique: jest.fn(),
      },
      supervisorProfile: {
        upsert: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      scholarProfile: {
        upsert: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
      userInterest: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      researchInterest: {
        upsert: jest.fn().mockResolvedValue({ id: 'int-1', name: 'AI' }),
      },
    };

    mockNotifications = {
      notifyScholarRegistrationSubmitted: jest.fn(),
      notifySupervisorRegistrationSubmitted: jest.fn(),
    };

    mockMail = {
      sendWelcomeEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: NotificationsService,
          useValue: mockNotifications,
        },
        {
          provide: MailService,
          useValue: mockMail,
        },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  it('should reject department from Faculty A paired with Faculty B', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'scholar-1',
      email: 'scholar@srmist.edu.in',
      role: Role.RESEARCH_SCHOLAR,
    });

    // Department belongs to Faculty A ('fac-A')
    mockPrisma.department.findUnique.mockResolvedValue({
      id: 'dept-1',
      name: 'Computing Technologies',
      facultyId: 'fac-A',
      faculty: {
        id: 'fac-A',
        name: 'Faculty of Engineering & Technology',
        campus: { id: 'campus-ktr', name: 'Kattankulathur' },
      },
    });

    // Scholar attempts to pass Faculty B ('fac-B') with Department from Faculty A
    await expect(
      service.onboardScholar('scholar-1', {
        facultyId: 'fac-B',
        departmentId: 'dept-1',
        researchArea: 'Artificial Intelligence',
      })
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.onboardScholar('scholar-1', {
        facultyId: 'fac-B',
        departmentId: 'dept-1',
        researchArea: 'Artificial Intelligence',
      })
    ).rejects.toThrow('The selected department does not belong to the selected faculty.');
  });

  it('should reject non-existent department', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'scholar-1',
      email: 'scholar@srmist.edu.in',
      role: Role.RESEARCH_SCHOLAR,
    });

    mockPrisma.department.findUnique.mockResolvedValue(null);

    await expect(
      service.onboardScholar('scholar-1', {
        facultyId: 'fac-A',
        departmentId: 'non-existent-dept',
        researchArea: 'Artificial Intelligence',
      })
    ).rejects.toThrow('Selected department not found.');
  });

  it('should successfully establish canonical hierarchy for valid faculty and department', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'supervisor-1',
      email: 'supervisor@srmist.edu.in',
      role: Role.RESEARCH_SUPERVISOR,
    });

    mockPrisma.department.findUnique.mockResolvedValue({
      id: 'dept-cse',
      name: 'Computing Technologies',
      facultyId: 'fac-fet',
      faculty: {
        id: 'fac-fet',
        name: 'Faculty of Engineering & Technology',
        campus: { id: 'campus-ktr', name: 'Kattankulathur', code: 'KTR' },
      },
    });

    mockPrisma.user.update.mockResolvedValue({
      id: 'supervisor-1',
      departmentId: 'dept-cse',
      department: 'Computing Technologies',
      faculty: 'Faculty of Engineering & Technology',
      onboardingCompleted: true,
    });

    const result = await service.onboardSupervisor('supervisor-1', {
      facultyId: 'fac-fet',
      departmentId: 'dept-cse',
      designation: 'Professor',
      researchArea: 'AI Systems',
      employeeId: 'EMP-12345',
    });

    expect(result.departmentId).toBe('dept-cse');
    expect(result.department).toBe('Computing Technologies');
    expect(result.faculty).toBe('Faculty of Engineering & Technology');

    // Verify User update was called with authoritative relational departmentId
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'supervisor-1' },
        data: expect.objectContaining({
          departmentId: 'dept-cse',
          department: 'Computing Technologies',
          faculty: 'Faculty of Engineering & Technology',
          onboardingCompleted: true,
        }),
      })
    );

    // Verify supervisorProfile was upserted with relational departmentId and facultyId
    expect(mockPrisma.supervisorProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'supervisor-1' },
        create: expect.objectContaining({
          facultyId: 'fac-fet',
          departmentId: 'dept-cse',
        }),
      })
    );

    // Verify institutional audit log was created
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'SUPERVISOR_ONBOARDING_COMPLETED',
          userId: 'supervisor-1',
        }),
      })
    );
  });
});
