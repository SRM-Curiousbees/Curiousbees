import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId =
      (request.headers['x-request-id'] as string) ||
      (request.headers['x-amzn-trace-id'] as string) ||
      crypto.randomUUID();

    (request as any).id = requestId;
    response.setHeader('x-request-id', requestId);

    const { ip, method, originalUrl } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    response.on('finish', () => {
      const { statusCode } = response;
      const duration = Date.now() - startTime;

      // Skip logging verbose health checks to prevent CloudWatch flood
      if (originalUrl.includes('/health/live') || originalUrl.includes('/health/ready')) {
        return;
      }

      this.logger.log(
        JSON.stringify({
          requestId,
          method,
          url: originalUrl,
          status: statusCode,
          durationMs: duration,
          ip,
          userAgent,
          timestamp: new Date().toISOString(),
        })
      );
    });

    next();
  }
}
