import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { EventIngestionService } from './event-ingestion.service';

/** Institute administrators review emails that couldn't safely become events on their own. */
@Controller('admin/event-ingestion')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(Role.INSTITUTE_ADMIN)
export class AdminEventIngestionController {
  constructor(private readonly ingestion: EventIngestionService) {}

  @Get()
  list(@Query() query: { status?: string; page?: string; limit?: string }) {
    return this.ingestion.list(query);
  }

  @Get('stats')
  stats(@Query('days') days?: string) {
    return this.ingestion.stats(days ? Number(days) : 30);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() body: unknown, @Req() req: any) {
    return this.ingestion.approve(id, body, req.user);
  }

  @Post(':id/dismiss')
  dismiss(@Param('id') id: string, @Body() body: unknown, @Req() req: any) {
    return this.ingestion.dismiss(id, body, req.user);
  }
}
