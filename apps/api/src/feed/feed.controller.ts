import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SEARCH_THROTTLE } from '../common/throttling/rate-limits';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { FeedService } from './feed.service';

@Controller('feed')
@UseGuards(SupabaseAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('search')
  @Throttle({ default: SEARCH_THROTTLE })
  async searchFeed(@Query('q') q: string) {
    return this.feedService.searchFeed(q);
  }

  @Get('peers')
  async getSuggestedPeers(@Req() req: any) {
    return this.feedService.getSuggestedPeers(req.user.id);
  }

  @Get('trending')
  async getTrendingResearch() {
    return this.feedService.getTrendingResearch();
  }
}
