# CuriousBees — Known Limitations & Implementation Status

**Related:** [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | [SECURITY_AND_ACCESS_CONTROL.md](./SECURITY_AND_ACCESS_CONTROL.md) | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

This document strictly distinguishes verified implemented capabilities from partial, unverified, or unimplemented items based on direct repository inspection and test execution.

---

## 1. Implemented & Unit/Build Verified

- **Core Monorepo & Production Builds:** `npm run build:api`, `npm run build:web`, `npm run typecheck`, `npm run lint`, and `npx prisma validate` pass cleanly.
- **Authentication & RBAC Guards:** `SupabaseAuthGuard`, `ApprovedGuard`, `RolesGuard`, `ResearchParticipantGuard`, and `ALLOWED_EMAIL_DOMAINS` fail-closed policy (`23/23` API Jest suites pass with mocked Prisma).
- **Phase 1A & 1B Hardening:** Public profile PII stripping, email removal from thread/comment responses, hidden-post visibility checks, inactive/suspended user filtering, publication/event authorization boundaries, and comment notification deep-links.
- **Core Modules:** Feed/threads/comments/likes/bookmarks/follows, researcher directory, My Research milestones, supervisor workflows, workspaces + S3 presigned URLs, publications, opportunities, events, Nexus collaborations, notifications DB log, admin governance, and n8n event ingestion.

---

## 2. Implemented but NOT Verified Against Live Infrastructure

- **Live Supabase PostgreSQL & Auth Connectivity:** The `.env` development host (`ndtaxeqsefusocwgqppx.supabase.co`) fails DNS resolution (`ENOTFOUND`), so local runs fall back to `PrismaService` demo mode. Live SQL behavior of Phase 1A/1B queries has **not** been executed against a live PostgreSQL instance.
- **API E2E Suite (`npm run test:e2e --workspace=apps/api`):** Blocked locally because neither Docker nor local PostgreSQL (`127.0.0.1:55432`) is running on the assessment host. (Runs in GitHub Actions CI with `postgres:17-alpine` + `localstack/localstack:4`.)
- **Concurrency & Load Capacity:** [`scripts/load/curiousbees.k6.js`](../../scripts/load/curiousbees.k6.js) exists, but load tests (`500`, `2,500`, `5,000` concurrent users) have **not** been executed against live infrastructure.

---

## 3. Partially Implemented

- **Server-Side Feed Pagination & Filtering:** `For you` and `Following` feed tabs in `apps/web/src/app/(portal)/feed/page.tsx` currently filter/score client-side over the fetched page; there is no full cursor-based "Load more" UI yet.
- **In-Memory Rate Limiting:** [`apps/api/src/common/throttling/rate-limits.ts`](../../apps/api/src/common/throttling/rate-limits.ts) uses in-memory per-instance counters rather than a shared Redis/Valkey store. Adequate for single-instance Base deployment; multi-instance Growth/Institutional tiers should add Redis-backed throttler storage.
- **Optional OpenSearch:** `SearchService` falls back to Prisma DB queries when `OPENSEARCH_ENDPOINT` is unset.

---

## 4. Not Implemented

- **Repost & Quote-Post Functionality:** Deferred from Phase 1 per [`docs/product-architecture/IMPLEMENTATION_ROADMAP.md`](../product-architecture/IMPLEMENTATION_ROADMAP.md).
- **`@mentions` Parsing & Notifications:** Deferred per roadmap.
- **Profile `Posts` Tab:** Deferred per roadmap.
- **Web Push / Mobile Push Notifications:** `NotificationsService.sendPushToUser` (`apps/api/src/notifications/notifications.service.ts:90`) is an intentionally disabled no-op stub (no OneSignal/WebPush provider). In-app notifications work via database records and `/notifications`.
- **Real-Time WebSocket Notification Streaming:** Notifications currently load on navigation/refresh rather than WebSocket push or visibility-aware polling.

---

## 5. Legacy Items Retained for Backward Compatibility

- **Legacy Supervisor Endpoint:** `SupervisorsController` (`GET /api/supervisor/pending-scholars` in `apps/api/src/supervisors/supervisors.controller.ts:20`) is still called by `apps/web/src/store/useStore.ts:3092` and therefore must be retained until frontend callers migrate.
- **Legacy Thread Collaboration Endpoint:** `POST /api/threads/:id/collaborate` is still called by `apps/web/src/store/useStore.ts:1038` and must be retained.
- **Obsolete `supabase/schema.sql`:** Legacy SQL initialization script (`DROP TABLE IF EXISTS ...`) superseded by `apps/api/prisma/migrations/`. Never execute it; retained in repo for historical traceability only.
- **Removed Empty Stub:** Empty `apps/api/src/gmail-ingestion/` directory (0 files, 0 imports) has been flagged/cleaned in [REPOSITORY_CLEANUP_AUDIT.md](./REPOSITORY_CLEANUP_AUDIT.md).

---

## 6. Requires Institutional Decision & Infrastructure Configuration

- **Public Thread Endpoint Policy (`ThreadsPublicController`):** `GET /api/threads/public/:id` and `GET /api/threads/public/files/download` (`apps/api/src/threads/threads.controller.ts:118`) currently allow unauthenticated access for share links (tested in `app.e2e-spec.ts`). SRM ITKM must decide whether to keep public share links enabled or require institutional authentication.
- **Production Infrastructure Provisioning:** SRM must provision and own production Supabase (`ap-south-1`), AWS S3, Brevo verified domain, Google OAuth credentials, and hosting compute before go-live.
- **Uncommitted Local Work:** Phase 1A, Phase 1B, and documentation deliverables currently sit in the local working tree and must be reviewed and committed to SRM's repository before CI/CD deployment.
