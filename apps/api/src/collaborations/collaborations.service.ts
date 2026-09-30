import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CollaborationsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── VALIDATION HELPERS ────────────────────────────────────────────────────

  private assertResearcherRole(role: string) {
    if (role !== 'RESEARCH_SUPERVISOR' && role !== 'RESEARCH_SCHOLAR') {
      throw new ForbiddenException('Only Research Supervisors and Research Scholars can participate in research collaborations.');
    }
  }

  // ─── SEND REQUEST ──────────────────────────────────────────────────────────

  async sendRequest(requesterId: string, recipientId: string, threadId?: string, message?: string) {
    if (requesterId === recipientId) {
      throw new BadRequestException('You cannot send a collaboration request to yourself.');
    }

    const [requester, recipient] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: requesterId }, select: { id: true, name: true, role: true } }),
      this.prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, name: true, role: true } }),
    ]);

    if (!requester) throw new NotFoundException('Requester not found.');
    if (!recipient) throw new NotFoundException('Target researcher not found.');

    this.assertResearcherRole(requester.role);
    this.assertResearcherRole(recipient.role);

    // Validate thread exists if provided
    if (threadId) {
      const thread = await this.prisma.thread.findUnique({ where: { id: threadId } });
      if (!thread) throw new NotFoundException('Research post not found.');
    }

    // Prevent duplicate pending requests for the same context
    const existingPending = await this.prisma.researchCollabRequest.findFirst({
      where: {
        requesterId,
        recipientId,
        threadId: threadId || null,
        status: 'PENDING',
      },
    });
    if (existingPending) {
      throw new BadRequestException('You already have a pending collaboration request for this research context.');
    }

    // Prevent if active collaboration already exists for same context
    const existingActive = await this.prisma.researchCollaboration.findFirst({
      where: {
        OR: [
          { requesterId, recipientId, threadId: threadId || null, status: 'ACTIVE' },
          { requesterId: recipientId, recipientId: requesterId, threadId: threadId || null, status: 'ACTIVE' },
        ],
      },
    });
    if (existingActive) {
      throw new BadRequestException('An active collaboration already exists for this research context.');
    }

    const request = await this.prisma.researchCollabRequest.create({
      data: {
        requesterId,
        recipientId,
        threadId: threadId || null,
        message: message || null,
      },
      include: {
        requester: { select: { id: true, name: true, role: true, department: true, image: true } },
        recipient: { select: { id: true, name: true, role: true, department: true, image: true } },
        thread: { select: { id: true, title: true } },
      },
    });

    // Send notification to recipient
    await this.notifications.sendNotification(
      'New Collaboration Request',
      `${requester.name || 'A researcher'} wants to collaborate with you.`,
      recipientId,
      'COLLABORATION_REQUEST',
      `/nexus?view=requests`,
    );

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'COLLAB_REQUEST_SENT',
        details: `Sent collaboration request to ${recipient.name} (${recipientId})${threadId ? ` for thread ${threadId}` : ''}`,
      },
    });

    return request;
  }

  // ─── GET MY REQUESTS ───────────────────────────────────────────────────────

  async getMyRequests(userId: string) {
    const [sent, received] = await Promise.all([
      this.prisma.researchCollabRequest.findMany({
        where: { requesterId: userId },
        include: {
          requester: { select: { id: true, name: true, role: true, department: true, image: true } },
          recipient: { select: { id: true, name: true, role: true, department: true, image: true } },
          thread: { select: { id: true, title: true, content: true, tags: true, authorId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.researchCollabRequest.findMany({
        where: { recipientId: userId },
        include: {
          requester: { select: { id: true, name: true, role: true, department: true, image: true } },
          recipient: { select: { id: true, name: true, role: true, department: true, image: true } },
          thread: { select: { id: true, title: true, content: true, tags: true, authorId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return { sent, received };
  }

  // ─── CANCEL REQUEST ────────────────────────────────────────────────────────

  async cancelRequest(requestId: string, userId: string) {
    const request = await this.prisma.researchCollabRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Collaboration request not found.');
    if (request.requesterId !== userId) throw new ForbiddenException('Only the requester can cancel this request.');
    if (request.status !== 'PENDING') throw new BadRequestException('Only pending requests can be cancelled.');

    return this.prisma.researchCollabRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });
  }

  // ─── ACCEPT REQUEST ────────────────────────────────────────────────────────

  async acceptRequest(requestId: string, userId: string, provider?: any) {
    const request = await this.prisma.researchCollabRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        recipient: { select: { id: true, name: true, email: true, role: true } },
        thread: { select: { id: true, title: true } },
      },
    });
    if (!request) throw new NotFoundException('Collaboration request not found.');
    if (request.recipientId !== userId) throw new ForbiddenException('Only the recipient can accept this request.');
    if (request.status !== 'PENDING') throw new BadRequestException('Only pending requests can be accepted.');

    // Create workspace for the collaboration with selected provider
    const threadTitle = request.thread?.title || 'Research Collaboration';
    const workspace = await this.prisma.workspace.create({
      data: {
        title: `Collaboration: ${threadTitle}`,
        description: `Research collaboration workspace between ${request.requester.name || request.requester.email} and ${request.recipient.name || request.recipient.email}.`,
        collaborationProvider: provider === 'ZOOM_WORKPLACE' ? 'ZOOM_WORKPLACE' : provider === 'EXTERNAL' ? 'EXTERNAL' : 'GOOGLE_WORKSPACE',
      },
    });

    // Add both researchers as workspace members
    await Promise.all([
      this.prisma.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: request.requesterId, role: 'MEMBER' },
      }),
      this.prisma.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: request.recipientId, role: 'MEMBER' },
      }),
    ]);

    // Create the active collaboration
    const collaboration = await this.prisma.researchCollaboration.create({
      data: {
        requesterId: request.requesterId,
        recipientId: request.recipientId,
        threadId: request.threadId,
        workspaceId: workspace.id,
        status: 'ACTIVE',
      },
      include: {
        requester: { select: { id: true, name: true, role: true, department: true, image: true } },
        recipient: { select: { id: true, name: true, role: true, department: true, image: true } },
        thread: { select: { id: true, title: true } },
      },
    });

    // Update request status
    await this.prisma.researchCollabRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });

    // Notify requester
    const recipientName = request.recipient.name || 'A researcher';
    await this.notifications.sendNotification(
      'Collaboration Accepted',
      `${recipientName} accepted your research collaboration request.`,
      request.requesterId,
      'COLLABORATION_ACCEPTED',
      `/nexus?collab=${collaboration.id}`,
    );

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'COLLAB_REQUEST_ACCEPTED',
        details: `Accepted collaboration request ${requestId} from ${request.requester.name}`,
      },
    });

    return collaboration;
  }

  // ─── DECLINE REQUEST ───────────────────────────────────────────────────────

  async declineRequest(requestId: string, userId: string) {
    const request = await this.prisma.researchCollabRequest.findUnique({
      where: { id: requestId },
      include: {
        recipient: { select: { id: true, name: true } },
      },
    });
    if (!request) throw new NotFoundException('Collaboration request not found.');
    if (request.recipientId !== userId) throw new ForbiddenException('Only the recipient can decline this request.');
    if (request.status !== 'PENDING') throw new BadRequestException('Only pending requests can be declined.');

    const updated = await this.prisma.researchCollabRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED' },
    });

    // Notify requester
    const recipientName = request.recipient.name || 'A researcher';
    await this.notifications.sendNotification(
      'Collaboration Declined',
      `${recipientName} declined your research collaboration request.`,
      request.requesterId,
      'COLLABORATION_DECLINED',
      `/nexus?view=requests`,
    );

    return updated;
  }

  // ─── GET COLLABORATION STATUS ──────────────────────────────────────────────

  async getCollaborationStatus(userId: string, targetUserId: string, threadId?: string) {
    // 1. Check for pending request SENT by current user
    const pendingSent = await this.prisma.researchCollabRequest.findFirst({
      where: {
        requesterId: userId,
        recipientId: targetUserId,
        status: 'PENDING',
        ...(threadId ? { threadId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    if (pendingSent) {
      return { status: 'PENDING_SENT', requestId: pendingSent.id };
    }

    // 2. Check for pending request RECEIVED from target user
    const pendingReceived = await this.prisma.researchCollabRequest.findFirst({
      where: {
        requesterId: targetUserId,
        recipientId: userId,
        status: 'PENDING',
        ...(threadId ? { threadId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    if (pendingReceived) {
      return { status: 'PENDING_RECEIVED', requestId: pendingReceived.id };
    }

    // 3. Check for active collaboration
    const activeCollab = await this.prisma.researchCollaboration.findFirst({
      where: {
        OR: [
          { requesterId: userId, recipientId: targetUserId },
          { requesterId: targetUserId, recipientId: userId },
        ],
        status: 'ACTIVE',
        ...(threadId ? { threadId } : {}),
      },
      orderBy: { lastActivityAt: 'desc' },
    });
    if (activeCollab) {
      return { status: 'ACTIVE', collaborationId: activeCollab.id };
    }

    return { status: 'NONE' };
  }

  // ─── GET MY COLLABORATIONS ─────────────────────────────────────────────────

  async getMyCollaborations(userId: string) {
    return this.prisma.researchCollaboration.findMany({
      where: {
        OR: [{ requesterId: userId }, { recipientId: userId }],
        status: 'ACTIVE',
      },
      include: {
        requester: { select: { id: true, name: true, role: true, department: true, image: true, email: true } },
        recipient: { select: { id: true, name: true, role: true, department: true, image: true, email: true } },
        thread: { select: { id: true, title: true, content: true, tags: true, type: true } },
        workspace: {
          include: {
            files: { orderBy: { uploadedAt: 'desc' }, take: 5, include: { uploadedBy: { select: { id: true, name: true } } } },
            milestones: { orderBy: { dueDate: 'asc' } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  // ─── GET SINGLE COLLABORATION ──────────────────────────────────────────────

  async getCollaboration(collabId: string, userId: string) {
    const collab = await this.prisma.researchCollaboration.findUnique({
      where: { id: collabId },
      include: {
        requester: { select: { id: true, name: true, role: true, department: true, image: true, email: true } },
        recipient: { select: { id: true, name: true, role: true, department: true, image: true, email: true } },
        thread: { select: { id: true, title: true, content: true, tags: true, type: true, authorId: true, author: { select: { name: true } } } },
        workspace: {
          include: {
            files: { orderBy: { uploadedAt: 'desc' }, include: { uploadedBy: { select: { id: true, name: true } } } },
            milestones: { orderBy: { dueDate: 'asc' } },
            announcements: { orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, name: true, image: true } } } },
          },
        },
      },
    });
    if (!collab) throw new NotFoundException('Collaboration not found.');
    if (collab.requesterId !== userId && collab.recipientId !== userId) {
      throw new ForbiddenException('You do not have access to this collaboration.');
    }
    return collab;
  }

  // ─── SEND MESSAGE ──────────────────────────────────────────────────────────

  async sendMessage(collabId: string, senderId: string, content: string) {
    if (!content || !content.trim()) {
      throw new BadRequestException('Message content is required.');
    }

    const collab = await this.prisma.researchCollaboration.findUnique({ where: { id: collabId } });
    if (!collab) throw new NotFoundException('Collaboration not found.');
    if (collab.requesterId !== senderId && collab.recipientId !== senderId) {
      throw new ForbiddenException('You are not a member of this collaboration.');
    }
    if (collab.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot send messages in a closed collaboration.');
    }

    const message = await this.prisma.collaborationMessage.create({
      data: {
        collaborationId: collabId,
        senderId,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, name: true, role: true, image: true } },
      },
    });

    // Update last activity
    await this.prisma.researchCollaboration.update({
      where: { id: collabId },
      data: { lastActivityAt: new Date() },
    });

    // Notify the other member
    const recipientId = collab.requesterId === senderId ? collab.recipientId : collab.requesterId;
    const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { name: true } });
    await this.notifications.sendNotification(
      'New Research Message',
      `${sender?.name || 'A researcher'} sent a message in your research collaboration.`,
      recipientId,
      'COLLABORATION_MESSAGE',
      `/nexus?collab=${collabId}`,
    );

    return message;
  }

  // ─── GET MESSAGES ──────────────────────────────────────────────────────────

  async getMessages(collabId: string, userId: string, page: number = 1, limit: number = 50) {
    const collab = await this.prisma.researchCollaboration.findUnique({ where: { id: collabId } });
    if (!collab) throw new NotFoundException('Collaboration not found.');
    if (collab.requesterId !== userId && collab.recipientId !== userId) {
      throw new ForbiddenException('You are not a member of this collaboration.');
    }

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.prisma.collaborationMessage.findMany({
        where: { collaborationId: collabId },
        include: {
          sender: { select: { id: true, name: true, role: true, image: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.collaborationMessage.count({ where: { collaborationId: collabId } }),
    ]);

    return { messages, total, page, limit, hasMore: skip + messages.length < total };
  }

  // ─── CLOSE COLLABORATION ──────────────────────────────────────────────────

  async closeCollaboration(collabId: string, userId: string) {
    const collab = await this.prisma.researchCollaboration.findUnique({ where: { id: collabId } });
    if (!collab) throw new NotFoundException('Collaboration not found.');
    if (collab.requesterId !== userId && collab.recipientId !== userId) {
      throw new ForbiddenException('You are not a member of this collaboration.');
    }
    if (collab.status !== 'ACTIVE') {
      throw new BadRequestException('This collaboration is already closed.');
    }

    const updated = await this.prisma.researchCollaboration.update({
      where: { id: collabId },
      data: { status: 'CLOSED' },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'COLLAB_CLOSED',
        details: `Closed research collaboration ${collabId}`,
      },
    });

    return updated;
  }
}
