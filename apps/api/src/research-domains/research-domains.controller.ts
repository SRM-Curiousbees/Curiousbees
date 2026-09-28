import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ResearchDomainsService } from './research-domains.service';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { Public } from '../auth/public.decorator';

@Controller('research-domains')
@UseGuards(SupabaseAuthGuard)
export class ResearchDomainsController {
  constructor(private readonly domainsService: ResearchDomainsService) {}

  @Public()
  @Get()
  async findAll() {
    return this.domainsService.findAll();
  }

  @Public()
  @Get('topics')
  async getTopics(@Query('domainId') domainId?: string) {
    return this.domainsService.getTopics(domainId);
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.domainsService.findById(id);
  }
}
