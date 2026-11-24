import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CollaborationsService } from './collaborations.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('CollaborationsService (Batch Statuses)', () => {
  let service: CollaborationsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      researchCollabRequest: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      researchCollaboration: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: { sendNotification: jest.fn() } },
      ],
    }).compile();

    service = module.get<CollaborationsService>(CollaborationsService);
  });

  it('rejects more than 50 userIds', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `u-${i}`);
    await expect(service.getCollaborationStatuses('me', ids)).rejects.toThrow(BadRequestException);
  });

  it('resolves PENDING_SENT, PENDING_RECEIVED, ACTIVE, and NONE in 2 queries', async () => {
    mockPrisma.researchCollabRequest.findMany.mockResolvedValueOnce([
      { id: 'req-sent', requesterId: 'me', recipientId: 'u1', status: 'PENDING' },
      { id: 'req-recv', requesterId: 'u2', recipientId: 'me', status: 'PENDING' },
    ]);
    mockPrisma.researchCollaboration.findMany.mockResolvedValueOnce([
      { id: 'col-1', requesterId: 'u3', recipientId: 'me', status: 'ACTIVE' },
    ]);

    const res = await service.getCollaborationStatuses('me', ['me', 'u1', 'u2', 'u3', 'u4']);

    expect(mockPrisma.researchCollabRequest.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.researchCollaboration.findMany).toHaveBeenCalledTimes(1);
    expect(res).toEqual({
      u1: { status: 'PENDING_SENT', requestId: 'req-sent' },
      u2: { status: 'PENDING_RECEIVED', requestId: 'req-recv' },
      u3: { status: 'ACTIVE', collaborationId: 'col-1' },
      u4: { status: 'NONE' },
    });
  });
});
