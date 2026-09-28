import { Test, TestingModule } from '@nestjs/testing';
import { FeedService } from './feed.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FeedService', () => {
  let service: FeedService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      thread: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      publication: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      researchInterest: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('searchFeed should return empty arrays for empty query', async () => {
    const result = await service.searchFeed('');
    expect(result).toEqual({ threads: [], publications: [], users: [] });
  });

  it('searchFeed should query threads, publications, and users with limits', async () => {
    mockPrisma.thread.findMany.mockResolvedValueOnce([{ id: 't1', title: 'AI Research' }]);
    mockPrisma.publication.findMany.mockResolvedValueOnce([{ id: 'p1', title: 'Deep Learning' }]);
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: 'u1', name: 'Dr. Priya' }]);

    const result = await service.searchFeed('AI');
    expect(result.threads).toHaveLength(1);
    expect(result.publications).toHaveLength(1);
    expect(result.users).toHaveLength(1);
  });
});
