import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleWorkspaceService } from './google-workspace.service';
import { ZoomWorkplaceService } from './zoom-workplace.service';
import { IntegrationProvider, IntegrationStatus } from '@prisma/client';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleWorkspace: GoogleWorkspaceService,
    private readonly zoomWorkplace: ZoomWorkplaceService
  ) {}

  /**
   * Retrieves all integration connection states for a user
   */
  async getUserConnections(userId: string) {
    const connections = await this.prisma.integrationConnection.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        status: true,
        externalAccountEmail: true,
        scopes: true,
        connectedAt: true,
        updatedAt: true,
        lastError: true,
      },
    });

    const google = connections.find((c) => c.provider === IntegrationProvider.GOOGLE_WORKSPACE);
    const zoom = connections.find((c) => c.provider === IntegrationProvider.ZOOM_WORKPLACE);

    return {
      google: google || {
        provider: IntegrationProvider.GOOGLE_WORKSPACE,
        status: IntegrationStatus.NOT_CONNECTED,
      },
      zoom: zoom || {
        provider: IntegrationProvider.ZOOM_WORKPLACE,
        status: IntegrationStatus.NOT_CONNECTED,
      },
    };
  }

  /**
   * Generates authorization URL for Google Workspace
   */
  getGoogleAuthUrl(userId: string, redirectUri: string) {
    const state = JSON.stringify({ userId, provider: 'GOOGLE_WORKSPACE', timestamp: Date.now() });
    return {
      authUrl: this.googleWorkspace.getAuthorizationUrl(redirectUri, Buffer.from(state).toString('base64')),
    };
  }

  /**
   * Handles Google Workspace OAuth callback and persists credentials
   */
  async handleGoogleCallback(userId: string, code: string, redirectUri: string) {
    const tokens = await this.googleWorkspace.exchangeCodeForTokens(code, redirectUri);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    const connection = await this.prisma.integrationConnection.upsert({
      where: {
        userId_provider: {
          userId,
          provider: IntegrationProvider.GOOGLE_WORKSPACE,
        },
      },
      create: {
        userId,
        provider: IntegrationProvider.GOOGLE_WORKSPACE,
        status: IntegrationStatus.CONNECTED,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: expiresAt,
        scopes: tokens.scopes,
        externalAccountEmail: tokens.email,
        connectedAt: new Date(),
        lastError: null,
      },
      update: {
        status: IntegrationStatus.CONNECTED,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || undefined,
        tokenExpiresAt: expiresAt,
        scopes: tokens.scopes,
        externalAccountEmail: tokens.email || undefined,
        connectedAt: new Date(),
        lastError: null,
      },
    });

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'GOOGLE_CONNECTED',
        details: `Connected Google Workspace account (${tokens.email || 'authenticated'})`,
      },
    }).catch(() => {});

    return {
      status: connection.status,
      email: connection.externalAccountEmail,
      connectedAt: connection.connectedAt,
    };
  }

  /**
   * Generates authorization URL for Zoom Workplace
   */
  getZoomAuthUrl(userId: string, redirectUri: string) {
    const state = JSON.stringify({ userId, provider: 'ZOOM_WORKPLACE', timestamp: Date.now() });
    return {
      authUrl: this.zoomWorkplace.getAuthorizationUrl(redirectUri, Buffer.from(state).toString('base64')),
    };
  }

  /**
   * Handles Zoom Workplace OAuth callback and persists credentials
   */
  async handleZoomCallback(userId: string, code: string, redirectUri: string) {
    const tokens = await this.zoomWorkplace.exchangeCodeForTokens(code, redirectUri);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    const connection = await this.prisma.integrationConnection.upsert({
      where: {
        userId_provider: {
          userId,
          provider: IntegrationProvider.ZOOM_WORKPLACE,
        },
      },
      create: {
        userId,
        provider: IntegrationProvider.ZOOM_WORKPLACE,
        status: IntegrationStatus.CONNECTED,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: expiresAt,
        scopes: tokens.scopes,
        externalAccountEmail: tokens.email,
        connectedAt: new Date(),
        lastError: null,
      },
      update: {
        status: IntegrationStatus.CONNECTED,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || undefined,
        tokenExpiresAt: expiresAt,
        scopes: tokens.scopes || undefined,
        externalAccountEmail: tokens.email || undefined,
        connectedAt: new Date(),
        lastError: null,
      },
    });

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'ZOOM_CONNECTED',
        details: `Connected Zoom Workplace account (${tokens.email || 'authenticated'})`,
      },
    }).catch(() => {});

    return {
      status: connection.status,
      email: connection.externalAccountEmail,
      connectedAt: connection.connectedAt,
    };
  }

  /**
   * Connects an integration directly for a user (useful for 1-click connect and demo environments)
   */
  async connectDirectly(userId: string, provider: IntegrationProvider, userEmail?: string) {
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const email = userEmail || 'user@srmist.edu.in';
    const connection = await this.prisma.integrationConnection.upsert({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
      create: {
        userId,
        provider,
        status: IntegrationStatus.CONNECTED,
        accessToken: `conn-tok-${Date.now()}`,
        refreshToken: `conn-ref-${Date.now()}`,
        tokenExpiresAt: expiresAt,
        scopes:
          provider === IntegrationProvider.GOOGLE_WORKSPACE
            ? 'openid email profile https://www.googleapis.com/auth/calendar.events'
            : 'meeting:write',
        externalAccountEmail: email,
        connectedAt: new Date(),
        lastError: null,
      },
      update: {
        status: IntegrationStatus.CONNECTED,
        accessToken: `conn-tok-${Date.now()}`,
        tokenExpiresAt: expiresAt,
        externalAccountEmail: email,
        connectedAt: new Date(),
        lastError: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: `${provider}_CONNECTED`,
        details: `Connected ${provider} integration (${email})`,
      },
    }).catch(() => {});

    return {
      status: connection.status,
      email: connection.externalAccountEmail,
      connectedAt: connection.connectedAt,
    };
  }

  /**
   * Disconnects a provider integration safely
   */
  async disconnect(userId: string, provider: IntegrationProvider) {
    await this.prisma.integrationConnection.deleteMany({
      where: { userId, provider },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: `${provider}_DISCONNECTED`,
        details: `Disconnected ${provider} integration`,
      },
    }).catch(() => {});

    return { success: true, provider, status: IntegrationStatus.NOT_CONNECTED };
  }

  /**
   * Helper to retrieve a valid access token for a user and provider with auto-refresh
   */
  async getValidAccessToken(userId: string, provider: IntegrationProvider): Promise<string | null> {
    const connection = await this.prisma.integrationConnection.findUnique({
      where: {
        userId_provider: { userId, provider },
      },
    });

    if (!connection || !connection.accessToken) {
      return null;
    }

    // Check if token is still valid (with 60s buffer)
    const isExpired = connection.tokenExpiresAt
      ? connection.tokenExpiresAt.getTime() - 60000 < Date.now()
      : false;

    if (!isExpired) {
      return connection.accessToken;
    }

    // Attempt token refresh
    if (connection.refreshToken) {
      try {
        if (provider === IntegrationProvider.GOOGLE_WORKSPACE) {
          const refreshed = await this.googleWorkspace.refreshAccessToken(connection.refreshToken);
          const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
          await this.prisma.integrationConnection.update({
            where: { id: connection.id },
            data: {
              accessToken: refreshed.accessToken,
              tokenExpiresAt: expiresAt,
              status: IntegrationStatus.CONNECTED,
            },
          });
          return refreshed.accessToken;
        } else if (provider === IntegrationProvider.ZOOM_WORKPLACE) {
          const refreshed = await this.zoomWorkplace.refreshAccessToken(connection.refreshToken);
          const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
          await this.prisma.integrationConnection.update({
            where: { id: connection.id },
            data: {
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken || connection.refreshToken,
              tokenExpiresAt: expiresAt,
              status: IntegrationStatus.CONNECTED,
            },
          });
          return refreshed.accessToken;
        }
      } catch (err: any) {
        this.logger.error(`Token refresh failed for ${provider} (user: ${userId}): ${err.message}`);
        await this.prisma.integrationConnection.update({
          where: { id: connection.id },
          data: {
            status: IntegrationStatus.EXPIRED,
            lastError: 'Authorization expired. Reconnection required.',
          },
        });
      }
    }

    return null;
  }

  /**
   * Retrieves institutional settings for integrations
   */
  async getInstitutionSettings() {
    let settings = await this.prisma.institutionIntegrationSetting.findFirst();
    if (!settings) {
      settings = await this.prisma.institutionIntegrationSetting.create({
        data: {
          googleWorkspaceEnabled: true,
          zoomWorkplaceEnabled: true,
          externalLinksEnabled: true,
        },
      });
    }
    return settings;
  }

  /**
   * Updates institutional settings for integrations
   */
  async updateInstitutionSettings(data: {
    googleWorkspaceEnabled?: boolean;
    zoomWorkplaceEnabled?: boolean;
    externalLinksEnabled?: boolean;
  }) {
    const existing = await this.getInstitutionSettings();
    return this.prisma.institutionIntegrationSetting.update({
      where: { id: existing.id },
      data,
    });
  }
}
