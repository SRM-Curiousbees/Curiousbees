import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ThreadsService (Pagination, Privacy & Moderation)', () => {
  let service: ThreadsService;
  let mockPrisma: any;
  let mockNotifications: any;

  beforeEach(async () => {
    mockPrisma = {
      thread: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      savedThread: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      moderationReport: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'mod-1' }),
      },
      threadReport: {
        create: jest.fn().mockResolvedValue({ id: 'tr-1' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'aud-1' }),
      },
    };

    mockNotifications = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThreadsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: NotificationsService,
          useValue: mockNotifications,
        },
      ],
    }).compile();

    service = module.get<ThreadsService>(ThreadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getThreads should enforce max limit <= 50 and hidden: false', async () => {
    await service.getThreads(undefined, undefined, undefined, 'u1', 'latest', undefined, 100);

    expect(mockPrisma.thread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50, // Capped at max 50 even if client requested 100
        where: expect.objectContaining({
          hidden: false,
        }),
      })
    );
  });

  it('getThreads should support cursor-based pagination and omit author email', async () => {
    await service.getThreads(undefined, undefined, undefined, 'u1', 'latest', 'thread_abc123', 20);

    const args = mockPrisma.thread.findMany.mock.calls[0][0];
    expect(args).toMatchObject({
      take: 20,
      skip: 1,
      cursor: { id: 'thread_abc123' },
    });
    expect(args.where.author).toEqual({ status: 'ACTIVE', suspended: false });
    expect(args.include.author.select).not.toHaveProperty('email');
    expect(args.include.comments.include.author.select).not.toHaveProperty('email');
  });

  it('getThreadCounts and getSavedThreads exclude hidden posts and omit author email', async () => {
    await service.getThreadCounts(undefined, 'u1');
    expect(mockPrisma.thread.groupBy.mock.calls[0][0].where.hidden).toBe(false);
    expect(mockPrisma.savedThread.count.mock.calls[0][0].where).toEqual({
      userId: 'u1',
      thread: { hidden: false },
    });

    await service.getSavedThreads('u1');
    const savedArgs = mockPrisma.savedThread.findMany.mock.calls[0][0];
    expect(savedArgs.where.thread.hidden).toBe(false);
    expect(savedArgs.include.thread.include.author.select).not.toHaveProperty('email');
  });

  it('rejects like, save, share, report, and collaboration requests on hidden posts', async () => {
    mockPrisma.thread.findUnique.mockResolvedValue({ id: 't1', hidden: true, authorId: 'u2', title: 'Hidden' });

    await expect(service.toggleLike('t1', 'u1')).rejects.toThrow(NotFoundException);
    await expect(service.toggleSave('t1', 'u1')).rejects.toThrow(NotFoundException);
    await expect(service.shareThread('t1', 'u1', 'COPY_LINK')).rejects.toThrow(NotFoundException);
    await expect(service.reportThread('t1', 'u1', 'Spam')).rejects.toThrow(NotFoundException);
    await expect(service.requestCollaboration('t1', 'u1', 'Hi')).rejects.toThrow(NotFoundException);
  });

  it('getThreadPublic requires active non-suspended author and hidden: false', async () => {
    await service.getThreadPublic('t1');
    const args = mockPrisma.thread.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({
      id: 't1',
      hidden: false,
      author: { status: 'ACTIVE', suspended: false },
    });
    expect(args.include.author.select).not.toHaveProperty('email');
  });

  it('reportThread creates a ModerationReport (targetType POST), preserves ThreadReport, and blocks duplicates', async () => {
    mockPrisma.thread.findUnique.mockResolvedValue({ id: 't1', hidden: false });

    const res = await service.reportThread('t1', 'u1', 'Spam', 'Promotional link');
    expect(mockPrisma.moderationReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reporterId: 'u1',
        targetType: 'POST',
        targetId: 't1',
        reason: 'Spam',
        status: 'OPEN',
      }),
    });
    expect(mockPrisma.threadReport.create).toHaveBeenCalled();
    expect(res).toMatchObject({ id: 'tr-1', moderationReportId: 'mod-1' });

    mockPrisma.moderationReport.findFirst.mockResolvedValueOnce({ id: 'mod-1' });
    await expect(service.reportThread('t1', 'u1', 'Spam')).rejects.toThrow(BadRequestException);
  });
});
