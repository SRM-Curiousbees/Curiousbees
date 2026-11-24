# CuriousBees — Phase 1B Completion Report

**Date:** 2026-11-25  
**Status:** Phase 1B Implemented & Unit/Static Verified (E2E DB tests blocked locally; no live DB/infra modified).

---

## 1. Tasks Implemented

1. **Task 1 — Publications & Events Security Hardening:**
   - **Publications:** Protected `PUT /publications/:id` and `DELETE /publications/:id` with `ResearchParticipantGuard`; replaced `user.email: true` in `findAll`/`findOne` with `PUBLIC_AUTHOR_SELECT`; fixed legacy `'SUPERVISOR'` string check and enforced ownership (`pub.userId !== userId && role !== 'INSTITUTE_ADMIN'`) with `403 ForbiddenException`; blocked hidden publication reads on `findOne`.
   - **Events:** Applied `RolesGuard` + `@Roles(...)` at controller level (`INSTITUTE_ADMIN` for `GET review`, `PATCH :id/status`, `DELETE :id`; `INSTITUTE_ADMIN` + `RESEARCH_SUPERVISOR` for `POST` and `PUT :id`, blocking `RESEARCH_SCHOLAR`); updated `EventsService` permission checks to throw `ForbiddenException` (403) instead of `UnauthorizedException` (401) and enforced admin-only `updateEventStatus`/`deleteEvent`.
2. **Task 2 — Moderation Report Unification:**
   - Updated `ThreadsService.reportThread` to write to `ModerationReport` (`targetType: 'POST'`, `targetId: threadId`, `status: 'OPEN'`) so reported feed posts appear in `/admin/moderation`, while preserving `ThreadReport` creation for backward compatibility and rejecting duplicate open reports by the same user for the same post.
3. **Task 3 — Remove Fake Notifications:**
   - Removed the 15-second `setInterval` mock notification simulator and fabricated user/event strings from `apps/web/src/components/shared/PushNotificationPrompt.tsx`. Real push notifications remain unconfigured (`NotificationsService.sendPushToUser` is disabled); in-app notifications continue through `NotificationDropdown` and `/notifications`.
4. **Task 4 — Collaboration Status Batching:**
   - Added `GET /api/collaborations/statuses?userIds=...` (capped at 50 unique IDs, executing 2 parallel `findMany` queries) while preserving `GET /api/collaborations/status/:targetUserId`.
   - Added `useStore.fetchCollabStatuses`, invoked once per `fetchFeedThreads` load, and updated `ResearchPostCard` to skip individual per-card status requests when `collabStatuses[authorId]` is already populated. Also kept `collabStatuses` synced on `acceptCollabRequest`.
5. **Task 5 — Regression Verification:**
   - Executed API unit tests, Web tests, TypeScript typecheck, ESLint, and Prisma schema validation.

---

## 2. Exact Files Changed (Phase 1B)

- **Modified:**
  - `apps/api/src/publications/publications.controller.ts`
  - `apps/api/src/publications/publications.service.ts`
  - `apps/api/src/publications/publications.service.spec.ts`
  - `apps/api/src/events/events.controller.ts`
  - `apps/api/src/events/events.service.ts`
  - `apps/api/src/threads/threads.service.ts`
  - `apps/api/src/threads/threads.service.spec.ts`
  - `apps/api/src/collaborations/collaborations.controller.ts`
  - `apps/api/src/collaborations/collaborations.service.ts`
  - `apps/web/src/components/shared/PushNotificationPrompt.tsx`
  - `apps/web/src/store/useStore.ts`
  - `apps/web/src/components/feed/ResearchPostCard.tsx`
- **Added:**
  - `apps/api/src/events/events.service.spec.ts`
  - `apps/api/src/collaborations/collaborations.service.spec.ts`
  - `docs/product-architecture/PHASE_1B_COMPLETION_REPORT.md`

---

## 3. Security & Permission Changes Summary
- `Publications`: `PUT`/`DELETE` require `ResearchParticipantGuard` + ownership; `user.email` removed from `findAll`/`findOne`.
- `Events`: Scholars blocked (`403`) from creating/editing/reviewing/deleting events; Supervisors can create and edit only their own events (`403` on others' events or admin-only `review`/`status`/`DELETE`); Institute Admins control `review`, `PATCH :id/status`, and `DELETE :id`.
- `Moderation`: Feed post reports now surface in `ModerationReport` (`/admin/moderation`) with duplicate open-report prevention.

---

## 4. Tests Actually Executed & Results

| Check | Command | Result |
| :--- | :--- | :--- |
| **API Unit Tests** | `npm test --workspace=apps/api -- --runInBand --no-watchman` | **PASSED:** 23/23 suites (`227 passed, 2 skipped, 229 total`; mocked Prisma) |
| **Web Unit Tests** | `npm run test:web` | **PASSED:** 3/3 tests (`event-links.test.mts`) |
| **TypeScript Typecheck** | `npm run typecheck` | **PASSED:** 0 errors (`apps/web` + `apps/api`) |
| **Prisma Validation** | `npx prisma validate --schema=apps/api/prisma/schema.prisma` | **PASSED:** Schema valid |
| **Lint** | `npm run lint` | **PASSED:** 0 errors (pre-existing React hooks / `<img>` warnings only) |

---

## 5. Tests Blocked & Why
- **API E2E Integration Suite (`npm run test:e2e --workspace=apps/api`):** **Not run (Blocked).** Neither Docker nor local PostgreSQL (`psql`/`initdb`/`pg_ctl`) is installed on this machine, so the disposable test database at `127.0.0.1:55432` could not be started or positively verified.

---

## 6. Remaining Issues / Limitations
- `ThreadsPublicController` (`/api/threads/public/:id`) remains unauthenticated pending product policy decision (coordinate with `app.e2e-spec.ts:379,504` if disabled).
- `ResearchPostCard` collab batching applies on feed load (`fetchFeedThreads`); direct single-post loads (`/feed/[id]`) still fall back cleanly to `fetchCollabStatus`.
- Real browser push notifications remain unimplemented (no push provider configured).

---

## 7. Confirmation of Preservation & Infrastructure Safety
- **Existing User Changes Preserved:** All Phase 1A changes (`comments`, `threads`, `users`, `auth/guards`) and all `docs/audits`, `docs/product-discovery`, and `docs/product-architecture` files were preserved untouched; no `git reset`, `clean`, `stash`, or `checkout` was run.
- **No Production / DB / Infra Modifications:** No migrations, resets, seeds, or SQL writes were executed; `.env`, AWS, and Supabase resources were not modified; no commits, pushes, or deployments were performed.
