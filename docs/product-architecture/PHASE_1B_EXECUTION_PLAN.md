# CuriousBees — Phase 1B Execution Plan

**Scope:** Authorization Hardening, Moderation Report Unification, Mock Notification Removal, Collaboration Status Batching, and Regression Tests.  
**Constraint:** No unrelated UI redesigns, no Prisma schema changes, and no Phase 2+ features.

---

## Implementation Order (Dependency-Ordered)

### Task 1: Authorization & Privacy Hardening (`PublicationsController` & `EventsController`)
* **Files Affected:**
  * `apps/api/src/publications/publications.controller.ts`, `publications.service.ts`, `publications.service.spec.ts`
  * `apps/api/src/events/events.controller.ts`, `events.service.ts`, `events.service.spec.ts` (new)
* **Backend Changes:**
  * `PublicationsController`: Add `@UseGuards(ResearchParticipantGuard)` to `PUT :id` and `DELETE :id`.
  * `PublicationsService`: Replace `user.email: true` in `findAll` and `findOne` with `PUBLIC_AUTHOR_SELECT`; fix legacy `'SUPERVISOR'` string check and enforce owner-only (or active participant) edits.
  * `EventsController` & `EventsService`: Add `RolesGuard` + `@Roles(Role.INSTITUTE_ADMIN)` on `GET review` and `PATCH :id/status` (and per approved policy on `POST`/`PUT`/`DELETE`); replace `UnauthorizedException` (401) with `ForbiddenException` (403) in service permission checks.
* **Database Changes:** None.
* **Test Cases:** `publications.service.spec.ts` (no `user.email`, admin blocked on `PUT`/`DELETE`, non-owner blocked); `events.service.spec.ts` (scholar blocked from creating/reviewing/updating events, supervisor can only edit own event, admin allowed).
* **Risks & Rollback:** Changing `401` -> `403` on unauthorized event calls stops the frontend from erroneously signing out users on permission denial. Easily reversible per-file.

### Task 2: Moderation Report Unification (`ThreadReport` -> `ModerationReport`)
* **Files Affected:**
  * `apps/api/src/threads/threads.service.ts`, `threads.service.spec.ts`
  * *(Optional verification)* `apps/api/src/admin/moderation.service.ts`
* **Backend Changes:**
  * In `ThreadsService.reportThread`, create a `ModerationReport` (`reporterId`, `targetType: 'POST'`, `targetId: threadId`, `reason`, `description`, `status: 'OPEN'`) in addition to (or replacing) `ThreadReport`, and prevent duplicate open reports by the same `reporterId` on the same `threadId`.
* **Database Changes:** None (`ModerationReport` model already exists in `schema.prisma:1165`).
* **Test Cases:** Unit test in `threads.service.spec.ts` verifying `moderationReport.create` is called with `targetType: 'POST'` and duplicate open reports are rejected cleanly.
* **Risks & Rollback:** Keep `ThreadReport` write or preserve table so no historical rows are lost.

### Task 3: Remove Fake Browser Notification Simulator
* **Files Affected:**
  * `apps/web/src/components/shared/PushNotificationPrompt.tsx`
  * *(Cleanup)* Remove empty `apps/api/src/gmail-ingestion/` directory if approved.
* **Frontend Changes:**
  * Remove the `setInterval` mock notification simulator (`lines 32-67`) from `PushNotificationPrompt.tsx` (or stop mounting `PushNotificationPrompt` in `PortalLayout` since backend push is disabled).
* **Database Changes:** None.
* **Test Cases:** `npm run typecheck`, `npm run lint`, verify no `mockEvents` or `setInterval` remains in `PushNotificationPrompt.tsx`.

### Task 4: Batch Collaboration Statuses for Feed
* **Files Affected:**
  * `apps/api/src/collaborations/collaborations.controller.ts`, `collaborations.service.ts`, `collaborations.service.spec.ts` (new)
  * `apps/web/src/store/useStore.ts`, `apps/web/src/components/feed/ResearchPostCard.tsx`
* **Backend Changes:**
  * Add `GET /collaborations/statuses?userIds=id1,id2,...` (capped at 50 IDs, returning `Record<string, CollaborationStatusResponse>`) via 2 `findMany` queries while keeping `GET /collaborations/status/:targetUserId` intact.
* **Frontend Changes:**
  * Add `fetchCollabStatuses(userIds: string[])` in `useStore.ts`, called once inside `fetchFeedThreads` for unique `authorId`s not already cached.
  * Update `ResearchPostCard.tsx` so it skips `fetchCollabStatus` when `collabStatuses[authorId]` is already defined.
* **Database Changes:** None.
* **Test Cases:** `collaborations.service.spec.ts` testing batch resolution (`ACTIVE`, `PENDING_SENT`, `PENDING_RECEIVED`, `NONE`) and 50-ID cap.
* **Risks:** Ensure `useStore.collabStatuses` updates cleanly when a user sends/cancels/accepts a request.

### Task 5: Full Regression Verification
* Run `npm test --workspace=apps/api -- --runInBand --no-watchman`
* Run `npm run typecheck`
* Run `npm run lint`
* Run `npx prisma validate --schema=apps/api/prisma/schema.prisma`
* *(If Docker/PostgreSQL is available on `127.0.0.1:55432`)* Run `npm run test:e2e --workspace=apps/api` using `e2e-safety.ts`.
