import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnnouncementStatus } from '@prisma/client';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(private prisma: PrismaService) {}

  async getAnnouncements() {
    return this.prisma.systemAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true, email: true, image: true, role: true } },
      },
    });
  }

  async getPublishedAnnouncements() {
    return this.prisma.systemAnnouncement.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        // Members see who posted a notice, not their email address.
        author: { select: { name: true, image: true, role: true } },
      },
    });
  }

  async createAnnouncement(data: { title: string; content: string; status: AnnouncementStatus; pushToEmail: boolean; authorId: string }) {
    return this.prisma.systemAnnouncement.create({
      data: {
        title: data.title,
        content: data.content,
        status: data.status,
        pushToEmail: data.pushToEmail,
        authorId: data.authorId,
      },
    });
  }

  async updateAnnouncement(id: string, data: { title?: string; content?: string; status?: AnnouncementStatus; pushToEmail?: boolean }) {
    const existing = await this.prisma.systemAnnouncement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');
    return this.prisma.systemAnnouncement.update({
      where: { id },
      data,
    });
  }

  async deleteAnnouncement(id: string) {
    const existing = await this.prisma.systemAnnouncement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');
    return this.prisma.systemAnnouncement.delete({ where: { id } });
  }

  async publishAnnouncement(id: string) {
    const existing = await this.prisma.systemAnnouncement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');
    
    // Update to published
    const updated = await this.prisma.systemAnnouncement.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    // We can potentially push to Notification table here
    // But for MVP, they will be loaded natively by the frontend.
    return updated;
  }
}
