# CuriousBees — Phase 0.5: Implementation Readiness Report

**Date:** 2026-11-25  
**Scope:** Read-only verification of Git state, Phase 1A completion, remaining security/performance gaps, and database test safety before Phase 1B.

---

## 1. Git & Existing Work Verification

- **Branch:** `main` at `3e243e1` (`chore: remove unused images, personal documents, and temp files`), in sync with `origin/main`.
- **Uncommitted Changes (Must Be Preserved):**
  - **Modified (7 files):** `apps/api/src/comments/comments.service.ts`, `apps/api/src/threads/threads.service.ts`, `apps/api/src/threads/threads.service.spec.ts`, `apps/api/src/users/discovery.ts`, `apps/api/src/users/discovery.spec.ts`, `apps/api/src/users/users.controller.ts`, `apps/api/src/users/users.service.ts`.
  - **Untracked (New Specs & Docs):** `apps/api/src/auth/guards/research-participant.guard.spec.ts`, `apps/api/src/comments/comments.service.spec.ts`, `docs/audits/*`, `docs/product-discovery/*`, `docs/product-architecture/*`.
- **Phase 1A Verification:** **Genuinely implemented and unit-tested.**
  - Verified by running `npm test --workspace=apps/api -- --runInBand --no-watchman`: **21 passed, 21 total** (`220 passed, 2 skipped, 222 total`, using mocked Prisma).
  - Verified fixes present in code: `PUBLIC_AUTHOR_SELECT` (no `email` in threads/comments), `UsersService.getPublicProfile` separated from `getProfile`, `getResearchers` active+non-suspended filters + `where.AND` fix, `hidden: false` checks on secondary thread/comment endpoints, and `/feed/:id` comment notification deep-links.

---

## 2. Outstanding Security Issues Verified in Source

| Issue | Current Implementation & Files | Existing Protection | Remaining Problem | Proposed Minimal Correction | Required Tests |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`EventsController` Authorization** | `apps/api/src/events/events.controller.ts`, `events.service.ts:47-110` | Class-level `SupabaseAuthGuard, ApprovedGuard`; service checks `role` throwing `UnauthorizedException` (401). | No controller-level `RolesGuard` or `ResearchParticipantGuard`; throws `401` instead of `403` (401 triggers frontend sign-out); no unit tests. | Add `RolesGuard` + `@Roles(Role.INSTITUTE_ADMIN)` on `GET review`, `PATCH :id/status`, `DELETE :id` (or `ResearchParticipantGuard` per approved policy); return `ForbiddenException` (403) in service. | `events.controller.spec.ts` / `events.service.spec.ts` testing scholar, supervisor, admin permissions. |
| **`PublicationsController` Authorization & Email Leak** | `apps/api/src/publications/publications.controller.ts:38-50`, `publications.service.ts:41-118` | `POST` has `ResearchParticipantGuard`; `update`/`remove` check ownership. | `PUT :id` & `DELETE :id` lack `ResearchParticipantGuard`; `service.ts:97,111` checks legacy `'SUPERVISOR'` instead of `'RESEARCH_SUPERVISOR'` and allows `INSTITUTE_ADMIN`; `findAll` & `findOne` expose `user.email: true`. | Add `ResearchParticipantGuard` on `PUT :id` and `DELETE :id`; replace `user.email: true` with `PUBLIC_AUTHOR_SELECT`; fix `Role.RESEARCH_SUPERVISOR` check (or owner-only). | Update `publications.service.spec.ts` for email omission and role enforcement. |
| **Disconnected Moderation Reporting** | `threads.service.ts:404-428` vs. `admin/moderation.service.ts:49` | `ThreadsService.reportThread` writes to `ThreadReport`. | `AdminModerationService` reads `ModerationReport` exclusively—feed reports never appear in `/admin/moderation`. | Have `ThreadsService.reportThread` create a `ModerationReport` (`targetType: 'POST'`, `targetId: threadId`) alongside (or instead of) `ThreadReport`, preventing duplicate open reports per user/thread. | Unit test verifying `reportThread` creates `ModerationReport` visible to moderation queries. |
| **`ThreadsPublicController`** | `threads.controller.ts:118-143` | `getThreadPublic` checks `hidden: false` + active non-suspended author; `getFileDownload` restricts to `threads/` keys. | Endpoint remains unauthenticated despite `/feed/post/[id]` redirecting to login. | **Blocked on Policy Decision:** Disable or guard with `SupabaseAuthGuard` once approved (requires updating `app.e2e-spec.ts:379,504`). | E2E/unit test matching chosen policy. |
| **Mock Notification Simulator** | `apps/web/src/components/shared/PushNotificationPrompt.tsx:32-67` | None (fires whenever `Notification.permission === 'granted'` and tab is hidden). | Emits fake `setInterval` notifications (*"Dr. Jane Du"*, *"Arjun Kumar"*) every 15s. | Remove the simulated `setInterval` loop cleanly (or replace prompt with real notification settings). | Frontend/manual check that zero mock notifications fire. |

---

## 3. Feed Performance Verification (Collaboration Status Batching)

- **Verified Bottleneck:** `ResearchPostCard.tsx:72-76` calls `useStore.fetchCollabStatus(authorId, post.id)` on mount for every card. On a 20-post feed, this triggers up to **20 parallel `GET /api/collaborations/status/:targetUserId`** calls, each executing up to **3 Prisma queries** (`researchCollabRequest` sent, `researchCollabRequest` received, `researchCollaboration` active) = up to **60 DB queries per feed render**.
- **Existing Consumers:** `GET /api/collaborations/status/:targetUserId` is also called by `ResearcherProfileModal` / profile views via `fetchCollabStatus`.
- **Safest Batching Strategy:**
  1. **Preserve** `GET /api/collaborations/status/:targetUserId` unchanged for existing single-user callers.
  2. **Add** `GET /api/collaborations/statuses?userIds=id1,id2,...` (max 50 IDs) returning `Record<string, CollaborationStatusResponse>` using 2 `findMany` queries (`researchCollabRequest` + `researchCollaboration` where `OR` matches `userId` and `IN targetIds`).
  3. **Call once** inside `useStore.fetchFeedThreads` for unique `authorId`s in the loaded feed, populating `collabStatuses`. `ResearchPostCard` checks `collabStatuses[authorId]` and skips individual fetches when already populated.

---

## 4. Database & Migration Safety Assessment

- **Prisma Schema & Migrations:** `apps/api/prisma/schema.prisma` validates cleanly (`prisma validate` passed). Three migrations exist (`20260929000000_production_baseline`, `20261001000000_event_email_ingestion`, `20261023000000_remove_zoom_workplace`). Phase 1B requires **zero schema changes or migrations** (`ModerationReport` and `ThreadReport` already exist).
- **Safety Guards:** `scripts/db/reset-guard.js` and `apps/api/test/e2e-safety.ts` fail closed unless `E2E_DATABASE_URL` / `RESET_DATABASE_URL` targets `postgresql://cbtest@127.0.0.1:55432/curiousbees` **and** a live query confirms `curiousbees.disposable_test_db = on`.
- **Current Availability:** **BLOCKED locally.** Neither `docker` nor `psql`/`initdb`/`pg_ctl` is installed on this Mac, and the `.env` Supabase host is unreachable (`ENOTFOUND`). Live database / E2E integration tests cannot run until Docker (`docker compose -f docker-compose.test.yml up -d`) or local PostgreSQL (`scripts/db/local-test-db.sh init`) is installed.
