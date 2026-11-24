import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { EventStatus, Role } from '@prisma/client';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('EventsService (Role-Based Authorization)', () => {
  let service: EventsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      event: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'ev-1' }),
        update: jest.fn().mockResolvedValue({ id: 'ev-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'ev-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: { routeEvent: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  const scholar = { id: 'sch-1', role: Role.RESEARCH_SCHOLAR };
  const supervisor = { id: 'sup-1', role: Role.RESEARCH_SUPERVISOR };
  const admin = { id: 'adm-1', role: Role.INSTITUTE_ADMIN };

  it('blocks scholars from creating, reviewing, updating, changing status, or deleting events (403)', async () => {
    mockPrisma.event.findUnique.mockResolvedValue({ id: 'ev-1', authorId: 'sch-1' });

    await expect(service.createEvent(scholar, { title: 'T', date: '2026-12-01', time: '10:00', venue: 'Hall' })).rejects.toThrow(ForbiddenException);
    await expect(service.getReviewEvents(scholar)).rejects.toThrow(ForbiddenException);
    await expect(service.updateEvent(scholar, 'ev-1', { title: 'New' })).rejects.toThrow(ForbiddenException);
    await expect(service.updateEventStatus(scholar, 'ev-1', EventStatus.PUBLISHED)).rejects.toThrow(ForbiddenException);
    await expect(service.deleteEvent(scholar, 'ev-1')).rejects.toThrow(ForbiddenException);
  });

  it('allows supervisors to create and edit only their own events, and blocks status/delete/review', async () => {
    await expect(service.createEvent(supervisor, { title: 'Workshop', date: '2026-12-01', time: '10:00', venue: 'Lab' })).resolves.toEqual({ id: 'ev-1' });

    mockPrisma.event.findUnique.mockResolvedValueOnce({ id: 'ev-1', authorId: 'sup-1' });
    await expect(service.updateEvent(supervisor, 'ev-1', { title: 'Updated' })).resolves.toEqual({ id: 'ev-1' });

    mockPrisma.event.findUnique.mockResolvedValueOnce({ id: 'ev-2', authorId: 'other-sup' });
    await expect(service.updateEvent(supervisor, 'ev-2', { title: 'Hijack' })).rejects.toThrow(ForbiddenException);

    await expect(service.getReviewEvents(supervisor)).rejects.toThrow(ForbiddenException);
    await expect(service.updateEventStatus(supervisor, 'ev-1', EventStatus.PUBLISHED)).rejects.toThrow(ForbiddenException);
    await expect(service.deleteEvent(supervisor, 'ev-1')).rejects.toThrow(ForbiddenException);
  });

  it('allows Institute Admin to review, update status, and delete any event', async () => {
    mockPrisma.event.findUnique.mockResolvedValue({ id: 'ev-1', authorId: 'sup-1' });

    await expect(service.getReviewEvents(admin)).resolves.toEqual([]);
    await expect(service.updateEventStatus(admin, 'ev-1', EventStatus.PUBLISHED)).resolves.toEqual({ id: 'ev-1' });
    await expect(service.deleteEvent(admin, 'ev-1')).resolves.toEqual({ id: 'ev-1' });
  });
});
