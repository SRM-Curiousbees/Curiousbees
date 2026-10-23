import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GoogleWorkspaceService } from './services/google-workspace.service';
import { IntegrationsService } from './services/integrations.service';
import { MeetingsService } from './services/meetings.service';
import { IntegrationsController } from './controllers/integrations.controller';
import { MeetingsController } from './controllers/meetings.controller';
import { WorkspaceCollaborationController } from './controllers/workspace-collaboration.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    IntegrationsController,
    MeetingsController,
    WorkspaceCollaborationController,
  ],
  providers: [
    GoogleWorkspaceService,
    IntegrationsService,
    MeetingsService,
  ],
  exports: [
    IntegrationsService,
    MeetingsService,
    GoogleWorkspaceService,
  ],
})
export class IntegrationsModule {}
