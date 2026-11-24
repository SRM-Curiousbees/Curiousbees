# CuriousBees — Final Delivery Readiness Report

**Date:** 2026-11-25  
**Branch / Base Commit:** `main` (`3e243e1`) + local Phase 1A & Phase 1B hardening changes  
**Scope:** Final verification of builds, tests, role workflows, frontend/backend integration, and AWS/Supabase deployment readiness.

---

## 1. Build & Test Results

| Check | Command | Outcome | Notes |
| :--- | :--- | :--- | :--- |
| **Backend Production Build** | `npm run build:api` | **PASSED** (`exit 0`) | Built `@curiousbees/{types,constants,shared-utils}`, generated Prisma Client v6.19.3, compiled NestJS `dist/`. |
| **Frontend Production Build** | `npm run build:web` | **PASSED** (`exit 0`) | Compiled all 75 Next.js App Router pages/routes (with network access to Google Fonts). |
| **API Unit Tests** | `npm test --workspace=apps/api -- --runInBand --no-watchman` | **PASSED** (`exit 0`) | **23/23 suites** (`227 passed, 2 skipped, 229 total`; uses mocked Prisma). |
| **Web Unit Tests** | `npm run test:web` | **PASSED** (`exit 0`) | **3/3 tests** (`tests/event-links.test.mts`). |
| **TypeScript Typecheck** | `npm run typecheck` | **PASSED** (`exit 0`) | 0 errors across `apps/web` and `apps/api`. |
| **ESLint** | `npm run lint` | **PASSED** (`exit 0`) | 0 errors; pre-existing React hooks and `<img>` warnings only. |
| **Prisma Schema Validation** | `npx prisma validate --schema=apps/api/prisma/schema.prisma` | **PASSED** (`exit 0`) | Schema valid. |
| **API E2E DB Tests** | `npm run test:e2e --workspace=apps/api` | **NOT RUN (Blocked)** | Neither Docker nor local PostgreSQL (`127.0.0.1:55432`) is installed on this host. |

---

## 2. Role-Wise Functionality Verification (Static + Unit-Tested)

- **Research Scholar (`RESEARCH_SCHOLAR`):**
  - Edge middleware (`middleware.ts`) + `PortalLayout` (`permissions.ts`) + `SupabaseAuthGuard` + `ApprovedGuard` + `ResearchParticipantGuard`.
  - Verified access to `/feed`, `/researchers`, `/my-research`, `/workspace`, `/publications`, `/events`, `/opportunities`, `/nexus`, `/notifications`, `/profile`, `/settings`.
  - Blocked (`403`) from `/admin/*`, `/my-scholars`, event creation/editing/review, and publication edits they do not own.
- **Research Supervisor (`RESEARCH_SUPERVISOR`):**
  - Verified access to `/supervisor`, `/my-scholars`, `/feed`, `/researchers`, `/workspace`, `/publications`, `/events` (create + edit own events), `/opportunities`, `/nexus`, `/notifications`, `/profile`.
  - Blocked (`403`) from `/admin/*`, `/my-research`, event status/deletion/review, and editing other researchers' publications.
- **Institute Admin (`INSTITUTE_ADMIN`):**
  - Verified access to `/admin/*` (users, campuses, faculties/departments, moderation, announcements, event-inbox, analytics, audit, settings) and `Events` governance (`review`, `status`, `DELETE`).
  - Blocked (`403` via `ResearchParticipantGuard` + `ROLE_PERMISSIONS`) from participating in feed posts, comments, likes, bookmarks, follows, collaborations, workspaces, or publications.

---

## 3. Frontend / Backend Integration Status

- **Verified Matching Routes:**
  - Auth & Onboarding: `/api/auth/me`, `/api/users/onboarding/{scholar,supervisor,reset}` (`OnboardingController`), `/api/departments/:id`, `/api/users/supervisors`.
  - Feed & Social: `/api/threads*`, `/api/feed/{search,peers,trending}`, `/api/comments*`, `/api/users/{researchers,:id/profile,:id/follow,follow-domain,follow-topic,me/follow-state}`.
  - Collaborations & Workspaces: `/api/collaborations*` (including new `GET /api/collaborations/statuses`), `/api/workspaces*`, `/api/integrations*`.
  - Academic Lifecycle & Admin: `/api/my-research*`, `/api/reports*`, `/api/publications*`, `/api/opportunities*`, `/api/events*`, `/api/notifications*`, `/api/admin/*`.
- **Loading, Error & Empty States:** Verified across `/feed`, `/feed/[id]`, `/researchers/[id]`, `/profile`, `/my-scholars`, `/nexus`, `/admin/*` (`FeedSkeleton`, `Skeleton`, `EmptyState`, toast/retry handlers).

---

## 4. Broken or Incomplete Features (Known Scope)

- **Social Enhancements (Deferred to Phase 2–5 per Roadmap):**
  - `For you` and `Following` feed tabs still filter/score client-side over the latest fetched page (`apps/web/src/app/(portal)/feed/page.tsx`); no "Load more" UI yet.
  - Reposts / Quote-posts, `@mentions`, profile `Posts` tab, and visibility-aware live polling are not yet implemented (planned in `docs/product-architecture/IMPLEMENTATION_ROADMAP.md`).
- **Push Notifications:** Backend `NotificationsService.sendPushToUser` is disabled (no push provider). In-app notifications work via DB + `/notifications`.
- **Legacy Overlaps:** `SupervisorsController` (`/api/supervisor/pending-scholars` still called by `useStore.ts:3058`), `POST /api/threads/:id/collaborate`, and empty `apps/api/src/gmail-ingestion/` remain untouched for backward compatibility.

---

## 5. Repairs Made During Final Audit

- **None required** during this final verification step—all production builds (`build:api`, `build:web`), unit tests (`23/23` API suites, `3/3` Web tests), `typecheck`, `lint`, and `prisma validate` passed cleanly on the first run after Phase 1B.

---

## 6. Environment Variables Required for Future AWS & Supabase Setup

Verified against `apps/api/src/config/env.validation.ts` (`productionSchema`) and `apps/web/next.config.ts`:

- **Backend Required in Production (`NODE_ENV=production`):**
  - `DATABASE_URL` (Supabase pooler URL, `pgbouncer=true`) & `DIRECT_URL` (direct/session Postgres URL for migrations)
  - `FRONTEND_URL` (`https://...` canonical web origin) & `ALLOWED_ORIGINS`
  - `ALLOWED_EMAIL_DOMAINS` (e.g. `srmist.edu.in`)
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `AWS_REGION`, `AWS_S3_BUCKET` (plus IAM task role or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`)
  - `BREVO_API_KEY`, `MAIL_FROM_EMAIL` (or `BREVO_SENDER_EMAIL`), `MAIL_FROM_NAME`
- **Backend Optional (Feature-Dependent):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENSEARCH_ENDPOINT`/`OPENSEARCH_REGION`/`OPENSEARCH_INDEX`, `N8N_INTEGRATION_TOKEN` (min 32 chars), `ENABLE_CRON`, `ENABLE_SWAGGER`, `TRUST_PROXY_HOPS`, `RATE_LIMIT_*`.
- **Frontend Build-Time (`NEXT_PUBLIC_*`):**
  - `NEXT_PUBLIC_SITE_URL` (`https://...`), `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Runtime server vars: `API_URL` (for `/api/:path*` rewrite if not using `NEXT_PUBLIC_API_URL`), `APP_URL`, `ALLOWED_EMAIL_DOMAINS`.

---

## 7. Database & Deployment Limitations

- **Current `.env` Supabase Host Unreachable:** `ndtaxeqsefusocwgqppx.supabase.co` fails DNS resolution (`ENOTFOUND`), so the running local API operates in `PrismaService` **demo/mock fallback mode** rather than real PostgreSQL persistence.
- **E2E Suite Untested Locally:** `test:e2e` requires Docker (`docker compose -f docker-compose.test.yml up -d`) or local PostgreSQL (`127.0.0.1:55432`).
- **Offline `next build` Constraint:** `next/font/google` requires outbound network access to `fonts.googleapis.com` during `next build`.

---

## 8. Remaining Risks

1. **Unverified Live SQL Behaviour:** Phase 1A and 1B queries (e.g., `UsersService.getPublicProfile`, `CollaborationsService.getCollaborationStatuses`, `ThreadsService.reportThread`) are verified with mocked Prisma unit tests, not yet against a live PostgreSQL instance.
2. **Unauthenticated `ThreadsPublicController`:** `/api/threads/public/:id` remains open without auth (tested by `app.e2e-spec.ts:379,504`), pending final institutional policy sign-off.
3. **Uncommitted Local Changes:** All Phase 1A + Phase 1B code and audit docs are currently uncommitted in the local working tree.

---

## 9. Final Delivery Recommendation

**Ready for controlled staging/demo delivery once connected to a live Supabase + AWS S3 environment and E2E-verified.** The codebase compiles cleanly for production on both frontend and backend, passes all 26 unit/web test suites, enforces strict PII and role-based security boundaries (Phases 1A & 1B), and removes all simulated fake notifications.
