# CuriousBees — Local Installation & Development Guide

**Related:** [ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md) | [DATABASE_AND_BACKUP_GUIDE.md](./DATABASE_AND_BACKUP_GUIDE.md) | [DEVELOPER_HANDOVER.md](./DEVELOPER_HANDOVER.md)

All commands below are verified against [`package.json`](../../package.json), [`apps/api/package.json`](../../apps/api/package.json), and [`apps/web/package.json`](../../apps/web/package.json).

---

## 1. Prerequisites

| Tool | Required Version | Verification Command |
| :--- | :--- | :--- |
| **Node.js** | `>= 22` (`.nvmrc`: `v22.14.0`) | `node -v` |
| **npm** | `10.8.2` (or compatible npm 10.x) | `npm -v` |
| **Git** | Any modern 2.x | `git --version` |
| **PostgreSQL** | Supabase cloud project (dev) OR Docker for local E2E DB (`postgres:17-alpine`) | `docker --version` |

> **Note:** On macOS/Linux with `nvm`, run `nvm use` in the repository root to select Node `v22.14.0`.

## 2. Repository Setup & Dependency Installation

**Working directory:** Repository root (`CuriousBees/`)

```bash
# 1. Clone the repository (if starting fresh)
git clone <SRM_GIT_REPOSITORY_URL> CuriousBees
cd CuriousBees

# 2. Install monorepo dependencies (--legacy-peer-deps is required for React 19 RC compatibility)
npm install --legacy-peer-deps

# 3. Build shared workspace packages (@curiousbees/types, constants, shared-utils)
npm run build:packages
```

## 3. Environment Configuration (Development)

**Working directory:** Repository root (`CuriousBees/`)

```bash
cp .env.example .env
```

Edit `.env` with your **development** (never production) credentials. See [ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md) for every variable. At minimum for local development:

- `DATABASE_URL` and `DIRECT_URL` (pointing to your dev Supabase PostgreSQL or local Postgres)
- `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_EMAIL_DOMAINS=srmist.edu.in` (add test domain if needed for dev)
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- `NEXT_PUBLIC_API_URL=http://localhost:4000`

Verify your local environment with the built-in doctor script:

```bash
npm run doctor
```

## 4. Database Setup & Prisma Client Generation (Development Only)

**Working directory:** Repository root (`CuriousBees/`)

```bash
# Generate Prisma Client for apps/api
npm run db:generate

# Validate Prisma schema syntax
npx prisma validate --schema=apps/api/prisma/schema.prisma

# Apply existing migrations to your DEV database (safe, non-destructive)
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

> **WARNING (Development Only):** `npm run db:seed` (`ts-node prisma/seed.ts` inside `apps/api`) and `npm run db:reset` (`scripts/db/guarded-reset.js`) are strictly for local/disposable test databases. Never run them against staging or production.

## 5. Running Frontend & Backend Locally

**Working directory:** Repository root (`CuriousBees/`)

```bash
# Start both Next.js frontend (:3000) and NestJS backend (:4000) concurrently
npm run dev
```

Or run them in separate terminals:

```bash
# Terminal 1 — Backend API (http://localhost:4000)
npm run dev:api

# Terminal 2 — Frontend Web (http://localhost:3000)
npm run dev:web
```

Verify local health:
- Frontend health route: `http://localhost:3000/healthz`
- Backend liveness: `http://localhost:4000/api/health/live`
- Backend DB readiness: `http://localhost:4000/api/health/ready`
- Swagger UI (when `ENABLE_SWAGGER=true`): `http://localhost:4000/api/docs`

## 6. Running Tests & Quality Checks

**Working directory:** Repository root (`CuriousBees/`)

```bash
# TypeScript typecheck (both apps/web and apps/api)
npm run typecheck

# ESLint across workspaces
npm run lint

# Backend unit tests (Jest, mocked Prisma)
npm test

# Frontend unit tests (Node native test runner)
npm run test:web

# Safety script tests (DB reset guard & load target guard)
npm run test:scripts

# n8n workflow check & tests
npm run test:n8n
```

### Optional Local E2E Tests (Requires Docker)

The E2E suite in `apps/api/test/app.e2e-spec.ts` resets a disposable database and refuses to run against any database not matching `cbtest@127.0.0.1:55432/curiousbees` with `curiousbees.disposable_test_db = 'on'`:

```bash
# Start disposable Postgres (:55432) and LocalStack S3 (:4566)
docker compose -f docker-compose.test.yml up -d

# Run API E2E tests
npm run test:e2e --workspace=apps/api
```

## 7. Production Builds (Local Verification)

**Working directory:** Repository root (`CuriousBees/`)

```bash
# Full monorepo production build (packages -> web -> api)
npm run build
```

Or individually:

```bash
npm run build:api
npm run build:web
```

> **Note:** `npm run build:web` runs `next build`, which uses `next/font/google` and therefore requires outbound HTTPS access to `fonts.googleapis.com` during the build step, as well as valid `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values (`next.config.ts` validates these at build time).
