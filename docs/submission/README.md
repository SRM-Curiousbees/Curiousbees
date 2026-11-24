# CuriousBees — MCA Project Submission Package

## 1. Project Overview
**CuriousBees** is an institutional academic research collaboration, Ph.D. supervision, and governance platform built for **SRM Institute of Science and Technology (SRMIST)**. It combines an X/Threads-inspired Researcher Network feed with structured doctoral supervision workflows, shared research workspaces, and role-isolated institutional administration.

## 2. Problem Statement & Objectives
Academic research collaboration within large universities is often fragmented across disconnected emails, spreadsheets, and generic chat tools. CuriousBees addresses this by providing:
- A centralized, institution-verified **Researcher Network** for sharing research updates, publications, questions, and collaboration requests.
- Structured **Doctoral Supervision & Research Tracking** (`My Research`, supervisor matching, capacity-aware approvals, and progress report reviews).
- Controlled **Collaboration & Shared Workspaces** (`Curious Nexus` 1:1 messaging escalating to shared S3 file repositories, milestones, and Google Meet links).
- **Institutional Governance** with strict role isolation (`INSTITUTE_ADMIN`), content moderation, and immutable audit logging.

## 3. Target Users
- **Research Scholars (`RESEARCH_SCHOLAR`):** Share research updates, track thesis milestones, submit progress reports, apply to opportunities, and collaborate with peers/supervisors.
- **Research Supervisors (`RESEARCH_SUPERVISOR`):** Participate in the research feed, review scholar supervision requests and progress reports, manage research workspaces, and post opportunities.
- **Institute Administrators (`INSTITUTE_ADMIN`):** Provision accounts, manage campuses/faculties/departments, moderate reported content, broadcast announcements, and inspect audit logs (strictly non-participating in research).

## 4. Key Features & Technology Stack
- **Frontend (`apps/web`):** Next.js 15 (App Router), React 19, TypeScript (Strict), Tailwind CSS 3.4, Zustand, React Query, Lucide Icons, Framer Motion.
- **Backend (`apps/api`):** NestJS 11 REST API, Prisma ORM v6.19.3, Class Validator, Zod, Winston, Swagger (`/api/docs`), `@nestjs/throttler`.
- **Shared Packages (`packages/*`):** `@curiousbees/types`, `@curiousbees/constants`, `@curiousbees/shared-utils`, `@curiousbees/ui`.
- **Infrastructure & Integrations:** PostgreSQL (Supabase), Supabase Auth (Google OAuth), Amazon S3 (presigned private uploads/downloads), Brevo (transactional email), n8n (optional Gmail-to-event ingestion).

## 5. Repository Structure
```text
CuriousBees/
├── apps/
│   ├── web/            # Next.js 15 frontend (75 App Router routes)
│   └── api/            # NestJS 11 backend API (39 controllers, 54 Prisma models)
├── packages/           # Shared types, constants, utils, and UI primitives
├── docs/
│   ├── submission/     # Final MCA project submission package (this directory)
│   ├── product-discovery/
│   └── product-architecture/
├── scripts/            # Setup, doctor diagnostics, and guarded DB scripts
├── Dockerfile.api / Dockerfile.web / docker-compose*.yml
└── package.json        # Root npm workspace orchestrator
```

## 6. Prerequisites & Installation
- **Node.js:** `>= 22.0.0` (`.nvmrc`: `v22.14.0`)
- **npm:** `>= 10.0.0` (`10.8.2+`)
- **PostgreSQL:** Active Supabase project or local PostgreSQL instance

```bash
# 1. Install workspace dependencies
npm install --legacy-peer-deps

# 2. Configure environment variables (do NOT commit real secrets)
cp .env.example .env
# Populate DATABASE_URL, DIRECT_URL, SUPABASE_*, AWS_*, BREVO_* in .env

# 3. Build shared packages, generate Prisma Client, and run diagnostics
npm run setup
npm run doctor
```

## 7. Development, Build & Testing Commands
- **Development (`web` on `:3000`, `api` on `:4000`):** `npm run dev`
- **Production Builds:** `npm run build:api` and `npm run build:web` (or `npm run build`)
- **TypeScript Check:** `npm run typecheck`
- **ESLint:** `npm run lint`
- **Prisma Schema Validation:** `npx prisma validate --schema=apps/api/prisma/schema.prisma`
- **API Unit Tests:** `npm test --workspace=apps/api -- --runInBand --no-watchman`
- **Web Unit Tests:** `npm run test:web`
- **API E2E Tests (requires disposable local DB at `127.0.0.1:55432`):**
  `docker compose -f docker-compose.test.yml up -d` then `npm run test:e2e --workspace=apps/api`

## 8. AWS & Supabase Integration Requirements
- **Supabase:** PostgreSQL (`DATABASE_URL` pooler + `DIRECT_URL` direct) and Google OAuth (`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- **AWS S3:** Private bucket with Block Public Access enabled (`AWS_REGION`, `AWS_S3_BUCKET`, plus IAM role or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) for workspace and post attachments.
- **Brevo:** `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`.

## 9. Documentation Index
- [Project Report](./PROJECT_REPORT.md)
- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [Module Documentation](./MODULE_DOCUMENTATION.md)
- [Database Documentation](./DATABASE_DOCUMENTATION.md)
- [User Guide](./USER_GUIDE.md)
- [Demonstration Script](./DEMONSTRATION_SCRIPT.md)
- [Testing and Verification](./TESTING_AND_VERIFICATION.md)
- [Limitations and Future Scope](./LIMITATIONS_AND_FUTURE_SCOPE.md)
- [Submission Checklist](./SUBMISSION_CHECKLIST.md)
