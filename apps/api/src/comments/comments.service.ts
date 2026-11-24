import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentInput } from '@curiousbees/types';
import { CreateCommentSchema } from '@curiousbees/shared-utils';
import { NotificationsService } from '../notifications/notifications.service';
import { PUBLIC_AUTHOR_SELECT } from '../users/discovery';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  async getCommentsByThread(threadId: string, userId?: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, hidden: true, authorId: true },
    });
    if (!thread || (thread.hidden && thread.authorId !== userId)) {
      throw new NotFoundException('Research thread not found.');
    }

    return this.prisma.comment.findMany({
      where: { threadId, parentId: null },
      include: {
        author: {
          select: PUBLIC_AUTHOR_SELECT
        },
        _count: { select: { likes: true } },
        likes: userId ? { where: { userId } } : false,
        replies: {
          include: {
            author: {
              select: PUBLIC_AUTHOR_SELECT
            },
            _count: { select: { likes: true } },
            likes: userId ? { where: { userId } } : false,
            replies: {
              include: {
                author: {
                  select: PUBLIC_AUTHOR_SELECT
                },
                _count: { select: { likes: true } },
                likes: userId ? { where: { userId } } : false,
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async createComment(authorId: string, input: CreateCommentInput) {
    const parsed = CreateCommentSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors[0].message);
    }

    const { content, threadId, parentId } = parsed.data;

    // Check if thread exists and is not hidden by moderation
    const threadExists = await this.prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, hidden: true, authorId: true },
    });
    if (!threadExists || threadExists.hidden) {
      throw new NotFoundException('The thread does not exist.');
    }

    if (parentId) {
      const parentExists = await this.prisma.comment.findUnique({
        where: { id: parentId }
      });
      if (!parentExists || parentExists.threadId !== threadId) {
        throw new BadRequestException('The parent comment does not exist.');
      }
    }

    const newComment = await this.prisma.comment.create({
      data: {
        content,
        threadId,
        authorId,
        parentId
      },
      include: {
        author: {
          select: PUBLIC_AUTHOR_SELECT
        }
      }
    });

    // Notify the thread author (in-app + push)
    if (threadExists.authorId !== authorId) {
      const replierName = newComment.author?.name || 'A research colleague';
      const bodySnippet = content.substring(0, 60) + (content.length > 60 ? '...' : '');

      // In-app notification (persisted to DB — shown in notification bell)
      this.notifications.sendNotification(
        'New Interaction on your post',
        `${replierName} commented: "${bodySnippet}"`,
        threadExists.authorId,
        'COMMENT',
        `/feed/${threadId}`
      ).catch(e => console.error('Comment notification failed:', e));

      // FCM Push Alert (async, non-blocking)
      this.notifications.sendPushToUser(threadExists.authorId, {
        title: 'New Discussion Reply! 💬',
        body: `${replierName} commented: "${bodySnippet}"`,
        url: `/feed/${threadId}`
      }).catch(e => console.error('FCM Dispatch Failed:', e));
    }

    return newComment;
  }

  async updateComment(userId: string, commentId: string, content: string) {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Content cannot be empty');
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('You can only edit your own comments');

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: {
        author: {
          select: PUBLIC_AUTHOR_SELECT
        },
        _count: { select: { likes: true } }
      }
    });
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('You can only delete your own comments');

    await this.prisma.comment.delete({
      where: { id: commentId }
    });
    
    return { success: true };
  }

  async toggleLike(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) throw new NotFoundException('Comment not found');

    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId
        }
      }
    });

    if (existingLike) {
      await this.prisma.commentLike.delete({
        where: { id: existingLike.id }
      });
      const likeCount = await this.prisma.commentLike.count({ where: { commentId } });
      return { liked: false, likeCount };
    } else {
      await this.prisma.commentLike.create({
        data: {
          commentId,
          userId
        }
      });
      const likeCount = await this.prisma.commentLike.count({ where: { commentId } });
      return { liked: true, likeCount };
    }
  }
}
