import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThreadInput } from '@curiousbees/types';
import { CreateThreadSchema } from '@curiousbees/shared-utils';
import { NotificationsService } from '../notifications/notifications.service';
import { FilesService } from '../files/files.service';

@Injectable()
export class ThreadsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Optional() private files?: FilesService,
  ) {}

  async getThreads(
    search?: string, 
    tag?: string, 
    type?: string, 
    userId?: string, 
    sort?: 'latest' | 'top',
    cursor?: string,
    limit?: number,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const threads = await this.prisma.thread.findMany({
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: {
        hidden: false,
        ...(tag && {
          tags: {
            has: tag
          }
        }),
        ...(type && type !== 'ALL' && {
          type: type as any
        }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            faculty: true,
            department: true,
            departmentId: true,
            departmentRef: {
              select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } },
            },
            followers: userId ? {
              where: { followerId: userId },
              select: { id: true }
            } : undefined
          }
        },
        attachments: true,
        saves: userId ? {
          where: { userId }
        } : undefined,
        likes: userId ? {
          where: { userId }
        } : undefined,
        comments: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
                department: true
              }
            },
            _count: { select: { likes: true } },
            likes: userId ? { where: { userId } } : false
          }
        },
        _count: {
          select: { comments: true, likes: true, shares: true, saves: true }
        }
      },
      orderBy: sort === 'top' ? [
        { likes: { _count: 'desc' } },
        { comments: { _count: 'desc' } },
        { createdAt: 'desc' }
      ] : {
        createdAt: 'desc'
      }
    });

    return threads;
  }

  async getThreadCounts(search?: string, userId?: string) {
    const whereClause: any = search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ]
    } : undefined;

    const counts = await this.prisma.thread.groupBy({
      by: ['type'],
      _count: { _all: true },
      where: whereClause
    });

    const totalCount = await this.prisma.thread.count({
      where: whereClause
    });

    let savedCount = 0;
    if (userId) {
      savedCount = await this.prisma.savedThread.count({
        where: { userId }
      });
    }

    const result: Record<string, number> = { ALL: totalCount, SAVED: savedCount, saved: savedCount };
    counts.forEach(c => {
      result[c.type as string] = (c as any)._count._all;
    });

    return result;
  }

  async getThreadById(id: string, userId?: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            faculty: true,
            department: true,
            departmentId: true,
            departmentRef: {
              select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } },
            },
            bio: true
          }
        },
        attachments: true,
        saves: userId ? {
          where: { userId }
        } : undefined,
        likes: userId ? {
          where: { userId }
        } : undefined,
        _count: {
          select: { comments: true, likes: true, shares: true, saves: true }
        },
        comments: {
          where: { parentId: null },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                faculty: true,
                department: true
              }
            },
            _count: { select: { likes: true } },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                    faculty: true,
                    department: true
                  }
                },
                _count: { select: { likes: true } }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    // Posts hidden by moderation stay visible to their author only.
    if (!thread || (thread.hidden && thread.authorId !== userId)) {
      throw new NotFoundException('Research thread not found.');
    }

    return thread;
  }

  async getThreadPublic(id: string) {
    return this.prisma.thread.findFirst({
      where: { id, hidden: false },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            faculty: true,
            department: true,
          }
        },
        attachments: true,
        _count: {
          select: { comments: true, likes: true, shares: true }
        },
        comments: {
          where: { parentId: null },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
                department: true
              }
            },
            _count: { select: { likes: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async createThread(authorId: string, input: CreateThreadInput) {
    const parsed = CreateThreadSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors[0].message);
    }

    const { title, content, tags, type, isPaper, paperJournal, attachments } = parsed.data;

    return this.prisma.thread.create({
      data: {
        title,
        content,
        tags,
        type: type || 'TEXT',
        isPaper: isPaper || false,
        paperJournal,
        authorId,
        attachments: attachments && attachments.length > 0 ? {
          create: attachments.map(att => ({
            name: att.name,
            url: att.url,
            size: att.size,
            type: att.type
          }))
        } : undefined
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            faculty: true,
            department: true
          }
        },
        attachments: true,
        saves: authorId ? {
          where: { userId: authorId }
        } : undefined,
        likes: authorId ? {
          where: { userId: authorId }
        } : undefined,
        _count: {
          select: { comments: true, likes: true, shares: true, saves: true }
        }
      }
    });
  }

  async toggleLike(threadId: string, userId: string) {
    const existing = await this.prisma.threadLike.findUnique({
      where: {
        threadId_userId: { threadId, userId }
      }
    });

    if (existing) {
      await this.prisma.threadLike.delete({ where: { id: existing.id } });
      const likeCount = await this.prisma.threadLike.count({ where: { threadId } });
      return { liked: false, likeCount };
    } else {
      await this.prisma.threadLike.create({
        data: { threadId, userId }
      });
      const likeCount = await this.prisma.threadLike.count({ where: { threadId } });

      // Send in-app notification to post author (if not self-like)
      try {
        const thread = await this.prisma.thread.findUnique({
          where: { id: threadId },
          select: { authorId: true, title: true }
        });
        if (thread && thread.authorId !== userId) {
          const liker = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true }
          });
          const likerName = liker?.name || 'A researcher';
          const postSnippet = thread.title?.substring(0, 50) || 'your post';
          this.notifications.sendNotification(
            'New Interaction on your post',
            `${likerName} liked "${postSnippet}"`,
            thread.authorId
          ).catch(e => console.error('Like notification failed:', e));
        }
      } catch (e) {
        // Non-blocking — don't fail the like action if notification fails
        console.error('Like notification error:', e);
      }

      return { liked: true, likeCount };
    }
  }

  async toggleSave(threadId: string, userId: string) {
    const existing = await this.prisma.savedThread.findUnique({
      where: {
        threadId_userId: { threadId, userId }
      }
    });

    if (existing) {
      await this.prisma.savedThread.delete({ where: { id: existing.id } });
      await this.prisma.auditLog.create({
        data: { userId, action: 'Post Unsaved', details: `Unsaved thread ${threadId}` }
      });
      return { saved: false };
    } else {
      await this.prisma.savedThread.create({
        data: { threadId, userId }
      });
      await this.prisma.auditLog.create({
        data: { userId, action: 'Post Saved', details: `Saved thread ${threadId}` }
      });
      return { saved: true };
    }
  }

  async shareThread(threadId: string, userId: string, platform?: string) {
    return this.prisma.threadShare.create({
      data: {
        threadId,
        userId,
        platform
      }
    });
  }

  async reportThread(threadId: string, reporterId: string, reason: string, description?: string) {
    if (!reason) {
      throw new BadRequestException('Reason is required');
    }
    const report = await this.prisma.threadReport.create({
      data: {
        threadId,
        reporterId,
        reason,
        description
      }
    });
    await this.prisma.auditLog.create({
      data: { userId: reporterId, action: 'Post Reported', details: `Reported thread ${threadId} for ${reason}` }
    });
    return report;
  }

  async requestCollaboration(threadId: string, scholarId: string, message?: string) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    return this.prisma.collaborationRequest.create({
      data: {
        scholarId,
        threadId,
        message
      }
    });
  }

  async getSavedThreads(userId: string) {
    const saved = await this.prisma.savedThread.findMany({
      where: { userId },
      include: {
        thread: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                faculty: true,
                department: true
              }
            },
            attachments: true,
            saves: {
              where: { userId }
            },
            likes: {
              where: { userId }
            },
            _count: {
              select: { comments: true, likes: true, shares: true, saves: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return saved.map(s => s.thread);
  }

  async deleteThread(threadId: string, userId: string) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId } });
    // Only the author may delete through this endpoint. (The previous check read the
    // *author's* role, which let anyone delete an admin's post.) Moderators remove
    // posts through /admin/content, which records the moderation in the audit log.
    if (!thread || thread.authorId !== userId) {
      throw new BadRequestException('Unauthorized or thread not found');
    }
    await this.prisma.thread.delete({ where: { id: threadId } });
    await this.prisma.auditLog.create({
      data: { userId, action: 'Post Deleted', details: `Deleted thread ${threadId}` }
    });
    return { success: true };
  }

  async updateThread(threadId: string, userId: string, data: Partial<CreateThreadInput>) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread || thread.authorId !== userId) {
      throw new BadRequestException('Unauthorized or thread not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { attachments, ...updateData } = data; // skip attachment editing for now

    const updated = await this.prisma.thread.update({
      where: { id: threadId },
      data: updateData as any, // Cast to any to handle type diffs, or selectively pick fields
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            faculty: true,
            department: true
          }
        },
        attachments: true,
        saves: userId ? {
          where: { userId }
        } : undefined,
        likes: userId ? {
          where: { userId }
        } : undefined,
        _count: {
          select: { comments: true, likes: true, shares: true, saves: true }
        }
      }
    });
    
    await this.prisma.auditLog.create({
      data: { userId, action: 'Post Edited', details: `Edited thread ${threadId}` }
    });

    return updated;
  }

  async createFileUpload(userId: string, input: { filename: string; contentType: string; sizeBytes: number }) {
    if (!this.files) {
      throw new BadRequestException('File storage service is not available.');
    }

    // Thread/post attachments are strictly restricted to 10 MB
    const MAX_THREAD_ATTACHMENT_BYTES = 10 * 1024 * 1024;
    if (input.sizeBytes > MAX_THREAD_ATTACHMENT_BYTES) {
      throw new BadRequestException('Post attachments must be less than 10 MB.');
    }

    // Feed posts strictly allow ONLY research documents and images:
    const POST_ALLOWED_TYPES: Record<string, string[]> = {
      'application/pdf': ['pdf'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/webp': ['webp'],
    };

    const type = (input.contentType || '').toLowerCase().trim();
    if (!POST_ALLOWED_TYPES[type]) {
      throw new BadRequestException(
        'Only research documents (PDF, Word .doc/.docx) and images (JPEG, PNG, WebP) are permitted for feed posts.',
      );
    }

    const safeName = this.files.validateUpload(input.filename, input.contentType, input.sizeBytes);
    const storageKey = this.files.buildObjectKey('threads', 'posts', userId, safeName);
    const presigned = await this.files.createPresignedUpload(storageKey, input.contentType.toLowerCase(), input.sizeBytes);
    return {
      ...presigned,
      downloadPath: `/api/threads/files/download?key=${encodeURIComponent(storageKey)}`,
    };
  }

  async getFileDownload(storageKey: string) {
    if (!this.files) {
      throw new BadRequestException('File storage service is not available.');
    }
    if (!this.files.isWellFormedKey(storageKey)) {
      throw new BadRequestException('Invalid storage key.');
    }
    // Only post attachments are served here. Workspace files are private to their
    // members and must go through WorkspacesService, which checks membership.
    if (!storageKey.startsWith('threads/')) {
      throw new ForbiddenException('This file is not a post attachment.');
    }
    return this.files.createPresignedDownload(storageKey);
  }
}
