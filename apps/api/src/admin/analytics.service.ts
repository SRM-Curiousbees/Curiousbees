import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async getAnalytics(range: string = '30D') {
    let days = 30;
    if (range === '7D') days = 7;
    else if (range === '30D') days = 30;
    else if (range === '6M') days = 180;
    else if (range === '1Y') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalUsers,
      totalScholars,
      totalSupervisors,
      totalAdmins,
      totalPosts,
      totalPublications,
      totalWorkspaces,
      totalReports,
      faculties,
      departments,
      usersByDate,
      postsByDate,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'RESEARCH_SCHOLAR' } }),
      this.prisma.user.count({ where: { role: 'RESEARCH_SUPERVISOR' } }),
      this.prisma.user.count({ where: { role: 'INSTITUTE_ADMIN' } }),
      this.prisma.thread.count(),
      this.prisma.publication.count(),
      this.prisma.workspace.count(),
      this.prisma.moderationReport.count(),
      this.prisma.faculty.findMany({
        select: {
          id: true,
          name: true,
          campus: { select: { id: true, name: true, code: true } },
          departments: {
            select: {
              id: true,
              name: true,
              code: true,
              _count: {
                select: { users: true, supervisorProfiles: true, scholarProfiles: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.department.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          faculty: { select: { id: true, name: true } },
          _count: {
            select: { users: true, supervisorProfiles: true, scholarProfiles: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true, role: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.thread.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Timeline buckets sized to the range: daily up to a month, weekly up to six months, then monthly.
    const bucket: 'day' | 'week' | 'month' = days <= 31 ? 'day' : days <= 186 ? 'week' : 'month';
    const bucketKey = (date: Date) => {
      const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      if (bucket === 'week') d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday
      if (bucket === 'month') d.setUTCDate(1);
      return d.toISOString().split('T')[0];
    };
    const timelineMap: Record<string, { date: string; users: number; posts: number }> = {};
    for (const cursor = new Date(startDate); cursor <= new Date(); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const key = bucketKey(cursor);
      timelineMap[key] = timelineMap[key] || { date: key, users: 0, posts: 0 };
    }
    usersByDate.forEach((u) => {
      const entry = timelineMap[bucketKey(u.createdAt)];
      if (entry) entry.users++;
    });
    postsByDate.forEach((p) => {
      const entry = timelineMap[bucketKey(p.createdAt)];
      if (entry) entry.posts++;
    });

    const userActivityTimeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      summary: {
        totalUsers,
        totalScholars,
        totalSupervisors,
        totalAdmins,
        totalPosts,
        totalPublications,
        totalWorkspaces,
        totalReports,
      },
      distribution: {
        scholars: totalScholars,
        supervisors: totalSupervisors,
        admins: totalAdmins,
      },
      facultyActivity: faculties.map((f) => {
        const totalUsers = f.departments.reduce((acc, d) => acc + d._count.users, 0);
        const totalSupervisors = f.departments.reduce((acc, d) => acc + d._count.supervisorProfiles, 0);
        const totalScholars = f.departments.reduce((acc, d) => acc + d._count.scholarProfiles, 0);
        return {
          id: f.id,
          name: f.name,
          campus: f.campus?.name || 'Kattankulathur',
          departmentCount: f.departments.length,
          userCount: totalUsers,
          supervisorCount: totalSupervisors,
          scholarCount: totalScholars,
        };
      }),
      departmentActivity: departments.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        facultyName: d.faculty?.name || 'Unassigned',
        userCount: d._count.users,
        supervisorCount: d._count.supervisorProfiles,
        scholarCount: d._count.scholarProfiles,
      })),
      timeline: userActivityTimeline,
      timelineBucket: bucket,
      range,
    };
  }
}
