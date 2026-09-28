import { Module } from '@nestjs/common';
import { ResearchDomainsController } from './research-domains.controller';
import { ResearchDomainsService } from './research-domains.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ResearchDomainsController],
  providers: [ResearchDomainsService],
  exports: [ResearchDomainsService],
})
export class ResearchDomainsModule {}
