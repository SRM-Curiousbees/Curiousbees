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

  it('never returns publications hidden by moderation (PostgreSQL search)', async () => {
    await service.searchFeed('graph');
    expect(mockPrisma.publication.findMany.mock.calls[0][0].where).toMatchObject({ hidden: false });
    expect(mockPrisma.thread.findMany.mock.calls[0][0].where).toMatchObject({ hidden: false });
  });

  it('finds people by role, not by whether their name contains "admin"', async () => {
    await service.searchFeed('Padmini');
    const where = mockPrisma.user.findMany.mock.calls[0][0].where;
    expect(where.role).toEqual({ in: ['RESEARCH_SCHOLAR', 'RESEARCH_SUPERVISOR'] });
    expect(where.NOT).toBeUndefined();
  });

  it('applies the same filters when hydrating OpenSearch hits', async () => {
    process.env.OPENSEARCH_ENDPOINT = 'http://127.0.0.1:1';
    const os = new SearchService(mockPrisma);
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      hits: { hits: [
        { _source: { docType: 'publication', id: 'p-hidden' } },
        { _source: { docType: 'user', id: 'u-admin' } },
      ] },
    }), { status: 200 }));
    try {
      await os.searchFeed('anything');
    } finally {
      fetchSpy.mockRestore();
    }
    expect(mockPrisma.publication.findMany.mock.calls[0][0].where).toEqual({ id: { in: ['p-hidden'] }, hidden: false });
    expect(mockPrisma.user.findMany.mock.calls[0][0].where).toMatchObject({ role: { in: ['RESEARCH_SCHOLAR', 'RESEARCH_SUPERVISOR'] } });
  });
});
