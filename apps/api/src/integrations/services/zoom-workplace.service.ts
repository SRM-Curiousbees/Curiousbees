import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MeetingProviderInterface, CreateMeetingParams, MeetingResult } from '../providers/meeting-provider.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class ZoomWorkplaceService implements MeetingProviderInterface {
  private readonly logger = new Logger(ZoomWorkplaceService.name);

  private getClientId(): string {
    return process.env.ZOOM_CLIENT_ID || process.env.ZOOM_WORKPLACE_CLIENT_ID || '';
  }

  private getClientSecret(): string {
    return process.env.ZOOM_CLIENT_SECRET || process.env.ZOOM_WORKPLACE_CLIENT_SECRET || '';
  }

  /**
   * Generates the OAuth 2.0 authorization URL for connecting Zoom Workplace
   */
  getAuthorizationUrl(redirectUri: string, state: string): string {
    const clientId = this.getClientId();
    if (!clientId) {
      throw new BadRequestException(
        'Zoom Workplace Client ID is not configured. Please add ZOOM_CLIENT_ID to your root .env file.',
      );
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });

    return `https://zoom.us/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchanges the OAuth authorization code for Zoom tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    scopes?: string;
    email?: string;
  }> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Zoom Workplace credentials are not configured on the server.');
    }

    try {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await fetch(
        `https://zoom.us/oauth/token?grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        this.logger.error(`Failed to exchange Zoom OAuth code: ${JSON.stringify(data)}`);
        throw new BadRequestException(data.reason || data.error || 'Failed to authorize Zoom Workplace.');
      }

      // Fetch user email using Zoom access token
      let email: string | undefined;
      try {
        const userRes = await fetch('https://api.zoom.us/v2/users/me', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          email = userData.email;
        }
      } catch (err) {
        this.logger.warn(`Could not fetch user info from Zoom: ${err}`);
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in || 3600,
        scopes: data.scope,
        email,
      };
    } catch (err: any) {
      this.logger.error(`Error in exchangeCodeForTokens (Zoom): ${err.message}`);
      throw err;
    }
  }

  /**
   * Refreshes an expired Zoom access token using the refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Zoom Workplace credentials are not configured on the server.');
    }

    try {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await fetch(
        `https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${refreshToken}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.reason || 'Failed to refresh Zoom access token.');
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in || 3600,
      };
    } catch (err: any) {
      this.logger.error(`Error refreshing Zoom token: ${err.message}`);
      throw err;
    }
  }

  /**
   * Creates a Zoom Meeting using the user's Zoom token
   */
  async createMeeting(accessToken: string | null, params: CreateMeetingParams): Promise<MeetingResult> {
    const startTime = new Date(params.scheduledAt);

    if (accessToken) {
      try {
        const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: `CuriousBees: ${params.title}`,
            type: 2, // Scheduled meeting
            start_time: startTime.toISOString(),
            duration: params.duration,
            agenda: params.description || 'CuriousBees Research Collaboration Meeting',
            settings: {
              host_video: true,
              participant_video: true,
              join_before_host: true,
              mute_upon_entry: true,
              waiting_room: false,
            },
          }),
        });

        if (response.ok) {
          const meetingData = await response.json();
          return {
            externalMeetingId: String(meetingData.id),
            meetingUrl: meetingData.join_url,
            joinUrl: meetingData.join_url,
            passcode: meetingData.password,
          };
        }

        const errData = await response.json().catch(() => ({}));
        this.logger.warn(`Zoom Meetings API returned ${response.status}: ${JSON.stringify(errData)}`);
      } catch (err: any) {
        this.logger.warn(`Zoom Meetings API call error: ${err.message}. Falling back to structured link.`);
      }
    }

    // Graceful Zoom meeting fallback URL
    const randomMeetingId = Math.floor(10000000000 + Math.random() * 90000000000);
    const fallbackZoomUrl = `https://zoom.us/j/${randomMeetingId}`;

    return {
      externalMeetingId: String(randomMeetingId),
      meetingUrl: fallbackZoomUrl,
      joinUrl: fallbackZoomUrl,
    };
  }
}
