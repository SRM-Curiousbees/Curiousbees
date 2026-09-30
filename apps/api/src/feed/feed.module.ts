import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [PrismaModule, AuthModule, SearchModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
