import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { SupabaseAuthGuard } from './auth/supabase.guard';
import { RolesGuard } from './auth/roles/roles.guard';
import { Roles } from './auth/roles/roles.decorator';
import { Role } from './auth/roles/role.enum';
import * as os from 'os';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(['', 'api'])
  healthCheck() {
    return {
      message: 'Welcome to CuriousBees API',
      status: 'ok',
      service: 'CuriousBees API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      docs: '/api/docs',
    };
  }

  @Get(['health/live', 'api/health/live'])
  live() {
    return {
      status: 'ok',
      process: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get(['health/ready', 'api/health/ready', 'health', 'api/health'])
  async ready(@Res({ passthrough: true }) res: any) {
    let databaseConnected = false;
    let dbLatencyMs = 0;
    const start = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
      dbLatencyMs = Date.now() - start;
    } catch (err: any) {
      databaseConnected = false;
    }

    if (!databaseConnected) {
      if (res && typeof res.status === 'function') {
        res.status(503);
      }
      return {
        status: 'unhealthy',
        database: 'disconnected',
        error: 'Database connection check failed',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: 'ok',
      database: 'connected',
      dbLatencyMs,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
    };
  }

  // Host/process diagnostics: institute admins only.
  @Get(['system', 'api/system'])
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(Role.INSTITUTE_ADMIN)
  async system() {
    const memory = process.memoryUsage();
    return {
      status: 'ok',
      os: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        cpus: os.cpus().length,
      },
      process: {
        uptime: process.uptime(),
        memoryUsage: {
          rss: `${Math.round((memory.rss / 1024 / 1024) * 100) / 100} MB`,
          heapTotal: `${Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100} MB`,
          heapUsed: `${Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100} MB`,
          external: `${Math.round((memory.external / 1024 / 1024) * 100) / 100} MB`,
        },
        pid: process.pid,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get(['version', 'api/version'])
  version() {
    return {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
