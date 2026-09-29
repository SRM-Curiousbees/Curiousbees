import { Controller, Get, Put, Patch, Post, Body, Query, UseGuards, Req, BadRequestException, Param, Delete } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { ResearchParticipantGuard } from '../auth/guards/research-participant.guard';
import { UsersService } from './users.service';
import { UpdateProfileInput } from '@curiousbees/types';
import { Public } from '../auth/public.decorator';

@Controller('users')
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getMyProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Get(':id/profile')
  async getUserProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Put('profile')
  async updateProfile(@Req() req: any, @Body() body: UpdateProfileInput) {
    return this.usersService.updateProfile(req.user.id, body);
  }

  @Patch('profile')
  async patchProfile(@Req() req: any, @Body() body: UpdateProfileInput) {
    return this.usersService.updateProfile(req.user.id, body);
  }

  @Get(':id/external-links')
  async getExternalLinks(@Param('id') id: string) {
    return this.usersService.getExternalLinks(id);
  }

  @Post(':id/external-links')
  async addExternalLink(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { platform: string; label?: string; url: string },
  ) {
    if (req.user.id !== id) {
      throw new BadRequestException('You can only edit external links for your own profile.');
    }
    return this.usersService.addExternalLink(id, body.platform, body.label, body.url);
  }

  @Patch(':id/external-links/:linkId')
  async updateExternalLink(
    @Req() req: any,
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Body() body: { label?: string; url?: string; isVisible?: boolean },
  ) {
    if (req.user.id !== id) {
      throw new BadRequestException('You can only edit external links for your own profile.');
    }
    return this.usersService.updateExternalLink(id, linkId, body.label, body.url, body.isVisible);
  }

  @Delete(':id/external-links/:linkId')
  async deleteExternalLink(
    @Req() req: any,
    @Param('id') id: string,
    @Param('linkId') linkId: string,
  ) {
    if (req.user.id !== id) {
      throw new BadRequestException('You can only delete external links from your own profile.');
    }
    return this.usersService.deleteExternalLink(id, linkId);
  }

  @Get('collaborators')
  async getCollaborators(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('department') department?: string
  ) {
    return this.usersService.getCollaborators(req.user.id, search, department);
  }

  @Post(':id/connect')
  @UseGuards(ResearchParticipantGuard)
  async toggleConnection(@Req() req: any, @Param('id') targetUserId: string) {
    return this.usersService.toggleConnection(req.user.id, targetUserId);
  }

  @Get('interests')
  async getAllInterests() {
    return this.usersService.getAllInterests();
  }

  @Put('request-supervisor')
  @UseGuards(ResearchParticipantGuard)
  async requestSupervisor(@Req() req: any, @Body('supervisorId') supervisorId: string) {
    if (!supervisorId) {
      throw new BadRequestException('supervisorId is required.');
    }
    return this.usersService.requestSupervisor(req.user.id, supervisorId);
  }

  @Get('approvals')
  async getApprovals(@Req() req: any) {
    if (req.user.role !== 'SUPERVISOR' && req.user.role !== 'RESEARCH_SUPERVISOR') {
      throw new BadRequestException('Only research supervisors can fetch pending approvals.');
    }
    return this.usersService.getApprovals(req.user.id);
  }

  @Put('approve-scholar')
  async approveScholar(@Req() req: any, @Body('scholarId') scholarId: string) {
    if (req.user.role !== 'SUPERVISOR' && req.user.role !== 'RESEARCH_SUPERVISOR') {
      throw new BadRequestException('Only research supervisors can approve scholars.');
    }
    if (!scholarId) {
      throw new BadRequestException('scholarId is required.');
    }
    return this.usersService.approveScholar(req.user.id, scholarId);
  }

  @Put('approve-supervisor')
  async approveSupervisor(@Req() req: any, @Body('supervisorId') supervisorId: string) {
    return {
      message: 'Research Supervisors join directly and do not require administrative approval.',
      supervisorId,
    };
  }

  @Put('decline-supervisor')
  async declineSupervisor(@Req() req: any, @Body('supervisorId') supervisorId: string) {
    return {
      message: 'Research Supervisors join directly and do not require administrative approval.',
      supervisorId,
    };
  }

  @Put('decline-scholar')
  async declineScholar(@Req() req: any, @Body('scholarId') scholarId: string) {
    if (req.user.role !== 'SUPERVISOR' && req.user.role !== 'RESEARCH_SUPERVISOR') {
      throw new BadRequestException('Only research supervisors can decline scholars.');
    }
    if (!scholarId) {
      throw new BadRequestException('scholarId is required.');
    }
    return this.usersService.declineScholar(req.user.id, scholarId);
  }

  @Get('all')
  async getAllUsers(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.getAllUsers(req.user.id, limit, page, search, role);
  }

  @Public()
  @Get('supervisors')
  async getSupervisors() {
    return this.usersService.getSupervisors();
  }

  @Get('my-scholars')
  async getMyScholars(@Req() req: any) {
    if (req.user.role !== 'SUPERVISOR' && req.user.role !== 'RESEARCH_SUPERVISOR' && req.user.role !== 'ADMIN' && req.user.role !== 'INSTITUTE_ADMIN') {
      throw new BadRequestException('Only supervisors can view their assigned scholars.');
    }
    return this.usersService.getMyScholars(req.user.id);
  }

  @Put(':id/role')
  async updateUserRole(
    @Req() req: any,
    @Param('id') targetUserId: string,
    @Body('role') role: 'SUPERVISOR' | 'SCHOLAR' | 'INSTITUTE_ADMIN' | 'ADMIN'
  ) {
    if (!role || !['SUPERVISOR', 'SCHOLAR', 'INSTITUTE_ADMIN', 'ADMIN'].includes(role)) {
      throw new BadRequestException('Invalid user role.');
    }
    return this.usersService.updateUserRole(req.user.id, targetUserId, role as any);
  }

  @Put(':id/suspend')
  async suspendUser(
    @Req() req: any,
    @Param('id') targetUserId: string,
    @Body('suspended') suspended: boolean
  ) {
    return this.usersService.suspendUser(req.user.id, targetUserId, suspended);
  }

  @Get('audit-logs')
  async getAuditLogs(@Req() req: any) {
    return this.usersService.getAuditLogs(req.user.id);
  }

  @Put('onboard')
  async completeOnboarding(
    @Req() req: any,
    @Body() payload: { role: 'SCHOLAR' | 'SUPERVISOR'; supervisorId?: string }
  ) {
    if (!payload.role || !['SCHOLAR', 'SUPERVISOR'].includes(payload.role)) {
      throw new BadRequestException('Invalid role selection.');
    }
    return this.usersService.completeOnboarding(req.user.id, payload);
  }

  @Post('register')
  async register(@Req() req: any, @Body() body: any) {
    return this.usersService.register(req.user.id, body);
  }

  @Get('pending-supervisors')
  async getPendingSupervisors(@Req() req: any) {
    return this.usersService.getPendingSupervisors(req.user.id);
  }

  // --- RESEARCHER NETWORK (FOLLOW) ---

  @Get('researchers')
  async getResearchers(
    @Req() req: any,
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('department') department?: string,
    @Query('departmentId') departmentId?: string,
    @Query('facultyId') facultyId?: string,
    @Query('campusId') campusId?: string,
    @Query('interest') interest?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.usersService.getResearchers(req.user.id, {
      q,
      role,
      department,
      departmentId,
      facultyId,
      campusId,
      interest,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20
    });
  }

  @Post(':id/follow')
  @UseGuards(ResearchParticipantGuard)
  async followUser(@Req() req: any, @Param('id') targetId: string) {
    return this.usersService.followUser(req.user.id, targetId);
  }

  @Delete(':id/follow')
  @UseGuards(ResearchParticipantGuard)
  async unfollowUser(@Req() req: any, @Param('id') targetId: string) {
    return this.usersService.unfollowUser(req.user.id, targetId);
  }

  @Put(':id/follow-notifications')
  @UseGuards(ResearchParticipantGuard)
  async setFollowNotifications(
    @Req() req: any, 
    @Param('id') targetId: string, 
    @Body('enabled') enabled: boolean
  ) {
    return this.usersService.setFollowNotifications(req.user.id, targetId, enabled);
  }

  @Get(':id/follow-status')
  async getFollowStatus(@Req() req: any, @Param('id') targetId: string) {
    return this.usersService.getFollowStatus(req.user.id, targetId);
  }

  @Get(':id/followers')
  async getFollowers(
    @Param('id') targetId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.usersService.getFollowers(targetId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get(':id/following')
  async getFollowing(
    @Param('id') targetId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.usersService.getFollowing(targetId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get('me/follow-state')
  async getMyFollowState(@Req() req: any) {
    return this.usersService.getUserFollowState(req.user.id);
  }

  // --- DOMAIN FOLLOW ROUTES ---
  @Post('follow-domain')
  @UseGuards(ResearchParticipantGuard)
  async followDomain(@Req() req: any, @Body('domain') domain: string) {
    return this.usersService.followDomain(req.user.id, domain);
  }

  @Delete('follow-domain')
  @UseGuards(ResearchParticipantGuard)
  async unfollowDomain(@Req() req: any, @Body('domain') domain: string) {
    return this.usersService.unfollowDomain(req.user.id, domain);
  }

  @Get('followed-domains')
  async getFollowedDomains(@Req() req: any) {
    return this.usersService.getFollowedDomains(req.user.id);
  }

  // --- TOPIC / HASHTAG FOLLOW ROUTES ---
  @Post('follow-topic')
  @UseGuards(ResearchParticipantGuard)
  async followTopic(@Req() req: any, @Body('topic') topic: string) {
    return this.usersService.followTopic(req.user.id, topic);
  }

  @Delete('follow-topic')
  @UseGuards(ResearchParticipantGuard)
  async unfollowTopic(@Req() req: any, @Body('topic') topic: string) {
    return this.usersService.unfollowTopic(req.user.id, topic);
  }

  @Get('followed-topics')
  async getFollowedTopics(@Req() req: any) {
    return this.usersService.getFollowedTopics(req.user.id);
  }
}
