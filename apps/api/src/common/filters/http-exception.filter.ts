import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const message = typeof rawResponse === 'object' && rawResponse !== null && 'message' in rawResponse
      ? (rawResponse as any).message
      : rawResponse;
    const code = typeof rawResponse === 'object' && rawResponse !== null && 'code' in rawResponse
      ? (rawResponse as any).code
      : undefined;

    const requestId = (request as any).id || (request.headers['x-request-id'] as string) || 'unknown';
    const errMessage = exception instanceof Error ? exception.message : String(exception);

    // One structured log line per error (CloudWatch-friendly). Stack traces only for server errors.
    const logEntry = JSON.stringify({ requestId, method: request.method, url: request.originalUrl, status, code, error: errMessage });
    if (status >= 500) {
      this.logger.error(logEntry, exception instanceof Error ? exception.stack : undefined);
    } else {
      this.logger.warn(logEntry);
    }

    // Sanitize response details in production to avoid leaking internals
    const isProd = process.env.NODE_ENV === 'production';
    const cleanMessage = status >= 500 && isProd
      ? 'An internal server error occurred'
      : message;

    response.status(status).json({
      statusCode: status,
      ...(code ? { code } : {}),
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: cleanMessage,
    });
  }
}
