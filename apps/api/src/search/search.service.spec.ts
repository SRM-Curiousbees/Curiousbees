import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  let mockPrisma: any;

  beforeEach(async () => {
    delete process.env.OPENSEARCH_ENDPOINT;

    mockPrisma = {
      thread: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      publication: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should report not configured when OPENSEARCH_ENDPOINT is empty', () => {
    expect(service.isConfigured()).toBe(false);
  });

  it('searchFeed should return empty arrays for empty query', async () => {
    const result = await service.searchFeed('');
    expect(result).toEqual({ threads: [], publications: [], users: [] });
  });

  it('searchFeed should fall back to PostgreSQL and query threads, publications, users', async () => {
    mockPrisma.thread.findMany.mockResolvedValueOnce([{ id: 't1', title: 'AI Research' }]);
    mockPrisma.publication.findMany.mockResolvedValueOnce([{ id: 'p1', title: 'Deep Learning' }]);
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: 'u1', name: 'Dr. Priya' }]);

    const result = await service.searchFeed('AI');
    expect(result.threads).toHaveLength(1);
    expect(result.publications).toHaveLength(1);
    expect(result.users).toHaveLength(1);
  });
});
