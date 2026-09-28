import { Test, TestingModule } from '@nestjs/testing';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { ApprovedGuard } from '../auth/approved.guard';

describe('FeedController', () => {
  let controller: FeedController;
  let mockFeedService: any;

  beforeEach(async () => {
    mockFeedService = {
      searchFeed: jest.fn().mockResolvedValue({ threads: [], publications: [], users: [] }),
      getSuggestedPeers: jest.fn().mockResolvedValue([]),
      getTrendingResearch: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [
        {
          provide: FeedService,
          useValue: mockFeedService,
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ApprovedGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FeedController>(FeedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('searchFeed should delegate to feedService.searchFeed', async () => {
    const result = await controller.searchFeed('quantum');
    expect(mockFeedService.searchFeed).toHaveBeenCalledWith('quantum');
    expect(result).toEqual({ threads: [], publications: [], users: [] });
  });
});
