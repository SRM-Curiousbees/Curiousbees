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
   * Retrieves events with optional filtering and pagination. The calendar only
   * ever shows published events; other statuses are for administrators.
   */
  async getEvents(filters?: { status?: EventStatus; limit?: number; skip?: number }, viewer?: { role?: string }) {
    try {
      const isAdmin = viewer?.role === Role.INSTITUTE_ADMIN || viewer?.role === 'ADMIN';
      const where: Prisma.EventWhereInput = {
        status: filters?.status && isAdmin ? filters.status : EventStatus.PUBLISHED,
      };

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
   * Specifically returns events requiring human review (administrators only).
   */
  async getReviewEvents(viewer: { role?: string }) {
    if (viewer?.role !== Role.INSTITUTE_ADMIN && viewer?.role !== 'ADMIN') {
      throw new UnauthorizedException('Only administrators can see events awaiting review.');
    }
    return this.getEvents({ status: EventStatus.REVIEW_REQUIRED }, viewer);
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
   * Creates an event from an institutional email (the n8n workflow, or an
   * administrator approving one from the review queue). Runs inside the caller's
   * transaction so the event and its ingestion record are written together.
   */
  async createFromEmail(
    tx: Prisma.TransactionClient,
    input: {
      title: string;
      startDate: string;
      startTime: string;
      endDate?: string | null;
      endTime?: string | null;
      timezone: string;
      location?: string | null;
      description?: string | null;
      organizer?: string | null;
      category?: string | null;
      eventUrl?: string | null;
      registrationUrl?: string | null;
      meetingUrl?: string | null;
      senderEmail?: string | null;
      sourceMessageId: string;
      sourceThreadId?: string | null;
    },
  ) {
    return tx.event.create({
      data: {
        title: input.title,
        date: new Date(`${input.startDate}T00:00:00.000Z`),
        time: input.startTime,
        endDate: input.endDate ? new Date(`${input.endDate}T00:00:00.000Z`) : null,
        endTime: input.endTime || null,
        timezone: input.timezone,
        venue: input.location || null,
        description: input.description || null,
        organizer: input.organizer || null,
        organizerEmail: input.senderEmail || null,
        category: input.category || null,
        eventType: input.category || 'Institutional event',
        eventUrl: input.eventUrl || null,
        registrationLink: input.registrationUrl || null,
        meetingUrl: input.meetingUrl || null,
        status: EventStatus.PUBLISHED,
        source: 'email',
        sourceProvider: 'gmail',
        sourceMessageId: input.sourceMessageId,
        sourceThreadId: input.sourceThreadId || null,
        createdByType: 'automation',
        createdBy: 'n8n',
      },
    });
  }

  /** Tells interested people about a newly published event (same routing as publishing by hand). */
  announcePublished(event: any) {
    this.notificationsService.routeEvent(event).catch((e) => {
      this.logger.error(`Failed to route published event ${event.id}: ${e.message}`);
    });
  }

  /**
   * Updates event details. Only descriptive fields can change; status, authorship
   * and where the event came from are set by the system.
   */
  async updateEvent(user: any, id: string, input: Prisma.EventUpdateInput) {
    const event = await this.getEventById(id);
    this.checkEditPermissions(user, event);

    const EDITABLE = [
      'title', 'eventType', 'speaker', 'date', 'time', 'venue', 'topic', 'description', 'category',
      'posterUrl', 'registrationLink', 'tags', 'priority', 'organizer', 'eventUrl', 'meetingUrl',
      'endDate', 'endTime', 'timezone',
    ] as const;
    const data: Record<string, unknown> = {};
    for (const key of EDITABLE) {
      if (input && Object.prototype.hasOwnProperty.call(input, key)) data[key] = (input as any)[key];
    }

    try {
      return await this.prisma.event.update({
        where: { id },
        data: data as Prisma.EventUpdateInput
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
