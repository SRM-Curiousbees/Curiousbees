import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UserStatus } from '@prisma/client';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    try {
      const [
        totalUsers,
        activeScholars,
        activeSupervisors,
        activeAdmins,
        suspendedUsers,
        activeWorkspaces,
        totalPublications,
        totalThreads,
        openReports,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: { role: Role.RESEARCH_SCHOLAR, status: UserStatus.ACTIVE, suspended: false },
        }),
        this.prisma.user.count({
          where: { role: Role.RESEARCH_SUPERVISOR, status: UserStatus.ACTIVE, suspended: false },
        }),
        this.prisma.user.count({
          where: { role: Role.INSTITUTE_ADMIN, status: UserStatus.ACTIVE, suspended: false },
        }),
        this.prisma.user.count({
          where: {
            OR: [
              { status: UserStatus.SUSPENDED },
              { suspended: true },
            ],
          },
        }),
        this.prisma.workspace.count(),
        this.prisma.publication.count({
          where: { hidden: false },
        }),
        this.prisma.thread.count({
          where: { hidden: false },
        }),
        this.prisma.moderationReport.count({
          where: { status: 'OPEN' },
        }),
      ]);

      return {
        totalUsers,
        activeScholars,
        activeSupervisors,
        activeAdmins,
        suspendedAccounts: suspendedUsers,
        activeWorkspaces,
        publications: totalPublications,
        posts: totalThreads,
        openReports,
      };
    } catch (err: any) {
      this.logger.error(`Error calculating admin dashboard stats: ${err.message}`, err.stack);
      throw err;
    }
  }

  async getNeedsAttention() {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      category: string;
      targetId: string;
      targetType: string;
      actionUrl: string;
      timestamp: Date;
    }> = [];

    try {
      // 1. Open Moderation Reports
      const reports = await this.prisma.moderationReport.findMany({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          reporter: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      for (const rep of reports) {
        items.push({
          id: `rep-${rep.id}`,
          title: `Open Moderation Report (${rep.targetType})`,
          description: `Reported for: "${rep.reason}" by ${rep.reporter?.name || 'Anonymous'}.`,
          severity: (rep.severity as any) || 'HIGH',
          category: 'MODERATION',
          targetId: rep.targetId,
          targetType: rep.targetType,
          actionUrl: `/admin/moderation`,
          timestamp: rep.createdAt,
        });
      }

      // 2. Suspended Accounts Requiring Review
      const suspendedUsers = await this.prisma.user.findMany({
        where: {
          OR: [
            { status: UserStatus.SUSPENDED },
            { suspended: true },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          updatedAt: true,
        },
      });

      for (const u of suspendedUsers) {
        items.push({
          id: `susp-${u.id}`,
          title: `Suspended Account Review`,
          description: `${u.name || u.email} (${u.role}) is suspended.`,
          severity: 'MEDIUM',
          category: 'ACCESS',
          targetId: u.id,
          targetType: 'USER',
          actionUrl: `/admin/users?tab=SUSPENDED`,
          timestamp: u.updatedAt,
        });
      }

      // 3. Security Events / Anomalies
      const securityLogs = await this.prisma.auditLog.findMany({
        where: {
          OR: [
            { category: 'SECURITY' },
            { severity: 'CRITICAL' },
            { severity: 'HIGH' },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      for (const log of securityLogs) {
        items.push({
          id: `sec-${log.id}`,
          title: `Security Event: ${log.action}`,
          description: log.details || `Administrative security alert recorded for actor ${log.actorEmail || 'System'}.`,
          severity: (log.severity as any) || 'HIGH',
          category: 'SECURITY',
          targetId: log.targetId || log.id,
          targetType: log.targetType || 'SYSTEM',
          actionUrl: `/admin/audit`,
          timestamp: log.createdAt,
        });
      }

      // Sort all items newest first
      return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (err: any) {
      this.logger.error(`Error loading needs attention items: ${err.message}`, err.stack);
      return [];
    }
  }
}
