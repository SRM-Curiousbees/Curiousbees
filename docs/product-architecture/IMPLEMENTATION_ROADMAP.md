# CuriousBees — Phased Implementation Roadmap

**Phase:** Phase 0 — Product Architecture & Experience Blueprint  
**Prerequisite State:** Phase 1A (Security & Privacy Hardening on `UsersService`, `ThreadsService`, `CommentsService`) is already implemented on the local branch.

---

## 1. Technical Prerequisites
1. **Live Database Environment:** Provision an active PostgreSQL instance (`scripts/db/local-test-db.sh init` or active Supabase project) so Prisma migrations, `EXPLAIN (ANALYZE, BUFFERS)`, and E2E integration tests (`cbtest@127.0.0.1:55432/curiousbees`) can run against real SQL.
2. **Self-Hosted Fonts (Optional Build Unblock):** As noted in `README.md`, `next build` fails offline when fetching Google Fonts; migrate `next/font/google` to `next/font/local` if offline/CI builds are required.

---

## 2. Dependency-Aware Implementation Phases

### Phase 1B — Remaining Security, Cleanup & Performance Foundations
* **Scope:**
  * Harden `EventsController` (`RolesGuard`/`ResearchParticipantGuard` on mutations/review) and `PublicationsController` (`ResearchParticipantGuard` on `PUT`/`DELETE`).
  * Unify moderation reporting: have `ThreadsService.reportThread` create a `ModerationReport` (with `targetType: 'POST'`) so feed reports appear in `/admin/moderation`.
  * Remove `PushNotificationPrompt.tsx`'s fake `setInterval` mock simulator and empty `apps/api/src/gmail-ingestion/` directory.
  * Batch `GET /api/collaborations/statuses?userIds=...` to eliminate the 20-request N+1 waterfall on `/feed`.
* **Acceptance Criteria:** Zero mock notifications; feed reports visible in `/admin/moderation`; `/feed` fires 1 batch collab-status call instead of N; `EventsController` and `PublicationsController` enforce role/participant guards.

### Phase 2 — Navigation Unification & Academic Workspace Integration
* **Scope:**
  * Update `navigation.ts`: group Researcher Network vs. Academic Workspace; land `RESEARCH_SUPERVISOR` on `/feed`; embed `SupervisorOverview` into `/my-scholars`; redirect `/chat` -> `/nexus` and `/supervisor` -> `/my-scholars` (or `/feed`).
  * Extend `MobileFeedNav` across all Researcher Network routes in `(portal)/layout.tsx`.
  * Add `Posts` tab and `Followers`/`Following` drawer to `AcademicProfileView` (`/profile`, `/researchers/[id]`).
* **Acceptance Criteria:** Scholars & supervisors share a cohesive X-first navigation; mobile bottom bar persists across social routes; profile pages display researcher posts and follower lists.

### Phase 3 — Server-Side Feed & Keyset Pagination
* **Scope:**
  * Update `GET /api/threads` to accept `tab=foryou|following|discover`, compute `Following` & `For you` in PostgreSQL/NestJS, return `{ items, nextCursor, hasMore }`, and add `GET /api/threads/latest-count`.
  * Update `useStore.fetchFeedThreads` + `apps/web/src/app/(portal)/feed/page.tsx` with "Load more" pagination and "N new posts" banner; remove client-side `useMemo` tab filtering.
  * Run `EXPLAIN (ANALYZE, BUFFERS)` on seeded data before adding any new DB indexes.
* **Acceptance Criteria:** `Following` returns all followed researchers' posts across history; pagination never duplicates/skips items on new post creation.

### Phase 4 — Repost & Quote-Post
* **Scope:**
  * Prisma migration adding `Thread.repostOfId`, `Thread.isQuote`, `@@index([repostOfId])`, and partial unique index on `(authorId, repostOfId) WHERE isQuote = false`.
  * `POST /threads/:id/repost`, `DELETE /threads/:id/repost`, moderation propagation (`hidden` original hides pure reposts and masks quote-post embed), `REPOST` notifications, and `ResearchPostCard` / `QuotePostModal` UI.
* **Acceptance Criteria:** Duplicate pure reposts blocked; moderated/deleted originals handled safely; original author attributed and notified.

### Phase 5 — `@mentions`, Server-Backed `⌘K` Search & Smart Polling
* **Scope:**
  * Prisma migration adding `ThreadMention` and `CommentMention`.
  * `GET /api/users/mention-suggestions?q=` (`SEARCH_THROTTLE`, active non-admin users only, no PII).
  * `<MentionText />` safe React renderer + `@` autocomplete in `CompactComposer` & `FeedComments`.
  * Upgrade `SpotlightSearch` (`⌘K`) to query `/api/feed/search`; add visibility-aware polling for `/api/notifications` (45s) and active `/nexus` threads (8s).
* **Acceptance Criteria:** `@mentions` autocomplete, link to active profiles, notify recipients once, and escape XSS; `⌘K` finds non-cached posts/researchers.

### Phase 6 — Legacy Cleanup & Consolidation
* **Scope:** Migrate `useStore.ts:3058` from `/api/supervisor/pending-scholars` to `/api/supervisor-requests` and retire `SupervisorsModule` approval routes; evaluate merging `ResearchConnection` into `UserFollow`/`ResearchCollabRequest` and retiring legacy `POST /threads/:id/collaborate`.

---

## 3. Test Strategy & Risks
* **Tests:** Unit tests (Jest) per service/guard + E2E integration tests (`apps/api/test/*.e2e-spec.ts`) strictly isolated to `cbtest@127.0.0.1:55432/curiousbees` via `e2e-safety.ts` + frontend component tests (`apps/web/tests/*.test.mts`).
* **Key Risks:**
  1. Changing `GET /api/threads` response shape (`Thread[]` -> `{ items, nextCursor, hasMore }`) requires updating all frontend/test consumers atomically.
  2. Prisma schema does not natively express partial unique indexes (`WHERE isQuote = false`), requiring raw SQL inside a `--create-only` migration.
  3. Cloud/local PostgreSQL unavailability currently blocks runtime E2E verification until a DB instance is started.
