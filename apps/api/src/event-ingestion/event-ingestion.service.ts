import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventIngestion, EventIngestionStatus, EventStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { decide, extractionSchema, hasRequiredFields, normalizeExtraction, NormalizedEvent } from './decision';
import { cleanText, emailAddress, emailDomain, isTrustedSender, parseList, titleKey } from './normalize';

const sourceSchema = z.object({
  provider: z.literal('gmail').default('gmail'),
  messageId: z.string().trim().min(1).max(512),
  threadId: z.string().trim().max(512).nullish(),
  from: z.string().max(512).nullish(),
  subject: z.string().max(4000).nullish(),
  receivedAt: z.string().datetime({ offset: true }).nullish(),
});

const aiSchema = z
  .object({
    model: z.string().max(100).nullish(),
    inputTokens: z.number().int().min(0).nullish(),
    outputTokens: z.number().int().min(0).nullish(),
  })
  .nullish();

const prefilterSchema = z.object({ score: z.number().int().min(-1000).max(1000).nullish() }).nullish();

const ingestSchema = z.object({
  source: sourceSchema,
  // Validated separately so a malformed AI response is recorded instead of rejected.
  extraction: z.unknown(),
  ai: aiSchema,
  prefilter: prefilterSchema,
});

const skippedSchema = z.object({
  source: sourceSchema,
  stage: z.enum(['prefilter', 'ai_error']),
  reason: z.string().max(500).nullish(),
  ai: aiSchema,
  prefilter: prefilterSchema,
});

const checkSchema = z.object({ messageId: z.string().trim().min(1).max(512) });

const reviewEditSchema = z
  .object({
    title: z.string().max(300).nullish(),
    description: z.string().max(10000).nullish(),
    startDate: z.string().max(40).nullish(),
    startTime: z.string().max(20).nullish(),
    endDate: z.string().max(40).nullish(),
    endTime: z.string().max(20).nullish(),
    timezone: z.string().max(64).nullish(),
    location: z.string().max(400).nullish(),
    organizer: z.string().max(300).nullish(),
    category: z.string().max(150).nullish(),
    eventUrl: z.string().max(2048).nullish(),
    registrationUrl: z.string().max(2048).nullish(),
    meetingUrl: z.string().max(2048).nullish(),
  })
  .partial();

/** Statuses that end processing for a message. AI_FAILED stays retryable. */
const FINAL: EventIngestionStatus[] = ['SKIPPED', 'NOT_EVENT', 'REVIEW_REQUIRED', 'CREATED', 'DUPLICATE', 'DISMISSED'];

function parseOrThrow<S extends z.ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const fields = Array.from(new Set(result.error.errors.map((e) => e.path.join('.') || 'body')));
    throw new BadRequestException(`Invalid request: ${fields.join(', ')}`);
  }
  return result.data;
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

export type IngestResponse =
  | { status: 'created'; eventId: string; ingestionId: string; duplicate: false }
  | { status: 'review_required'; ingestionId: string; reason: string; reasons: string[]; duplicate: false }
  | { status: 'duplicate'; eventId: string | null; ingestionId: string; originalStatus: string; duplicate: true }
  | { status: 'not_event'; ingestionId: string; reason: string; duplicate: false }
  | { status: 'ai_failed'; ingestionId: string; reason: string; duplicate: false };

/**
 * Turns institutional emails, already screened and extracted by the n8n
 * workflow, into CuriousBees events. CuriousBees stays the source of truth: n8n
 * only reports what it saw, and every decision, duplicate check and write
 * happens here.
 */
@Injectable()
export class EventIngestionService {
  private readonly logger = new Logger('EventIngestion');

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  private trustedSenders(): string[] {
    return parseList(process.env.EVENT_INGESTION_TRUSTED_SENDERS);
  }

  private log(fields: Record<string, unknown>) {
    // Metadata only: never the email body, subject or credentials.
    this.logger.log(JSON.stringify({ event: 'event_ingestion', ...fields }));
  }

  private duplicateResponse(rec: Pick<EventIngestion, 'id' | 'eventId' | 'status'>): IngestResponse {
    return { status: 'duplicate', eventId: rec.eventId, ingestionId: rec.id, originalStatus: rec.status.toLowerCase(), duplicate: true };
  }

  private sourceFields(source: z.infer<typeof sourceSchema>) {
    const sender = emailAddress(source.from);
    const trusted = isTrustedSender(sender, this.trustedSenders());
    return {
      trusted,
      data: {
        provider: source.provider,
        sourceMessageId: source.messageId,
        sourceThreadId: source.threadId || null,
        senderEmail: sender,
        senderDomain: emailDomain(sender),
        subject: cleanText(source.subject, 300),
        receivedAt: source.receivedAt ? new Date(source.receivedAt) : null,
        trustedSender: trusted,
      },
    };
  }

  /** Lets the workflow skip messages it has already handled, before spending an AI call. */
  async check(body: unknown) {
    const { messageId } = parseOrThrow(checkSchema, body);
    const rec = await this.prisma.eventIngestion.findUnique({
      where: { sourceMessageId: messageId },
      select: { id: true, status: true, eventId: true },
    });
    if (!rec) return { processed: false };
    const retryable = rec.status === 'AI_FAILED';
    return { processed: !retryable, retryable, status: rec.status.toLowerCase(), eventId: rec.eventId, ingestionId: rec.id };
  }

  /** Records a message the workflow didn't extract: rejected by the pre-filter, or the AI call failed. */
  async recordSkipped(body: unknown) {
    const input = parseOrThrow(skippedSchema, body);
    const existing = await this.prisma.eventIngestion.findUnique({ where: { sourceMessageId: input.source.messageId } });
    if (existing && FINAL.includes(existing.status)) return this.duplicateResponse(existing);

    const status: EventIngestionStatus = input.stage === 'prefilter' ? 'SKIPPED' : 'AI_FAILED';
    const reason = cleanText(input.reason, 500) || (status === 'SKIPPED' ? 'Not a likely event (pre-filter)' : 'The AI step failed');
    const { data } = this.sourceFields(input.source);
    const extra = {
      status,
      reason,
      prefilterScore: input.prefilter?.score ?? null,
      aiModel: input.ai?.model ?? null,
      aiInputTokens: input.ai?.inputTokens ?? null,
      aiOutputTokens: input.ai?.outputTokens ?? null,
    };

    try {
      const rec = existing
        ? await this.prisma.eventIngestion.update({ where: { id: existing.id }, data: { ...extra, attempts: { increment: 1 } } })
        : await this.prisma.eventIngestion.create({ data: { ...data, ...extra } });
      this.log({ status: status.toLowerCase(), messageId: input.source.messageId, stage: input.stage });
      return { status: status === 'SKIPPED' ? 'skipped' : 'ai_failed', ingestionId: rec.id };
    } catch (e) {
      if (isUniqueViolation(e)) {
        const now = await this.prisma.eventIngestion.findUniqueOrThrow({ where: { sourceMessageId: input.source.messageId } });
        return this.duplicateResponse(now);
      }
      throw e;
    }
  }

  /** An existing event with the same date, start time and (near-)identical title and organizer. */
  private async findContentDuplicate(e: NormalizedEvent & { title: string; startDate: string; startTime: string }) {
    const candidates = await this.prisma.event.findMany({
      where: { date: new Date(`${e.startDate}T00:00:00.000Z`), time: e.startTime, status: { not: EventStatus.FAILED } },
      select: { id: true, title: true, organizer: true },
      take: 50,
    });
    const key = titleKey(e.title);
    const organizerKey = e.organizer ? titleKey(e.organizer) : null;
    return (
      candidates.find((c) => {
        const other = titleKey(c.title);
        const [short, long] = other.length <= key.length ? [other, key] : [key, other];
        const sameTitle = other === key || (short.length >= 0.75 * long.length && long.includes(short));
        const sameOrganizer = !organizerKey || !c.organizer || titleKey(c.organizer) === organizerKey;
        return sameTitle && sameOrganizer;
      }) || null
    );
  }

  /** Main entry point: one extracted email. Safe to call again with the same message (n8n retries). */
  async ingest(body: unknown): Promise<IngestResponse> {
    const input = parseOrThrow(ingestSchema, body);
    const messageId = input.source.messageId;

    const existing = await this.prisma.eventIngestion.findUnique({ where: { sourceMessageId: messageId } });
    if (existing && FINAL.includes(existing.status)) {
      this.log({ status: 'duplicate', messageId, originalStatus: existing.status.toLowerCase() });
      return this.duplicateResponse(existing);
    }

    const { data: source, trusted } = this.sourceFields(input.source);
    const usage = {
      prefilterScore: input.prefilter?.score ?? null,
      aiModel: input.ai?.model ?? null,
      aiInputTokens: input.ai?.inputTokens ?? null,
      aiOutputTokens: input.ai?.outputTokens ?? null,
    };

    const parsed = extractionSchema.safeParse(input.extraction);
    if (!parsed.success) {
      // Never guess from a malformed AI response; keep it retryable instead.
      const reason = 'The AI response did not match the expected format';
      const rec = existing
        ? await this.prisma.eventIngestion.update({ where: { id: existing.id }, data: { status: 'AI_FAILED', reason, ...usage, attempts: { increment: 1 } } })
        : await this.prisma.eventIngestion.create({ data: { ...source, status: 'AI_FAILED', reason, ...usage } });
      this.log({ status: 'ai_failed', messageId, reason: 'invalid_extraction' });
      return { status: 'ai_failed', ingestionId: rec.id, reason, duplicate: false };
    }

    const decision = decide(parsed.data, { trustedSender: trusted });
    let reasons = decision.reasons;
    let status: EventIngestionStatus =
      decision.outcome === 'create' ? 'CREATED' : decision.outcome === 'review' ? 'REVIEW_REQUIRED' : 'NOT_EVENT';
    let duplicateOf: string | null = null;

    if (decision.outcome !== 'not_event' && hasRequiredFields(decision.event)) {
      const dup = await this.findContentDuplicate(decision.event);
      if (dup) {
        status = 'DUPLICATE';
        duplicateOf = dup.id;
        reasons = ['Matches an existing event (same title, date and start time)'];
      }
    }

    const record = {
      ...source,
      ...usage,
      confidence: parsed.data.confidence,
      extracted: decision.event as unknown as Prisma.InputJsonValue,
      reason: reasons.length ? reasons.join('; ').slice(0, 1000) : null,
    };

    let result: { rec: EventIngestion; event: any | null };
    try {
      result = await this.prisma.$transaction(async (tx) => {
        let event: any = null;
        if (status === 'CREATED' && hasRequiredFields(decision.event)) {
          event = await this.events.createFromEmail(tx, {
            ...decision.event,
            senderEmail: source.senderEmail,
            sourceMessageId: messageId,
            sourceThreadId: source.sourceThreadId,
          });
        }
        const data = { ...record, status, eventId: event?.id ?? duplicateOf };
        const rec = existing
          ? await tx.eventIngestion.update({ where: { id: existing.id }, data: { ...data, attempts: { increment: 1 } } })
          : await tx.eventIngestion.create({ data });
        return { rec, event };
      });
    } catch (e) {
      // Two deliveries of the same message raced; the other one won.
      if (isUniqueViolation(e)) {
        const winner = await this.prisma.eventIngestion.findUnique({ where: { sourceMessageId: messageId } });
        if (winner) return this.duplicateResponse(winner);
        const event = await this.prisma.event.findUnique({ where: { sourceMessageId: messageId }, select: { id: true } });
        return { status: 'duplicate', eventId: event?.id ?? null, ingestionId: '', originalStatus: 'created', duplicate: true };
      }
      throw e;
    }

    if (result.event) this.events.announcePublished(result.event);

    this.log({
      status: status.toLowerCase(),
      messageId,
      confidence: parsed.data.confidence,
      trustedSender: trusted,
      reasons,
      aiInputTokens: usage.aiInputTokens,
      aiOutputTokens: usage.aiOutputTokens,
    });

    const ingestionId = result.rec.id;
    switch (status) {
      case 'CREATED':
        return { status: 'created', eventId: result.event.id, ingestionId, duplicate: false };
      case 'DUPLICATE':
        return { status: 'duplicate', eventId: duplicateOf, ingestionId, originalStatus: 'duplicate', duplicate: true };
      case 'REVIEW_REQUIRED':
        return { status: 'review_required', ingestionId, reason: reasons[0], reasons, duplicate: false };
      default:
        return { status: 'not_event', ingestionId, reason: reasons[0], duplicate: false };
    }
  }

  // ─── Administrator review ──────────────────────────────────────────────────

  async list(query: { status?: string; page?: string | number; limit?: string | number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const status = (query.status || '').toUpperCase();
    const where: Prisma.EventIngestionWhereInput =
      status && (Object.values(EventIngestionStatus) as string[]).includes(status) ? { status: status as EventIngestionStatus } : {};

    const [items, total] = await Promise.all([
      this.prisma.eventIngestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          event: { select: { id: true, title: true, date: true, time: true, status: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.eventIngestion.count({ where }),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  /** How many emails reached each stage, and the AI tokens spent, over the last `days` days. */
  async stats(days = 30) {
    const span = Math.min(365, Math.max(1, Math.floor(days) || 30));
    const since = new Date(Date.now() - span * 86_400_000);
    const [groups, tokens] = await Promise.all([
      this.prisma.eventIngestion.groupBy({ by: ['status'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.eventIngestion.aggregate({ where: { createdAt: { gte: since } }, _sum: { aiInputTokens: true, aiOutputTokens: true } }),
    ]);
    const count = (s: EventIngestionStatus) => groups.find((g) => g.status === s)?._count._all ?? 0;
    const incoming = groups.reduce((n, g) => n + g._count._all, 0);
    const skipped = count('SKIPPED');
    return {
      days: span,
      incoming,
      skippedByFilter: skipped,
      sentToAi: incoming - skipped,
      aiFailed: count('AI_FAILED'),
      notEvents: count('NOT_EVENT'),
      classifiedAsEvents: count('CREATED') + count('REVIEW_REQUIRED') + count('DUPLICATE') + count('DISMISSED'),
      created: count('CREATED'),
      awaitingReview: count('REVIEW_REQUIRED'),
      duplicates: count('DUPLICATE'),
      dismissed: count('DISMISSED'),
      aiInputTokens: tokens._sum.aiInputTokens ?? 0,
      aiOutputTokens: tokens._sum.aiOutputTokens ?? 0,
    };
  }

  private async pending(id: string) {
    const rec = await this.prisma.eventIngestion.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('This email is no longer in the review queue.');
    if (rec.status !== 'REVIEW_REQUIRED') throw new ConflictException(`This email was already handled (${rec.status.toLowerCase().replace('_', ' ')}).`);
    return rec;
  }

  /** An administrator completes or corrects the details and creates the event. */
  async approve(id: string, body: unknown, admin: { id: string; email?: string; name?: string; role?: string }) {
    const rec = await this.pending(id);
    const edits = parseOrThrow(reviewEditSchema, body ?? {});
    const merged = { ...((rec.extracted as Record<string, unknown>) || {}), ...edits };
    const { event, problems } = normalizeExtraction({ isEvent: true, confidence: 1, ...(merged as any) });
    if (problems.length) throw new BadRequestException(problems.join('. '));
    if (!hasRequiredFields(event)) throw new BadRequestException('A title, a date (YYYY-MM-DD) and a start time (HH:mm) are required.');

    const dup = await this.findContentDuplicate(event);
    if (dup) throw new ConflictException({ message: 'An event with the same title, date and start time already exists.', eventId: dup.id });

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await this.events.createFromEmail(tx, {
        ...event,
        senderEmail: rec.senderEmail,
        sourceMessageId: rec.sourceMessageId,
        sourceThreadId: rec.sourceThreadId,
      });
      const updated = await tx.eventIngestion.update({
        where: { id: rec.id },
        data: {
          status: 'CREATED',
          eventId: created.id,
          extracted: event as unknown as Prisma.InputJsonValue,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          actorId: admin.id,
          actorEmail: admin.email ?? null,
          actorName: admin.name ?? null,
          actorRole: admin.role ?? null,
          action: 'EVENT_INGESTION_APPROVED',
          targetId: created.id,
          targetType: 'EVENT',
          category: 'MODERATION',
          severity: 'LOW',
          details: `Created event "${created.title}" from email ${rec.sourceMessageId}`,
        },
      });
      return { created, updated };
    });

    this.events.announcePublished(result.created);
    this.log({ status: 'approved', messageId: rec.sourceMessageId, reviewer: admin.id });
    return { status: 'created', eventId: result.created.id, ingestionId: result.updated.id };
  }

  /** An administrator decides the email shouldn't become an event. */
  async dismiss(id: string, body: unknown, admin: { id: string; email?: string; name?: string; role?: string }) {
    const rec = await this.pending(id);
    const { note } = parseOrThrow(z.object({ note: z.string().max(500).nullish() }), body ?? {});
    const reason = [rec.reason, note ? `Dismissed: ${note.trim()}` : 'Dismissed by an administrator'].filter(Boolean).join('; ').slice(0, 1000);

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.eventIngestion.update({
        where: { id: rec.id },
        data: { status: 'DISMISSED', reason, reviewedById: admin.id, reviewedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          actorId: admin.id,
          actorEmail: admin.email ?? null,
          actorName: admin.name ?? null,
          actorRole: admin.role ?? null,
          action: 'EVENT_INGESTION_DISMISSED',
          targetId: rec.id,
          targetType: 'EVENT_INGESTION',
          category: 'MODERATION',
          severity: 'LOW',
          details: `Dismissed email ${rec.sourceMessageId}${note ? `: ${note.trim().slice(0, 200)}` : ''}`,
        },
      });
      return u;
    });
    this.log({ status: 'dismissed', messageId: rec.sourceMessageId, reviewer: admin.id });
    return { status: 'dismissed', ingestionId: updated.id };
  }
}
