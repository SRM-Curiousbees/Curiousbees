import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Local development reads the monorepo root .env. Production containers get
// their configuration only from the task definition (env + SSM secrets).
const envCandidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../../.env'),
  path.join(process.cwd(), '.env'),
];
const envPath = process.env.NODE_ENV === 'production'
  ? undefined
  : envCandidates.find((candidate) => fs.existsSync(candidate));
if (envPath) {
  dotenv.config({ path: envPath });
  console.log(`[CuriousBees] Loaded root environment from ${envPath}`);
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe, Logger, INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { WinstonModule } from 'nest-winston';
import { winstonOptions } from './config/winston.config';
import helmet from 'helmet';
import * as compression from 'compression';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

const isProduction = () => process.env.NODE_ENV === 'production';

const parseCommaSeparated = (val?: string): string[] =>
  (val || '').split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);

const LOCAL_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

/**
 * Browser origins allowed to call the API with credentials. Production uses
 * only explicitly configured origins (FRONTEND_URL + ALLOWED_ORIGINS); the
 * localhost origins exist for local development only.
 */
export function getAllowedOrigins(): string[] {
  return Array.from(new Set([
    ...parseCommaSeparated(process.env.FRONTEND_URL),
    ...parseCommaSeparated(process.env.ALLOWED_ORIGINS),
    ...(isProduction() ? [] : LOCAL_DEV_ORIGINS),
  ]));
}

// ─── Shared app bootstrap ────────────────────────────────────────────────────

export async function createApp(expressInstance?: express.Express) {
  const app = expressInstance
    ? await NestFactory.create(AppModule, new ExpressAdapter(expressInstance), {
        logger: WinstonModule.createLogger(winstonOptions),
      })
    : await NestFactory.create(AppModule, {
        logger: WinstonModule.createLogger(winstonOptions),
      });
  configureApp(app);
  return app;
}

/**
 * Applies the HTTP pipeline (proxy trust, security headers, prefix, validation,
 * error filter, CORS). Shared by the server bootstrap and integration tests so
 * tests exercise exactly the production configuration.
 */
export function configureApp(app: INestApplication) {
  // Behind CloudFront -> ALB, the socket peer is the ALB and X-Forwarded-For is
  // "<client>, <cloudfront edge>". Trust exactly that many proxy hops so req.ip
  // (used by rate limiting and logs) is the real client, while any
  // X-Forwarded-For values injected by the client itself are ignored.
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops > 0 ? trustProxyHops : false);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Response compression
  app.use(compression());

  // Keep API resources under /api while allowing a lightweight root message.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: 'api', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
      { path: 'api/health', method: RequestMethod.GET },
      { path: 'api/health/live', method: RequestMethod.GET },
      { path: 'api/health/ready', method: RequestMethod.GET },
      { path: 'api/system', method: RequestMethod.GET },
      { path: 'api/version', method: RequestMethod.GET },
    ],
  });

  // Swagger: always available locally; in production only when explicitly enabled.
  if (!isProduction() || process.env.ENABLE_SWAGGER === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CuriousBees API')
      .setDescription('The CuriousBees Academic Collaboration Platform API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Graceful Shutdown Hooks
  app.enableShutdownHooks();

  // CORS — explicit allow-list only (no wildcards, no preview-domain patterns).
  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Same-origin and non-browser requests carry no Origin header.
      if (!origin) return callback(null, true);
      return callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Authorization, Content-Type, Accept, X-Request-Id',
    exposedHeaders: 'X-Request-Id',
    maxAge: 600,
  });
}

// ─── Local dev: start HTTP server ────────────────────────────────────────────

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('================================================================');
  logger.log('🐝 Starting CuriousBees API bootstrap sequence...');
  logger.log(`NODE_ENV=${process.env.NODE_ENV}`);
  logger.log(`PORT=${process.env.PORT}`);
  logger.log(`Frontend URL=${process.env.FRONTEND_URL}`);
  logger.log(`Trusted proxy hops=${process.env.TRUST_PROXY_HOPS || 0}`);
  logger.log('================================================================');

  const app = await createApp();
  const port = Number(process.env.PORT) || 4000;

  logger.log(`Attempting to listen on port ${port}...`);
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 NestJS Application successfully started. Listening on: http://0.0.0.0:${port}`);
}

// ─── Vercel serverless: export a request handler ─────────────────────────────
// Vercel calls the default export with (req, res) — it does NOT bind a TCP port.

let serverHandler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!serverHandler) {
    console.log('[CuriousBees] Cold start — initialising NestJS...');
    const expressApp = express();
    const nestApp = await createApp(expressApp);
    await nestApp.init(); // init WITHOUT listen
    serverHandler = expressApp;
    console.log('[CuriousBees] NestJS ready.');
  }
  serverHandler(req, res);
}

// ─── Entry point ─────────────────────────────────────────────────────────────
// In Vercel, the file is imported and `handler` is used.
// In local dev / production node process, bootstrap() is called directly.

if (require.main === module && process.env.VERCEL !== '1') {
  bootstrap().catch((err) => {
    // Fail fast (e.g. invalid production configuration) so ECS replaces the task.
    console.error('[CuriousBees] Fatal bootstrap error:', err?.message || err);
    process.exit(1);
  });
}

