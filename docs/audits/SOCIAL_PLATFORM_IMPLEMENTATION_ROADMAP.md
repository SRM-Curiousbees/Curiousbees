# CuriousBees — Social Platform Enhancement: Implementation Roadmap

**Companion Audit:** [`docs/audits/SOCIAL_PLATFORM_ARCHITECTURE_AUDIT.md`](./SOCIAL_PLATFORM_ARCHITECTURE_AUDIT.md)  
**Status:** Proposed — **Awaiting Approval Before Implementation**

---

## 1. Recommended Implementation Order

| Phase | Focus | Why This Order |
| :--- | :--- | :--- |
| **Phase 1A** | **Security, Privacy & Visibility Hardening** | Fixes active PII leaks (`email`, `employeeId`, `supabaseAuthId`) and moderation bypasses (`hidden: true`) before building new social surfaces on top of those endpoints. |
| **Phase 1B** | **Performance Quick Wins & `getResearchers` Bugfix** | Eliminates the 20-request N+1 `collabStatuses` waterfall on `/feed` and fixes the `where.OR` search overwrite bug in `UsersService.getResearchers`. |
| **Phase 2** | **Server-Side Feed (`For You`, `Following`, `Discover`) & Stable Pagination** | Moves feed filtering/ranking from browser `useMemo` to NestJS/PostgreSQL, fixes `sort=top` cursor stability, and adds "Load more" pagination in the UI. |
| **Phase 3** | **Repost & Quote-Post** | Adds Prisma self-referential `repostOfId` + `isQuote` migration, API endpoints, moderation propagation, notifications, and `ResearchPostCard` UI. |
| **Phase 4** | **`@mentions` & Clickable Profile References** | Adds privacy-safe autocomplete, mention parsing/join tables (`ThreadMention` / `CommentMention`), XSS-safe React rendering, and mention notifications. |
| **Phase 5** | **Visibility-Aware Smart Polling & Deep-Link Fixes** | Fixes broken `/threads/:id` notification links to `/feed/:id`, adds visibility-aware polling for notifications & Nexus DMs, and adds a "New posts available" feed banner. |

---

## 2. File-by-File Implementation Plan

### Phase 1A — Security, Privacy & Visibility Hardening
- **`apps/api/src/users/discovery.ts`**
  - Export `PUBLIC_AUTHOR_SELECT` (`id`, `name`, `image`, `role`, `department`, `departmentId`, `departmentRef`) alongside `DISCOVERY_PROFILE_SELECT` (strictly excluding `email`, `employeeId`, `supabaseAuthId`, `clerkId`, `status`, `suspended`).
- **`apps/api/src/threads/threads.service.ts`**
  - Replace `email: true` with `PUBLIC_AUTHOR_SELECT` in `getThreads`, `getThreadById`, `createThread`, `getSavedThreads`, `updateThread`.
  - Add `hidden: false` to `getThreadCounts` and `getSavedThreads` (`thread: { hidden: false }`).
  - Reject `toggleLike`, `requestCollaboration`, and `reportThread` with `NotFoundException` if thread does not exist or `thread.hidden === true`.
- **`apps/api/src/comments/comments.service.ts`**
  - Replace `email: true` with `PUBLIC_AUTHOR_SELECT` in `getCommentsByThread`, `createComment`, `updateComment`.
  - Reject `createComment` if `threadExists.hidden === true`.
  - Fix notification push URL from `/threads/${threadId}` to `/feed/${threadId}` and pass `actionUrl: /feed/${threadId}` to `sendNotification`.
- **`apps/api/src/users/users.service.ts` & `users.controller.ts`**
  - Split `getProfile(id)` into `getMyProfile(req.user.id)` (self-only full profile) and `getResearcherProfile(id)` (public-safe fields using `DISCOVERY_PROFILE_SELECT`, `status: 'ACTIVE'`, `role: { in: RESEARCH_ROLES }`, no `email` or `employeeId` on `supervisor`/`scholars`).
  - In `getResearchers`: add `status: UserStatus.ACTIVE`, combine `q` and `department` using `where.AND` (fixing `where.OR` overwrite), and restrict `supervisorProfile` `select` to `{ designation: true, researchArea: true, maxScholars: true }`.
- **`apps/api/src/threads/threads.controller.ts`**
  - Review `ThreadsPublicController` (`/threads/public/:id`): deprecate or gate behind explicit config/flag since web `/feed/post/[id]` now requires authentication.

### Phase 1B — N+1 Collab Status Elimination
- **`apps/api/src/collaborations/collaborations.controller.ts` & `collaborations.service.ts`**
  - Add `GET /collaborations/statuses?userIds=id1,id2,...` (capped at 50 IDs) returning `Record<string, CollaborationStatusResponse>` in a single `findMany` query.
- **`apps/web/src/store/useStore.ts` & `apps/web/src/components/feed/ResearchPostCard.tsx`**
  - Batch-fetch `collabStatuses` once per feed page load in `fetchFeedThreads` instead of per-card `useEffect`.

### Phase 2 — Server-Side Feed & Stable Pagination
- **`packages/types/src/index.ts`**
  - Add `FeedTab = 'foryou' | 'following' | 'discover'` and `PaginatedFeedResponse<T> = { items: T[]; nextCursor: string | null; hasMore: boolean }`.
- **`apps/api/src/threads/threads.controller.ts` & `threads.service.ts`**
  - Accept `@Query('tab') tab?: FeedTab` on `GET /threads`.
  - Enforce `hidden: false` and `author: { status: 'ACTIVE', suspended: false }`.
  - Implement server-side `following` filter (`authorId IN followedUserIds` OR `tags` matching `followedDomains`/`followedTopics`).
  - Implement server-side `foryou` candidate scoring (supervision, workspace co-membership, follows, domains/topics, department, engagement, recency).
  - Return `{ items, nextCursor, hasMore }` using composite keyset cursor `(createdAt, id)` for `latest` and deterministic `(score, id)` ordering for `top`.
  - Omit full `comments` array from list endpoint (keep `_count.comments`; `FeedComments` already fetches on expand).
- **`apps/web/src/store/useStore.ts` & `apps/web/src/app/(portal)/feed/page.tsx`**
  - Pass `tab` to `GET /api/threads`, remove client-side `useMemo` re-filtering/scoring of `threads`, add `loadMoreThreads` action and "Load more" button + empty state for `Following` with no follows.
- **Database Index Verification (Post-Implementation):**
  - Run `EXPLAIN (ANALYZE, BUFFERS)` on `10k+` seeded threads in disposable test DB before adding any new composite or GIN index.

### Phase 3 — Repost & Quote-Post
- **`apps/api/prisma/schema.prisma` + New Migration (`add_thread_reposts`)**
  - Add `repostOfId String?`, `repostOf Thread? @relation("ThreadReposts", ...)`, `reposts Thread[] @relation("ThreadReposts")`, `isQuote Boolean @default(false)`, `@@index([repostOfId])`.
  - Include custom SQL in migration for partial unique index:
    `CREATE UNIQUE INDEX "Thread_authorId_repostOfId_pure_key" ON "Thread"("authorId", "repostOfId") WHERE "repostOfId" IS NOT NULL AND "isQuote" = false;`
- **`apps/api/src/threads/threads.controller.ts` & `threads.service.ts`**
  - Add `POST /threads/:id/repost` (supports optional `commentary` -> creates quote-post; without commentary -> creates pure repost, idempotent/409 on duplicate pure repost) and `DELETE /threads/:id/repost`.
  - Include `repostOf` (with safe `PUBLIC_AUTHOR_SELECT`, `attachments`, `tags`, `_count`) in feed & `getThreadById` queries.
  - Hide pure reposts when `repostOf.hidden === true` or `repostOf === null`; mask `repostOf` payload on quote-posts when original is hidden/deleted.
  - Send `REPOST` notification to original author (`!== actorId`).
- **`apps/web/src/components/feed/`**
  - Add Repost / Quote-Post action menu on `ResearchPostCard.tsx` (replacing/complementing external share clarity), embedded original post card, and `QuotePostModal.tsx`.

### Phase 4 — `@mentions`
- **`apps/api/prisma/schema.prisma` + New Migration (`add_mentions`)**
  - Add `ThreadMention` (`@@unique([threadId, mentionedUserId])`) and `CommentMention` (`@@unique([commentId, mentionedUserId])`).
- **`apps/api/src/users/users.controller.ts` & `users.service.ts`**
  - Add `GET /users/mention-suggestions?q=<prefix>` (`SEARCH_THROTTLE`, `status: 'ACTIVE'`, `role IN RESEARCH_ROLES`, returns `{ id, name, image, role, department }` only).
- **`apps/api/src/threads/threads.service.ts` & `apps/api/src/comments/comments.service.ts`**
  - Parse canonical `@[Name](user:id)` tokens, validate target users are `ACTIVE` & non-admin, persist deduplicated mention rows, and dispatch `MENTION` notifications (`actionUrl: /feed/${threadId}`).
- **`apps/web/src/components/feed/`**
  - Create shared `<MentionText content={...} />` component (pure React element tokenization, zero `dangerouslySetInnerHTML`, links active users to `/researchers/[id]` and renders deleted/unavailable users as plain text).
  - Add `@` autocomplete popover to `CompactComposer.tsx` and `FeedComments.tsx`.

### Phase 5 — Smart Polling & Real-Time UX
- **`apps/api/src/threads/threads.controller.ts` & `threads.service.ts`**
  - Add `GET /threads/latest-count?since=<iso>&tab=<tab>` for lightweight "New posts available" banner.
- **`apps/web/src/components/shared/notification-dropdown.tsx` & `CuriousNexusHub.tsx` & `feed/page.tsx`**
  - Add `document.visibilityState === 'visible'` polling: 45s for notifications, 8s for active open Nexus chat, 60s for feed latest-count banner.

---

## 3. Testing Strategy (Part H)

1. **Unit Tests (`apps/api/src/**/*.spec.ts`):**
   - `threads.service.spec.ts`: tab filtering (`foryou`, `following`, `discover`), cursor pagination (`hasMore`, `nextCursor`), `toggleLike`/`getThreadCounts`/`getSavedThreads` hidden-post guards, repost & duplicate-repost rejection, quote-post masking when original hidden/deleted.
   - `comments.service.spec.ts`: nested reply creation, hidden-thread rejection, mention parsing & duplicate prevention, `/feed/:id` notification URL.
   - `users.service.spec.ts` / `discovery.spec.ts`: `getResearcherProfile` & `getResearchers` PII omission (`email`, `employeeId`, `supabaseAuthId`), `q` + `department` combined search, `mention-suggestions` admin exclusion.
2. **Integration Tests (`apps/api/test/*.e2e-spec.ts` on `cbtest@127.0.0.1:55432/curiousbees`):**
   - Preserve `apps/api/test/e2e-safety.ts` guards; never run against dev/prod DBs.
   - Test end-to-end pagination stability under concurrent inserts, `ResearchParticipantGuard` blocking `INSTITUTE_ADMIN` from reposting/commenting/mentioning, and moderation propagation (`hidePost` hiding pure reposts and masking quote-posts).
3. **Frontend Tests (`apps/web/tests/*.test.mts`):**
   - Unit tests for `<MentionText />` tokenization & XSS payload escaping (`<script>`, `javascript:` links), and `useStore` pagination append/dedup logic.

---

## 4. Dependencies & Risks

| Risk / Dependency | Mitigation |
| :--- | :--- |
| **No Live PostgreSQL / Supabase Connection Currently** | `.env` points to unreachable `ndtaxeqsefusocwgqppx.supabase.co`. Provision a live local PostgreSQL (`scripts/db/local-test-db.sh init` or Docker) or active Supabase project before running migrations or `EXPLAIN ANALYZE`. |
| **Breaking Response Shape on `GET /api/threads`** | Changing `Thread[]` to `{ items, nextCursor, hasMore }` affects `useStore.fetchFeedThreads` and any other callers. Grep all `/api/threads` consumers and update atomically in Phase 2. |
| **Prisma Partial Unique Index Support** | Prisma schema syntax does not natively declare `WHERE` clauses on `@@unique`; create the partial unique index via raw SQL inside the generated Prisma migration (`--create-only`). |
| **`next/font/google` Offline Build Failure** | Documented in `README.md`: `next build` requires network access to `fonts.googleapis.com` (or migrating to `next/font/local`). Verify builds with network or `npm run typecheck`. |
