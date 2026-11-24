import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('CommentsService (Privacy, Moderation & Deep-links)', () => {
  let service: CommentsService;
  let mockPrisma: any;
  let mockNotifications: any;

  beforeEach(async () => {
    mockPrisma = {
      thread: {
        findUnique: jest.fn(),
      },
      comment: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    mockNotifications = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
      sendPushToUser: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  it('getCommentsByThread blocks hidden threads for non-authors and omits author email', async () => {
    mockPrisma.thread.findUnique.mockResolvedValueOnce({ id: 't1', hidden: true, authorId: 'author-1' });
    await expect(service.getCommentsByThread('t1', 'other-user')).rejects.toThrow(NotFoundException);

    mockPrisma.thread.findUnique.mockResolvedValueOnce({ id: 't1', hidden: false, authorId: 'author-1' });
    await service.getCommentsByThread('t1', 'other-user');
    const args = mockPrisma.comment.findMany.mock.calls[0][0];
    expect(args.include.author.select).not.toHaveProperty('email');
    expect(args.include.replies.include.author.select).not.toHaveProperty('email');
  });

  it('createComment rejects hidden threads and sends /feed/:id notification deep-link', async () => {
    const validThreadId = 'cm12345678901234567890123';
    mockPrisma.thread.findUnique.mockResolvedValueOnce({ id: validThreadId, hidden: true, authorId: 'author-1' });
    await expect(service.createComment('u2', { threadId: validThreadId, content: 'Nice work' })).rejects.toThrow(NotFoundException);

    mockPrisma.thread.findUnique.mockResolvedValueOnce({ id: validThreadId, hidden: false, authorId: 'author-1' });
    mockPrisma.comment.create.mockResolvedValueOnce({
      id: 'c1',
      content: 'Great findings!',
      author: { id: 'u2', name: 'Scholar Two' },
    });

    await service.createComment('u2', { threadId: validThreadId, content: 'Great findings!' });

    expect(mockPrisma.comment.create.mock.calls[0][0].include.author.select).not.toHaveProperty('email');
    expect(mockNotifications.sendNotification).toHaveBeenCalledWith(
      'New Interaction on your post',
      expect.stringContaining('Scholar Two commented:'),
      'author-1',
      'COMMENT',
      `/feed/${validThreadId}`,
    );
    expect(mockNotifications.sendPushToUser).toHaveBeenCalledWith(
      'author-1',
      expect.objectContaining({ url: `/feed/${validThreadId}` }),
    );
  });
});
