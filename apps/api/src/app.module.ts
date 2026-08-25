import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import * as path from 'path';
import * as fs from 'fs';
import { LoggingMiddleware } from './common/middleware/logging.middleware';

import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ThreadsModule } from './threads/threads.module';
import { CommentsModule } from './comments/comments.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { SupervisorsModule } from './supervisors/supervisors.module';
import { DepartmentsModule } from './departments/departments.module';
import { PublicationsModule } from './publications/publications.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { FacultiesModule } from './faculties/faculties.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { SupervisorRequestsModule } from './supervisor-requests/requests.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { FeedModule } from './feed/feed.module';
import { CollaborationsModule } from './collaborations/collaborations.module';
import { MyResearchModule } from './my-research/my-research.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../../.env'),
        path.resolve(__dirname, '../../../.env'),
        path.resolve(__dirname, '../../../../.env'),
      ].find((p) => fs.existsSync(p)) || '../../.env',
      validate: validateEnv,
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    ThreadsModule,
    CommentsModule,
    OpportunitiesModule,
    EventsModule,
    NotificationsModule,
    WorkspacesModule,
    SupervisorsModule,
    DepartmentsModule,
    PublicationsModule,
    ReportsModule,
    AdminModule,
    FacultiesModule,
    OnboardingModule,
    SupervisorRequestsModule,
    AnnouncementsModule,
    FeedModule,
    CollaborationsModule,
    MyResearchModule,
    IntegrationsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}