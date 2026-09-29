import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { SupabaseService } from './auth/supabase.service';

describe('AppController (ALB Health Checks)', () => {
  let controller: AppController;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        { provide: SupabaseService, useValue: { verifyToken: jest.fn() } },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('live() should report process is alive with uptime', () => {
    const res = controller.live();
    expect(res.status).toBe('ok');
    expect(res.process).toBe('alive');
    expect(typeof res.uptime).toBe('number');
  });

  it('ready() should return ok and latency when database is connected', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const mockRes = { status: jest.fn() };

    const res = await controller.ready(mockRes);
    expect(res.status).toBe('ok');
    expect(res.database).toBe('connected');
    expect(mockRes.status).not.toHaveBeenCalledWith(503);
  });

  it('ready() should set HTTP 503 status code when database fails', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
    const mockRes = { status: jest.fn() };

    const res = await controller.ready(mockRes);
    expect(res.status).toBe('unhealthy');
    expect(res.database).toBe('disconnected');
    expect(mockRes.status).toHaveBeenCalledWith(503);
  });
});
