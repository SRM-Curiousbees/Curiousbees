import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { EventIngestionService } from './event-ingestion.service';
import { N8nEventsController } from './n8n-events.controller';
import { AdminEventIngestionController } from './admin-event-ingestion.controller';
import { IntegrationTokenGuard } from './integration-token.guard';

/** Institutional email → CuriousBees event ingestion, driven by the n8n workflow. */
@Module({
  imports: [AuthModule, EventsModule],
  controllers: [N8nEventsController, AdminEventIngestionController],
  providers: [EventIngestionService, IntegrationTokenGuard],
})
export class EventIngestionModule {}
