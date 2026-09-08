# Railway Production Readiness Audit & Report

This report summarizes the audit and hardening of the CuriousBees NestJS backend (`apps/api`) for production deployment on Railway.

## Deployment Status: **READY**

The application has been successfully audited, modified, and built locally. All production configurations are aligned with Railway containerized deployment standards.

---

## 1. Changes Made

### I. Server Port Configuration

- **Location**: `apps/api/src/main.ts`
- **Fix**: Replaced hardcoded localhost listening with Railway dynamic port binding:
  ```typescript
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, "0.0.0.0");
  ```
  This ensures the container binds to the correct IP (`0.0.0.0`) and is routeable externally.

### II. Production CORS Configuration

- **Location**: `apps/api/src/main.ts`
- **Fix**: Rewrote the CORS config to split comma-separated origins from `ALLOWED_ORIGINS`, `FRONTEND_URL`, and `WEB_URL`. Allowed headers explicitly include `Authorization`, `Content-Type`, and `Accept`.

### III. Railway Environment Validation (Graceful Startup)

- **Location**: `apps/api/src/main.ts`, `apps/api/src/config/env.validation.ts`
- **Fix**: Implemented a startup validation layer. Before NestJS boots, it checks that `DATABASE_URL`, `CLERK_SECRET_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` exist. Missing keys log a warning to `console.warn` but **do not crash the application**, ensuring the HTTP server boots and successfully answers Railway's health checks. Modified `validateEnv` in `env.validation.ts` to log Zod schema issues as warnings instead of calling `process.exit(1)`.

### IV. Prisma Production Audit

- **Location**: `apps/api/prisma/schema.prisma`, `apps/api/package.json`
- **Fix**: Verified database URLs are fetched dynamically using `env("DATABASE_URL")` and `env("DIRECT_URL")`. Removed the `dotenv-cli` dependency (`dotenv -e ../../.env`) prefix in `apps/api/package.json` scripts so that build/prisma commands run correctly using system-level environment variables supplied by Railway.

### V. Complete Redis & BullMQ Removal

- **Location**: `apps/api/src/app.module.ts`, `apps/api/src/notifications/notifications.module.ts`, `apps/api/src/notifications/notifications.service.ts`, `apps/api/src/notifications/notification.processor.ts`, `apps/api/package.json`
- **Fix**: Completely uninstalled and removed Redis, `ioredis`, `bullmq`, and `@nestjs/bullmq` dependencies. Converted the async `NotificationProcessor` from a BullMQ queue worker into a standard NestJS `@Injectable()` service. Updated `NotificationsService` to invoke `NotificationProcessor` directly and asynchronously in-memory. This removes all external queue configurations, allowing the app to run fully without Redis.

### VI. Health Endpoint Upgrade

- **Location**: `apps/api/src/app.controller.ts`
- **Fix**: Upgraded the `/api/health` handler to output database connection status in the exact requested format. Removed all Redis connection tests, eliminating any connection leak potential.
  ```json
  {
    "status": "ok",
    "database": "connected",
    "timestamp": "2026-06-07T12:00:00.000Z",
    "environment": "production"
  }
  ```

### VII. Monorepo Build Verification

- **Location**: Workspace Root (`package.json`)
- **Fix**: Ran `npm run build` from the monorepo root to verify that workspace dependencies compile correctly, the client is generated, and the NestJS application builds successfully.

### VIII. Remove Local Development Assumptions

- **Location**: `apps/api`
- **Fix**: Ensured all occurrences of `localhost`, `127.0.0.1`, and port variables are exclusively used as fallbacks for local developer setups and are overridden by environment variables in production.

---

## 2. Environment Variables Required

Ensure these environment variables are fully configured in the Railway dashboard:

| Variable Name               | Required | Description                                                 |
| :-------------------------- | :------- | :---------------------------------------------------------- |
| `DATABASE_URL`              | Yes      | Connection-pooled Supabase connection string.               |
| `DIRECT_URL`                | Yes      | Direct connection string to Supabase for Prisma migrations. |
| `CLERK_SECRET_KEY`          | Yes      | Clerk authentication service secret key.                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Supabase service role API key.                              |
| `FRONTEND_URL`              | Yes      | Root URL of Vercel frontend app.                            |
| `ALLOWED_ORIGINS`           | Yes      | Comma-separated list of CORS-permitted origins.             |
| `GEMINI_API_KEY`            | No       | Gemini API key for AI features.                             |
| `BREVO_API_KEY`             | No       | Brevo API key for transactional emails.                     |
| `MAIL_FROM_EMAIL`           | No       | Verified sender email address in Brevo.                     |
| `MAIL_FROM_NAME`            | No       | Sender display name (default "CuriousBees").                |

---

## 3. Potential Deployment Blockers

1. **Environment Warning Logs**: Although missing environment variables (`DATABASE_URL`, `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) do not block startup, services utilizing them (database queries, auth checking) will fail at runtime. Double check settings in Railway.
2. **Database Migrations**: Railway should run migrations during deployment. Make sure you run `npx prisma migrate deploy` or ensure migrations are updated inside Supabase manually.
