import { Injectable, BadRequestException, NotFoundException, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventStatus, Prisma, Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  /**
   * Retrieves events with optional filtering and pagination.
   */
  async getEvents(filters?: { status?: EventStatus; limit?: number; skip?: number }) {
    try {
      const where: Prisma.EventWhereInput = {};
      if (filters?.status) {
        where.status = filters.status;
      } else {
        // By default, don't return FAILED events in the main calendar
        where.status = { not: EventStatus.FAILED };
      }

      return await this.prisma.event.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true, role: true, department: true, image: true }
          }
        },
        orderBy: { date: 'asc' },
        take: filters?.limit || 100,
        skip: filters?.skip || 0,
      });
    } catch (e: any) {
      this.logger.error('Failed to query database events', e);
      return [];
    }
  }

  /**
   * Specifically returns events requiring human review.
   */
  async getReviewEvents() {
    return this.getEvents({ status: EventStatus.REVIEW_REQUIRED });
  }

  /**
   * Retrieves a single event by ID.
   */
  async getEventById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, role: true, department: true, image: true }
        }
      }
    });
    if (!event) throw new NotFoundException('Event not found.');
    return event;
  }

  private checkEditPermissions(user: any, event: any) {
    if (user.role === Role.INSTITUTE_ADMIN || user.role === 'ADMIN') return;
    if (user.role === Role.RESEARCH_SUPERVISOR && event.authorId === user.id) return;
    throw new UnauthorizedException('You do not have permission to modify this event.');
  }

  private checkCreatePermissions(user: any) {
    if (user.role === Role.INSTITUTE_ADMIN || user.role === 'ADMIN' || user.role === Role.RESEARCH_SUPERVISOR) return;
    throw new UnauthorizedException('You do not have permission to create an event.');
  }

  /**
   * Creates an event manually (skipping AI).
   */
  async createEvent(user: any, input: { title: string; date: string; time: string; venue: string; description?: string; eventType?: string; registrationLink?: string }) {
    this.checkCreatePermissions(user);
    const { title, date, time, venue, description, eventType, registrationLink } = input;
    if (!title || !date || !time || !venue) {
      throw new BadRequestException('Event details are incomplete.');
    }

    try {
      return await this.prisma.event.create({
        data: { 
          title, 
          date: new Date(date), 
          time, 
          venue, 
          description,
          eventType: eventType || 'Manual Entry',
          registrationLink: registrationLink ? registrationLink.trim() : null,
          status: EventStatus.PUBLISHED,
          authorId: user.id,
          departmentId: user.departmentId || null,
          department: user.department || null,
        }
      });
    } catch (e) {
      this.logger.error('Failed to create event', e);
      throw new BadRequestException('Could not create event');
    }
  }

  /**
   * Updates full event details.
   */
  async updateEvent(user: any, id: string, input: Prisma.EventUpdateInput) {
    const event = await this.getEventById(id);
    this.checkEditPermissions(user, event);

    try {
      return await this.prisma.event.update({
        where: { id },
        data: input
      });
    } catch (e) {
      throw new NotFoundException('Event not found.');
    }
  }

  /**
   * Patches only the status of an event (for AI review queue).
   */
  async updateEventStatus(user: any, id: string, status: EventStatus) {
    const event = await this.getEventById(id);
    this.checkEditPermissions(user, event);

    try {
      const updatedEvent = await this.prisma.event.update({
        where: { id },
        data: { status }
      });

      // If approved, route it to interested users
      if (status === EventStatus.PUBLISHED) {
        // We do this async without awaiting so it doesn't block the HTTP response
        this.notificationsService.routeEvent(updatedEvent).catch(e => {
          this.logger.error(`Failed to route published event ${id}: ${e.message}`);
        });
      }

      return updatedEvent;
    } catch (e) {
      throw new NotFoundException('Event not found.');
    }
  }

  /**
   * Deletes an event.
   */
  async deleteEvent(user: any, id: string) {
    const event = await this.getEventById(id);
    this.checkEditPermissions(user, event);

    try {
      return await this.prisma.event.delete({
        where: { id }
      });
    } catch (e) {
      throw new NotFoundException('Event not found.');
    }
  }
}
