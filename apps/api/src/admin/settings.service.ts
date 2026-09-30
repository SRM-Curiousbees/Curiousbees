import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getAllowedEmailDomains } from '../auth/email-policy';
import { AuditHelperService } from './audit-helper';

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(
    private prisma: PrismaService,
    private auditHelper: AuditHelperService,
  ) {}

  /**
   * The configuration the platform is actually running with. These values come from
   * server environment variables, so they are reported read-only; `stored` holds any
   * governance settings saved through updateSetting (not currently read elsewhere).
   */
  async getSettings() {
    const stored = await this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
    const configured = (...names: string[]) => names.some((n) => Boolean(process.env[n]?.trim()));

    return {
      authentication: {
        method: 'Google sign-in for accounts created by administrators',
        allowedDomains: getAllowedEmailDomains(),
        source: 'ALLOWED_EMAIL_DOMAINS',
      },
      email: {
        provider: 'Brevo',
        configured: configured('BREVO_API_KEY'),
        senderEmail: process.env.MAIL_FROM_EMAIL || process.env.BREVO_SENDER_EMAIL || null,
        senderName: process.env.MAIL_FROM_NAME || process.env.BREVO_SENDER_NAME || 'CuriousBees',
      },
      integrations: {
        googleWorkspace: configured('GOOGLE_WORKSPACE_CLIENT_ID', 'GOOGLE_CLIENT_ID'),
        zoomWorkplace: configured('ZOOM_WORKPLACE_CLIENT_ID', 'ZOOM_CLIENT_ID'),
      },
      stored: stored.map((s) => ({ key: s.key, category: s.category, value: s.value, updatedAt: s.updatedAt })),
    };
  }

  async updateSetting(actor: any, key: string, value: any, category: string = 'GENERAL') {
    const previous = await this.prisma.systemSetting.findUnique({ where: { key } });

    const updated = await this.prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        category,
        updatedBy: actor.id,
      },
      update: {
        value,
        category,
        updatedBy: actor.id,
      },
    });

    await this.auditHelper.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'SETTING_CHANGED',
      targetId: key,
      targetType: 'SYSTEM_SETTING',
      category: 'SYSTEM',
      severity: 'HIGH',
      details: `Governance setting "${key}" updated.`,
      previousState: previous ? previous.value : null,
      newState: value,
      metadata: { key, category },
    });

    return updated;
  }

  /**
   * Email delivery as recorded by the platform. Supervision emails log their outcome
   * (…_EMAIL_SENT / …_EMAIL_FAILED) in the audit log; nothing else is tracked, and
   * Brevo's own delivery/bounce data is not fetched.
   */
  async getEmailDeliveryStats() {
    const sentWhere = { action: { endsWith: '_EMAIL_SENT' } };
    const failedWhere = { action: { endsWith: '_EMAIL_FAILED' } };
    const [sent, failed, recent, inAppNotifications, activePushDevices] = await Promise.all([
      this.prisma.auditLog.count({ where: sentWhere }),
      this.prisma.auditLog.count({ where: failedWhere }),
      this.prisma.auditLog.findMany({
        where: { OR: [sentWhere, failedWhere] },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      this.prisma.notification.count(),
      this.prisma.notificationToken.count(),
    ]);

    const recentLogs = recent.map((log) => {
      let details: any = {};
      try {
        details = log.details ? JSON.parse(log.details) : {};
      } catch {
        details = {};
      }
      return {
        id: log.id,
        recipient: details.supervisorEmail || details.scholarEmail || details.recipient || null,
        template: log.action.replace(/_EMAIL_(SENT|FAILED)$/, ''),
        status: log.action.endsWith('_EMAIL_SENT') ? 'SENT' : 'FAILED',
        error: details.error || null,
        timestamp: log.createdAt,
      };
    });

    return {
      provider: 'Brevo',
      configured: Boolean(process.env.BREVO_API_KEY),
      senderEmail: process.env.MAIL_FROM_EMAIL || process.env.BREVO_SENDER_EMAIL || null,
      trackedEmails: 'Supervision request, acceptance and decline emails',
      stats: { emailsSent: sent, emailsFailed: failed, inAppNotifications, activePushDevices },
      recentLogs,
    };
  }
}
