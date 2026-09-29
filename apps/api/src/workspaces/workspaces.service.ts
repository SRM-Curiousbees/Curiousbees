import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { AddWorkspaceFileDto, RequestFileUploadDto } from './dto/workspace-file.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private prisma: PrismaService,
    private files: FilesService,
  ) {}

  // Check if a user is a member of the workspace
  private async checkMembership(userId: string, workspaceId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId }
      }
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace.');
    }
    return member;
  }

  async createWorkspace(
    userId: string,
    data: {
      title: string;
      description?: string;
      researchDomain?: string;
      researchDomainId?: string;
      researchTopic?: string;
      researchTopicId?: string;
      scholarIds?: string[];
    }
  ) {
    if (!data.title?.trim()) {
      throw new BadRequestException('Workspace title is required.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const isSupervisor = user.role === 'RESEARCH_SUPERVISOR' || (user.role as any) === 'SUPERVISOR';

    return this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          title: data.title.trim(),
          description: data.description?.trim() || null,
          researchDomain: data.researchDomain?.trim() || null,
          researchDomainId: data.researchDomainId || null,
          researchTopic: data.researchTopic?.trim() || null,
          researchTopicId: data.researchTopicId || null,
          supervisorId: isSupervisor ? userId : null,
        }
      });

      // Add creator as OWNER
      await tx.workspaceMember.create({
        data: {
          workspaceId: ws.id,
          userId,
          role: 'OWNER',
        }
      });

      // Add scholar members
      if (Array.isArray(data.scholarIds) && data.scholarIds.length > 0) {
        for (const sId of data.scholarIds) {
          if (sId && sId !== userId) {
            await tx.workspaceMember.upsert({
              where: {
                workspaceId_userId: { workspaceId: ws.id, userId: sId }
              },
              create: {
                workspaceId: ws.id,
                userId: sId,
                role: 'MEMBER',
              },
              update: {}
            });
          }
        }
      }

      return tx.workspace.findUnique({
        where: { id: ws.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  role: true
                }
              }
            }
          },
          researchDomainRef: true,
          researchTopicRef: true,
          supervisor: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    });
  }

  async getWorkspaces(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true
              }
            }
          }
        },
        researchDomainRef: true,
        researchTopicRef: true,
        supervisor: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getWorkspace(userId: string, workspaceId: string) {
    await this.checkMembership(userId, workspaceId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                department: true
              }
            }
          }
        },
        files: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            uploadedAt: 'desc'
          }
        },
        milestones: {
          orderBy: {
            dueDate: 'asc'
          }
        },
        announcements: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        researchDomainRef: true,
        researchTopicRef: true,
        supervisor: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!workspace) {
      throw new BadRequestException('Workspace not found.');
    }

    return workspace;
  }

  async createFileUpload(userId: string, workspaceId: string, input: RequestFileUploadDto) {
    await this.checkMembership(userId, workspaceId);
    const safeName = this.files.validateUpload(input.filename, input.contentType, input.sizeBytes);
    const storageKey = this.files.buildObjectKey('workspaces', workspaceId, userId, safeName);
    return this.files.createPresignedUpload(storageKey, input.contentType.toLowerCase(), input.sizeBytes);
  }

  async addFile(userId: string, workspaceId: string, input: AddWorkspaceFileDto) {
    await this.checkMembership(userId, workspaceId);

    if (Boolean(input.storageKey) === Boolean(input.url)) {
      throw new BadRequestException('Provide exactly one of storageKey (uploaded file) or url (external link).');
    }

    let data: { url?: string; storageKey?: string; contentType?: string; size: number };
    if (input.storageKey) {
      // Only objects this user uploaded into this workspace's prefix can be attached.
      const expectedPrefix = `workspaces/${workspaceId}/${userId}/`;
      if (!input.storageKey.startsWith(expectedPrefix) || !this.files.isWellFormedKey(input.storageKey)) {
        throw new ForbiddenException('This file was not uploaded to this workspace by you.');
      }
      const existing = await this.prisma.workspaceFile.findUnique({ where: { storageKey: input.storageKey } });
      if (existing) {
        throw new BadRequestException('This upload has already been attached.');
      }
      const verified = await this.files.verifyUploadedObject(input.storageKey);
      data = { storageKey: input.storageKey, contentType: verified.contentType, size: verified.size };
    } else {
      data = { url: input.url, size: input.size || 0 };
    }

    const file = await this.prisma.workspaceFile.create({
      data: {
        workspaceId,
        name: input.name.trim(),
        ...data,
        uploadedById: userId
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'WORKSPACE_ADD_FILE',
        details: `User added file "${file.name}" to workspace ${workspaceId}`
      }
    });

    return file;
  }

  async getFileDownload(userId: string, workspaceId: string, fileId: string) {
    await this.checkMembership(userId, workspaceId);
    const file = await this.prisma.workspaceFile.findFirst({ where: { id: fileId, workspaceId } });
    if (!file) {
      throw new NotFoundException('File not found in this workspace.');
    }
    if (file.storageKey) {
      const extension = file.storageKey.split('.').pop()?.toLowerCase() || '';
      const downloadName = extension && !file.name.toLowerCase().endsWith(`.${extension}`)
        ? `${file.name}.${extension}`
        : file.name;
      return this.files.createPresignedDownload(file.storageKey, downloadName);
    }
    return { downloadUrl: file.url, expiresIn: null };
  }

  async addMilestone(userId: string, workspaceId: string, title: string, description?: string, dueDate?: string) {
    const member = await this.checkMembership(userId, workspaceId);
    
    // Only workspace owners (supervisors) can create milestones
    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Only workspace owners can create milestones.');
    }

    const milestone = await this.prisma.workspaceMilestone.create({
      data: {
        workspaceId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'WORKSPACE_ADD_MILESTONE',
        details: `Supervisor created milestone "${title}" in workspace ${workspaceId}`
      }
    });

    return milestone;
  }

  async toggleMilestone(userId: string, workspaceId: string, milestoneId: string, completed: boolean) {
    await this.checkMembership(userId, workspaceId);

    const milestone = await this.prisma.workspaceMilestone.findUnique({
      where: { id: milestoneId }
    });

    if (!milestone || milestone.workspaceId !== workspaceId) {
      throw new BadRequestException('Milestone not found in this workspace.');
    }

    const updated = await this.prisma.workspaceMilestone.update({
      where: { id: milestoneId },
      data: { completed }
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'WORKSPACE_TOGGLE_MILESTONE',
        details: `User toggled milestone "${milestone.title}" to completed=${completed}`
      }
    });

    return updated;
  }

  async addAnnouncement(userId: string, workspaceId: string, title: string, content: string) {
    await this.checkMembership(userId, workspaceId);

    const announcement = await this.prisma.workspaceAnnouncement.create({
      data: {
        workspaceId,
        title,
        content,
        authorId: userId
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'WORKSPACE_ADD_ANNOUNCEMENT',
        details: `User posted announcement "${title}" in workspace ${workspaceId}`
      }
    });

    return announcement;
  }
}
