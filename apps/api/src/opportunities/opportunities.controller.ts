import { Controller, Get, Post, Put, Delete, Body, Query, UseGuards, Req, Param, BadRequestException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { ApprovedGuard } from '../auth/approved.guard';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityInput } from '@curiousbees/types';

@Controller('opportunities')
@UseGuards(SupabaseAuthGuard, ApprovedGuard)
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  async getOpportunities(
    @Req() req: any,
    @Query('department') department?: string,
    @Query('departmentId') departmentId?: string,
    @Query('researchDomain') researchDomain?: string
  ) {
    return this.opportunitiesService.getOpportunities(req.user, department, researchDomain, departmentId);
  }

  // Static routes must be declared before ':id', or Nest matches 'requests' as an id.
  @Get('requests')
  async getCollaborationRequests(@Req() req: any) {
    if (req.user.role === 'SUPERVISOR' || req.user.role === 'RESEARCH_SUPERVISOR' || req.user.role === 'INSTITUTE_ADMIN') {
      return this.opportunitiesService.getRequestsForSupervisor(req.user);
    } else {
      return this.opportunitiesService.getRequestsForScholar(req.user);
    }
  }

  @Get(':id')
  async getOpportunityById(@Req() req: any, @Param('id') id: string) {
    return this.opportunitiesService.getOpportunityById(req.user, id);
  }

  @Post()
  async createOpportunity(@Req() req: any, @Body() body: CreateOpportunityInput) {
    return this.opportunitiesService.createOpportunity(req.user, body);
  }

  @Put(':id')
  async updateOpportunity(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.opportunitiesService.updateOpportunity(req.user, id, body);
  }

  @Delete(':id')
  async deleteOpportunity(@Req() req: any, @Param('id') id: string) {
    return this.opportunitiesService.deleteOpportunity(req.user, id);
  }

  @Post(':id/request')
  async createCollaborationRequest(
    @Req() req: any,
    @Param('id') opportunityId: string,
    @Body('message') message?: string
  ) {
    return this.opportunitiesService.createCollaborationRequest(req.user, opportunityId, message);
  }

  @Put('requests/:id')
  async updateRequestStatus(
    @Req() req: any,
    @Param('id') requestId: string,
    @Body('status') status: 'PUBLISHED' | 'REJECTED' | 'NEEDS_INFO'
  ) {
    if (req.user.role !== 'SUPERVISOR' && req.user.role !== 'RESEARCH_SUPERVISOR' && req.user.role !== 'INSTITUTE_ADMIN') {
      throw new BadRequestException('Only supervisors can update request status.');
    }
    if (!status || !['PUBLISHED', 'REJECTED', 'NEEDS_INFO'].includes(status)) {
      throw new BadRequestException('Invalid request status.');
    }
    return this.opportunitiesService.updateRequestStatus(req.user, requestId, status);
  }
}
