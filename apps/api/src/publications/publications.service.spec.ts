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

  it('findAll and findOne omit user email from projections', async () => {
    await service.findAll();
    const listArgs = mockPrisma.publication.findMany.mock.calls[0][0];
    expect(listArgs.include.user.select).not.toHaveProperty('email');

    mockPrisma.publication.findUnique.mockResolvedValueOnce({ id: 'pub-1', hidden: false, userId: 'u1' });
    await service.findOne('pub-1');
    const oneArgs = mockPrisma.publication.findUnique.mock.calls[0][0];
    expect(oneArgs.include.user.select).not.toHaveProperty('email');
  });

  it('update and remove enforce ownership and throw ForbiddenException for unauthorized users', async () => {
    mockPrisma.publication.findUnique.mockResolvedValue({
      id: 'pub-1',
      hidden: false,
      userId: 'scholar-1',
    });

    await expect(service.update('pub-1', 'other-scholar', 'RESEARCH_SCHOLAR', { title: 'X' })).rejects.toThrow(
      ForbiddenException
    );
    await expect(service.remove('pub-1', 'other-supervisor', 'RESEARCH_SUPERVISOR')).rejects.toThrow(
      ForbiddenException
    );
  });
});
