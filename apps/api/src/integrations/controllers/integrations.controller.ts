import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../auth/supabase.guard';
import { ApprovedGuard } from '../../auth/approved.guard';
import { IntegrationsService } from '../services/integrations.service';
import { IntegrationProvider } from '@prisma/client';

@Controller('integrations')
@UseGuards(SupabaseAuthGuard, ApprovedGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  /**
   * Retrieves connection states for the active user
   */
  @Get('status')
  async getStatus(@Req() req: any) {
    return this.integrationsService.getUserConnections(req.user.id);
  }

  /**
   * Generates Google Workspace OAuth authorization URL
   */
  @Get('google/auth-url')
  async getGoogleAuthUrl(@Req() req: any, @Query('redirectUri') redirectUri: string) {
    if (!redirectUri) {
      throw new BadRequestException('redirectUri query parameter is required.');
    }
    return this.integrationsService.getGoogleAuthUrl(req.user.id, redirectUri);
  }

  /**
   * Completes Google Workspace OAuth code exchange
   */
  @Post('google/callback')
  async handleGoogleCallback(
    @Req() req: any,
    @Body('code') code: string,
    @Body('redirectUri') redirectUri: string
  ) {
    if (!code || !redirectUri) {
      throw new BadRequestException('code and redirectUri are required.');
    }
    return this.integrationsService.handleGoogleCallback(req.user.id, code, redirectUri);
  }

  /**
   * Generates Zoom Workplace OAuth authorization URL
   */
  @Get('zoom/auth-url')
  async getZoomAuthUrl(@Req() req: any, @Query('redirectUri') redirectUri: string) {
    if (!redirectUri) {
      throw new BadRequestException('redirectUri query parameter is required.');
    }
    return this.integrationsService.getZoomAuthUrl(req.user.id, redirectUri);
  }

  /**
   * Completes Zoom Workplace OAuth code exchange
   */
  @Post('zoom/callback')
  async handleZoomCallback(
    @Req() req: any,
    @Body('code') code: string,
    @Body('redirectUri') redirectUri: string
  ) {
    if (!code || !redirectUri) {
      throw new BadRequestException('code and redirectUri are required.');
    }
    return this.integrationsService.handleZoomCallback(req.user.id, code, redirectUri);
  }

  /**
   * Connects an integration directly for active user
   */
  @Post(':provider/connect')
  async connectDirectly(@Req() req: any, @Param('provider') provider: IntegrationProvider) {
    return this.integrationsService.connectDirectly(req.user.id, provider, req.user.email);
  }

  /**
   * Disconnects an integration
   */
  @Post(':provider/disconnect')
  async disconnect(@Req() req: any, @Param('provider') provider: IntegrationProvider) {
    return this.integrationsService.disconnect(req.user.id, provider);
  }

  /**
   * Retrieves institutional settings for integrations
   */
  @Get('settings')
  async getInstitutionSettings() {
    return this.integrationsService.getInstitutionSettings();
  }

  /**
   * Updates institutional settings (Institute Admin only)
   */
  @Patch('settings')
  async updateInstitutionSettings(@Req() req: any, @Body() data: any) {
    if (req.user.role !== 'INSTITUTE_ADMIN') {
      throw new ForbiddenException('Only institutional administrators can manage integration policies.');
    }
    return this.integrationsService.updateInstitutionSettings(data);
  }
}
