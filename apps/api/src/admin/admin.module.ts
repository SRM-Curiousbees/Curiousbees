import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditHelperService } from './audit-helper';

import { AdminService } from './admin.service';
import { AdminScholarsController } from './scholars.controller';
import { AdminScholarsService } from './scholars.service';
import { AdminSupervisorsController } from './supervisors.controller';
import { AdminSupervisorsService } from './supervisors.service';
import { AdminAdminsController } from './admins.controller';
import { AdminAdminsService } from './admins.service';

import { AdminDashboardController } from './dashboard.controller';
import { AdminDashboardService } from './dashboard.service';
import { AdminUsersController } from './users.controller';
import { AdminUsersService } from './users.service';
import { AdminModerationController } from './moderation.controller';
import { AdminModerationService } from './moderation.service';
import { AdminContentController } from './content.controller';
import { AdminContentService } from './content.service';
import { AdminInstitutionController } from './institution.controller';
import { AdminInstitutionService } from './institution.service';
import { AdminAuditController } from './audit.controller';
import { AdminAuditService } from './audit.service';
import { AdminResearchGovernanceController } from './research-governance.controller';
import { AdminResearchGovernanceService } from './research-governance.service';
import { AdminAnalyticsController } from './analytics.controller';
import { AdminAnalyticsService } from './analytics.service';
import { AdminRolesController } from './roles.controller';
import { AdminRolesService } from './roles.service';
import { AdminSettingsController } from './settings.controller';
import { AdminSettingsService } from './settings.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminModerationController,
    AdminContentController,
    AdminInstitutionController,
    AdminAuditController,
    AdminResearchGovernanceController,
    AdminAnalyticsController,
    AdminRolesController,
    AdminSettingsController,
    AdminScholarsController,
    AdminSupervisorsController,
    AdminAdminsController,
  ],
  providers: [
    AuditHelperService,
    AdminDashboardService,
    AdminUsersService,
    AdminModerationService,
    AdminContentService,
    AdminInstitutionService,
    AdminAuditService,
    AdminResearchGovernanceService,
    AdminAnalyticsService,
    AdminRolesService,
    AdminSettingsService,
    AdminService,
    AdminScholarsService,
    AdminSupervisorsService,
    AdminAdminsService,
  ],
  exports: [
    AuditHelperService,
    AdminDashboardService,
    AdminUsersService,
    AdminModerationService,
    AdminContentService,
    AdminInstitutionService,
    AdminAuditService,
    AdminResearchGovernanceService,
    AdminAnalyticsService,
    AdminRolesService,
    AdminSettingsService,
    AdminService,
    AdminScholarsService,
    AdminSupervisorsService,
    AdminAdminsService,
  ],
})
export class AdminModule {}
