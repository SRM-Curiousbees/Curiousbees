import { Test, TestingModule } from '@nestjs/testing';
import { ThreadsService } from './threads.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ThreadsService (Pagination & Feed)', () => {
  let service: ThreadsService;
  let mockPrisma: any;
  let mockNotifications: any;

  beforeEach(async () => {
    mockPrisma = {
      thread: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    mockNotifications = {
      createNotification: jest.fn(),
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

  it('getThreads should support cursor-based pagination', async () => {
    await service.getThreads(undefined, undefined, undefined, 'u1', 'latest', 'thread_abc123', 20);

    expect(mockPrisma.thread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        skip: 1,
        cursor: { id: 'thread_abc123' },
      })
    );
  });
});
