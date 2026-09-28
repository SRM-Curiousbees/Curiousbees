import { Test, TestingModule } from '@nestjs/testing';
import { PublicationsService } from './publications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('PublicationsService (Pagination & Authorization)', () => {
  let service: PublicationsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      publication: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicationsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PublicationsService>(PublicationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll should cap limit at 50 and filter hidden: false', async () => {
    await service.findAll(undefined, undefined, 200, 'quantum');

    expect(mockPrisma.publication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        where: expect.objectContaining({
          hidden: false,
        }),
      })
    );
  });

  it('remove should throw ForbiddenException if user is not author or supervisor/admin', async () => {
    mockPrisma.publication.findUnique.mockResolvedValueOnce({
      id: 'pub-1',
      userId: 'scholar-1',
    });

    await expect(service.remove('pub-1', 'other-user', 'RESEARCH_SCHOLAR')).rejects.toThrow(
      ForbiddenException
    );
  });
});
