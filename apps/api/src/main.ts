import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Resolve the root .env file dynamically and absolutely
const envCandidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../../.env'),
  path.join(process.cwd(), '.env'),
];
const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
if (envPath) {
  dotenv.config({ path: envPath });
  console.log(`[CuriousBees] Loaded root environment from ${envPath}`);
} else {
  dotenv.config();
  console.warn('[CuriousBees] No root .env file found.');
}

// Startup Validation Layer - Non-fatal warnings to avoid boot crashes on Railway
const requiredEnvVars = ['DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.warn('\n================================================================');
  console.warn('⚠️  WARNING: Missing Required Environment Variables');
  console.warn('================================================================');
  missingEnvVars.forEach((v) => {
    console.warn(`  - ${v} is not set in the environment.`);
  });
  console.warn('\nPlease configure these variables in your environment or .env file.');
  console.warn('The application will attempt to run, but some services may fail.');
  console.warn('================================================================\n');
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe, Logger } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { WinstonModule } from 'nest-winston';
import { winstonOptions } from './config/winston.config';
import helmet from 'helmet';
import * as compression from 'compression';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// ─── Shared app bootstrap ────────────────────────────────────────────────────

async function createApp(expressInstance?: express.Express) {
  const app = expressInstance
    ? await NestFactory.create(AppModule, new ExpressAdapter(expressInstance), {
        logger: WinstonModule.createLogger(winstonOptions),
      })
    : await NestFactory.create(AppModule, {
        logger: WinstonModule.createLogger(winstonOptions),
      });

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

  // Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CuriousBees API')
    .setDescription('The CuriousBees Academic Collaboration Platform API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

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

  // CORS — supports local dev + all Vercel preview/production deployments
  const parseCommaSeparated = (val?: string): string[] => {
    if (!val) return [];
    return val.split(',').map((o) => o.trim()).filter(Boolean);
  };

  const configuredOrigins = [
    ...parseCommaSeparated(process.env.FRONTEND_URL),
    ...parseCommaSeparated(process.env.WEB_URL),
    ...parseCommaSeparated(process.env.ALLOWED_ORIGINS),
  ];

  const allowedOrigins = Array.from(new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:3003',
    'http://127.0.0.1:3003',
    'https://curiousbees.vercel.app',
    ...configuredOrigins,
  ]));

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Authorization, Content-Type, Accept',
  });

  return app;
}

// ─── Local dev: start HTTP server ────────────────────────────────────────────

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('================================================================');
  logger.log('🐝 Starting CuriousBees API bootstrap sequence...');
  logger.log(`NODE_ENV=${process.env.NODE_ENV}`);
  logger.log(`PORT=${process.env.PORT}`);
  logger.log(`Frontend URL=${process.env.FRONTEND_URL}`);
  logger.log('================================================================');

  const app = await createApp();
  const port = Number(process.env.PORT) || 4000;

  logger.log(`Attempting to listen on port ${port}...`);
  await app.listen(port);
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

if (process.env.VERCEL !== '1') {
  bootstrap();
}

