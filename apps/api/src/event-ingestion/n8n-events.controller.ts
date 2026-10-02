import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventIngestionService } from './event-ingestion.service';
import { IntegrationTokenGuard } from './integration-token.guard';

/**
 * Machine-to-machine endpoints for the n8n email → event workflow. Authenticated
 * with the integration token only; no user session is involved and nothing here
 * is reachable from the web app.
 */
@Controller('integrations/n8n/events')
@UseGuards(IntegrationTokenGuard)
// A mailbox backlog can arrive in bursts, all from the n8n host's single IP.
@Throttle({ default: { limit: 300, ttl: 60000 } })
export class N8nEventsController {
  constructor(private readonly ingestion: EventIngestionService) {}

  /** Has this Gmail message been handled already? Called before the AI step to avoid repeat AI calls. */
  @Post('check')
  @HttpCode(200)
  check(@Body() body: unknown) {
    return this.ingestion.check(body);
  }

  /** Records a message the workflow didn't extract (pre-filter rejection or an AI failure), for metrics. */
  @Post('skipped')
  @HttpCode(200)
  skipped(@Body() body: unknown) {
    return this.ingestion.recordSkipped(body);
  }

  /** One extracted email. Idempotent per Gmail message ID. */
  @Post()
  @HttpCode(200)
  ingest(@Body() body: unknown) {
    return this.ingestion.ingest(body);
  }
}
