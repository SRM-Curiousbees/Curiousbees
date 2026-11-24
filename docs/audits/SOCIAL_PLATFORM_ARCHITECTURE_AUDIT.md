# CuriousBees — Social Platform Enhancement: Phase 1 Architecture Audit

**Date:** 2026-11-25  
**Scope:** Full-stack architecture, security, privacy, database/performance, and social-feature audit of CuriousBees (`apps/web`, `apps/api`, `packages/*`, `apps/api/prisma/schema.prisma`) against SRM's X/Threads-inspired research collaboration requirements.  
**Verification Basis:** Direct source-code inspection across backend, frontend, Prisma schema/migrations, and unit test execution (`npm test --workspace=apps/api -- --runInBand --no-watchman`: 19 suites, 209 passed, 2 skipped).  
**Runtime Caveat:** The Supabase PostgreSQL host configured in `.env` (`ndtaxeqsefusocwgqppx.supabase.co`) is unreachable (`ENOTFOUND`), so `PrismaService` falls back to demo/mock mode at runtime. All database query-plan and live-DB behaviors below are derived from **static code & schema analysis**; live SQL `EXPLAIN ANALYZE` verification must be performed against a running PostgreSQL instance before applying any new indexes.

---

## 1. Verified Current Implementation (Part A)

### 1.1 Architecture & Workspace Topology
- **Monorepo:** npm workspaces (`apps/web`, `apps/api`, `packages/types`, `packages/constants`, `packages/shared-utils`, `packages/ui`).
- **Web (`apps/web`):** Next.js 15 App Router, React 19, Tailwind CSS, Zustand (`apps/web/src/store/useStore.ts`), `apiFetch` client (`apps/web/src/lib/api-client.ts`).
- **API (`apps/api`):** NestJS 11 REST API (`main.ts`, `app.module.ts`), Prisma ORM v6.19.3, Supabase JWT verification (`SupabaseService` / `SupabaseAuthGuard`), `@nestjs/throttler` in-memory rate limiting, Amazon S3 presigned URLs (`FilesService`), Brevo email (`MailService`).
- **Migrations (`apps/api/prisma/migrations/`):** Three migrations exist:
  1. `20260929000000_production_baseline`
  2. `20261001000000_event_email_ingestion`
  3. `20261023000000_remove_zoom_workplace`

### 1.2 Inventory of Existing Social & Related Models (`apps/api/prisma/schema.prisma`)

| Domain | Models & Key Constraints |
| :--- | :--- |
| **Users & Roles** | `User` (`role`: `INSTITUTE_ADMIN`, `RESEARCH_SUPERVISOR`, `RESEARCH_SCHOLAR`; `status`: `ACTIVE`, `PENDING_SUPERVISOR_APPROVAL`, `REJECTED`, `SUSPENDED`, `DEACTIVATED`, `RESTRICTED`), `SupervisorProfile`, `ScholarProfile`, `ScholarSupervisorRequest`, `ResearcherExternalLink` |
| **Posts / Threads** | `Thread` (`type`: `ThreadType` enum — `TEXT`, `RESEARCH_UPDATE`, `DISCUSSION`, `QUESTION`, `ANNOUNCEMENT`, `PUBLICATION`, `ACHIEVEMENT`, `COLLABORATION_REQUEST`; `hidden`, `moderatedAt`, `moderatedBy`, `moderationReason`, `tags: String[]`, `isPaper`, `paperJournal`), `ThreadAttachment` |
| **Interactions** | `Comment` (self-referential `parentId` for nested replies), `CommentLike` (`@@unique([commentId, userId])`), `ThreadLike` (`@@unique([threadId, userId])`), `SavedThread` (`@@unique([threadId, userId])`), `ThreadShare` (external share tracking with `platform`), `ThreadReport` |
| **Social Graph** | `UserFollow` (`@@unique([followerId, followingId])`, `notificationsEnabled`), `DomainFollow` (`@@unique([userId, domain])`), `TopicFollow` (`@@unique([userId, topic])`), `ResearchConnection` (`@@unique([requesterId, receiverId])`) |
| **Collaboration & DM** | `CollaborationRequest` (legacy opportunity/thread interest), `ResearchCollabRequest`, `ResearchCollaboration` (1:1 active thread/workspace link), `CollaborationMessage`, `Workspace`, `WorkspaceMember`, `WorkspaceFile`, `WorkspaceMilestone`, `WorkspaceAnnouncement` |
| **Notifications & Moderation** | `Notification`, `NotificationToken` (push disabled in `NotificationsService.sendPushToUser`), `UserPreference`, `ModerationReport`, `AuditLog` |

### 1.3 Inventory of Existing API Endpoints

| Controller | Endpoints & Guards |
| :--- | :--- |
| **`ThreadsController`** (`/threads`, `SupabaseAuthGuard`, `ApprovedGuard`) | `GET /threads` (`search`, `tag`, `type`, `sort`, `cursor`, `limit`), `GET /threads/counts`, `GET /threads/saved`, `GET /threads/:id`, `POST /threads` (`ResearchParticipantGuard`), `PUT /threads/:id` (`ResearchParticipantGuard`), `DELETE /threads/:id` (`ResearchParticipantGuard`), `POST /threads/:id/like`, `POST /threads/:id/save`, `POST /threads/:id/share`, `POST /threads/:id/report`, `POST /threads/:id/collaborate`, `POST /threads/files/upload-url`, `GET /threads/files/download` |
| **`ThreadsPublicController`** (`/threads/public`, **no auth guard**) | `GET /threads/public/:id`, `GET /threads/public/files/download` |
| **`FeedController`** (`/feed`, `SupabaseAuthGuard`) | `GET /feed/search` (`SEARCH_THROTTLE`), `GET /feed/peers`, `GET /feed/trending` |
| **`CommentsController`** (`/comments`, `SupabaseAuthGuard`, `ApprovedGuard`) | `GET /comments/thread/:threadId`, `POST /comments`, `PATCH /comments/:id`, `DELETE /comments/:id`, `POST /comments/:id/like` (writes guarded by `ResearchParticipantGuard`) |
| **`UsersController`** (`/users`, `SupabaseAuthGuard`) | `GET /users/profile`, `GET /users/:id/profile`, `PUT/PATCH /users/profile`, `GET /users/collaborators`, `GET /users/researchers`, `POST /users/:id/follow`, `DELETE /users/:id/follow`, `PUT /users/:id/follow-notifications`, `GET /users/:id/follow-status`, `GET /users/:id/followers`, `GET /users/:id/following`, `GET /users/me/follow-state`, `POST/DELETE /users/follow-domain`, `GET /users/followed-domains`, `POST/DELETE /users/follow-topic`, `GET /users/followed-topics`, `POST /users/:id/connect` |
| **`CollaborationsController`** (`/collaborations`, `SupabaseAuthGuard`, `ApprovedGuard`) | `POST /collaborations/request`, `GET /collaborations/requests`, `POST /collaborations/requests/:id/{cancel,accept,decline}`, `GET /collaborations/status/:targetUserId`, `GET /collaborations`, `GET /collaborations/:id`, `GET/POST /collaborations/:id/messages`, `POST /collaborations/:id/close` |
| **`NotificationsController`** (`/notifications`, `SupabaseAuthGuard`, `ApprovedGuard`) | `GET /notifications`, `PUT /notifications/read-all`, `PUT /notifications/:id/read`, `GET/PUT /notifications/preferences` |
| **`AdminContentController`** (`/admin/content`, `RolesGuard(INSTITUTE_ADMIN)`) | `GET /admin/content/posts`, `POST /admin/content/posts/:id/{hide,restore}`, `DELETE /admin/content/posts/:id` |
| **`AdminModerationController`** (`/admin/moderation`, `RolesGuard(INSTITUTE_ADMIN)`) | `GET /admin/moderation/reports`, `POST /admin/moderation/reports/:id/{resolve,dismiss}` |

### 1.4 Inventory of Reusable Frontend Components (`apps/web/src/`)
- **Pages:** `apps/web/src/app/(portal)/feed/page.tsx` (main feed), `apps/web/src/app/(portal)/feed/[id]/page.tsx` (single post detail), `apps/web/src/app/feed/post/[id]/page.tsx` (redirects to `/feed/[id]`), `apps/web/src/app/(portal)/researchers/page.tsx` & `[id]/page.tsx`, `apps/web/src/app/(portal)/nexus/page.tsx` (`CuriousNexusHub`), `apps/web/src/app/(portal)/notifications/page.tsx`.
- **Feed Components (`apps/web/src/components/feed/`):** `CompactComposer.tsx`, `ResearchPostCard.tsx`, `FeedComments.tsx`, `ResearchDiscoverySidebar.tsx`, `ResearcherProfileModal.tsx`, `ShareModal.tsx`, `EditPostModal.tsx`, `ConfirmDeleteModal.tsx`, `ReportPostModal.tsx`, `FeedSkeleton.tsx`, `FeedFAB.tsx`, `MobileFeedNav.tsx`.
- **State Store:** `apps/web/src/store/useStore.ts` (Zustand store managing `threads`, `feedCounts`, `followedUserIds`, `followedDomains`, `followedTopics`, `collabStatuses`, `notifications`).

### 1.5 Existing Test Coverage
- **Unit tests (`apps/api`):** 19 Jest `.spec.ts` suites (209 passed, 2 skipped). Relevant social specs: `threads.service.spec.ts` (2 tests: `limit <= 50` + `hidden: false` + cursor), `feed.service.spec.ts` (2 tests: `searchFeed`), `feed.controller.spec.ts`, `discovery.spec.ts` (checks `DISCOVERY_PROFILE_SELECT` omits `email`, `employeeId`, etc., and admin exclusion), `supabase.guard.spec.ts`, `rate-limits.spec.ts`.
- **No unit tests exist for:** `CommentsService`, `NotificationsService`, `CollaborationsService`, `AdminContentService`, `AdminModerationService`, `followUser`/`getResearchers` in `UsersService`, or any frontend feed component.
- **E2E tests (`apps/api/test/`):** `app.e2e-spec.ts`, `discovery.e2e-spec.ts` — strictly guarded by `e2e-safety.ts` to run **only** against disposable local PostgreSQL (`cbtest@127.0.0.1:55432/curiousbees`).

---

## 2. Confirmed Limitations & Discrepancies (Verified Facts)

1. **Feed Personalization & Filtering Are Client-Side Only (`apps/web/src/app/(portal)/feed/page.tsx`):**
   - `fetchFeedThreads` calls `GET /api/threads` with `take <= 50` (default `20`) and no `tab` parameter.
   - The `For you`, `Following`, and `Discover` tabs filter and score **only the 20 posts already fetched** in `useMemo` (`lines 169-275`), meaning a followed researcher whose post isn't in the latest 20 global posts is missing from the `Following` tab.
   - `Following` falls back to showing all matched threads if the user follows 0 authors/domains/topics (`lines 192-195`).
2. **Broken / Incomplete Cursor Pagination:**
   - `ThreadsService.getThreads` accepts `cursor` and `limit`, but returns a plain `Thread[]` array without `nextCursor` or `hasMore`, and `apps/web/src/app/(portal)/feed/page.tsx` has **no "Load more" or infinite scroll** UI at all.
   - When `sort === 'top'`, `ThreadsService.getThreads` orders by `[{ likes: { _count: 'desc' } }, { comments: { _count: 'desc' } }, { createdAt: 'desc' }]` while using `cursor: { id }`. Prisma's single-column cursor pagination over aggregate relation counts is unstable when counts tie or mutate between page loads.
3. **In-App Repost & Quote-Post Do Not Exist:**
   - `ThreadShare` only logs external share clicks (`COPY_LINK`, `WHATSAPP`, `LINKEDIN`, `EMAIL`). There is no repost or quote-post model, endpoint, or timeline attribution.
4. **No `@mentions` System:**
   - No mention parsing, researcher autocomplete endpoint, mention notification type, or clickable `@mention` rendering exists.
5. **No Real-Time Delivery:**
   - `NotificationsService.sendPushToUser` is explicitly disabled (`logs "Push provider removed"`). Notifications and Nexus messages are fetched on mount or action—there is not even background polling for notifications or chat messages (`setInterval` only exists on `verification-pending` and `PushNotificationPrompt`).
6. **Broken Notification Deep-Link:**
   - `CommentsService.createComment` (`line 110`) sets push URL to `/threads/${threadId}`, whereas the actual web route is `/feed/${threadId}` (and `ThreadsService.toggleLike` omits `actionUrl` altogether).
7. **Dual Reporting Models (`ThreadReport` vs `ModerationReport`):**
   - `ThreadsService.reportThread` writes to `ThreadReport`, while `AdminModerationService` queries `ModerationReport` — verify/unify reporting ingestion so feed reports reliably appear in the admin moderation queue.

---

## 3. Security & Privacy Findings (Part F)

| Severity | Finding & Verified Location | Impact & Remediation |
| :--- | :--- | :--- |
| **HIGH** | **`GET /users/:id/profile` exposes full `User` record (`UsersService.getProfile`, `users.service.ts:21-115`)** | Uses `include` without `select`, returning `email`, `supabaseAuthId`, `clerkId`, `employeeId`, `supervisorEmail`, `approvedBy`, `status`, `suspended`—plus `scholars[].email`, `scholars[].employeeId`, and `supervisor.email`—to **any** signed-in user. Split `getMyProfile` (self) from `getPublicResearcherProfile` (strict `DISCOVERY_PROFILE_SELECT`, excluding `INSTITUTE_ADMIN` and inactive users). |
| **HIGH** | **`email` leaked in all Thread & Comment responses (`threads.service.ts:52,149,178,288,431,488`; `comments.service.ts:19,26,33,85,134`)** | Every feed post, single-thread fetch, and comment payload includes `author.email`. Remove `email: true` from all public/feed author projections; use `DISCOVERY_PROFILE_SELECT` or a minimal public author select (`id, name, image, role, department, departmentId, departmentRef`). |
| **MEDIUM** | **Moderated (`hidden: true`) & inactive-user posts leak through secondary endpoints** | `ThreadsService.getThreadCounts` (`line 116`) does not filter `hidden: false`. `getSavedThreads` (`line 422`) returns hidden saved posts. `toggleLike`, `requestCollaboration`, and `CommentsService.createComment` do not check `thread.hidden === false`. `ThreadsController.getThreads` / `getThreadById` lack `hidden` / inactive-author guards on likes/comments. |
| **MEDIUM** | **`GET /users/researchers` exposes `supervisorProfile` (including `employeeId`) and omits `status: 'ACTIVE'` (`users.service.ts:876-929`)** | Suspended/deactivated accounts can appear in directory results, and `supervisorProfile: true` returns `employeeId`. Add `status: UserStatus.ACTIVE` and explicitly `select: { designation: true, researchArea: true, maxScholars: true }` on `supervisorProfile`. |
| **MEDIUM** | **`ThreadsPublicController` (`/threads/public/:id`) remains active without auth (`threads.controller.ts:119-143`)** | Although `apps/web/src/app/feed/post/[id]/page.tsx` now redirects to `/feed/[id]` (requiring login), the unauthenticated backend endpoint `/api/threads/public/:id` and `/api/threads/public/files/download` remain exposed. Confirm institutional policy and either disable or restrict to explicit public-share flag. |
| **LOW** | **UGC Rendering & XSS (`ResearchPostCard.tsx:301`, `FeedComments.tsx`)** | Currently safe because React escapes plain text (`<p>{textContent}</p>`), and attachment links use presigned S3 endpoints. **Constraint:** Any future `@mention` or `#hashtag` parser must render React elements (no `dangerouslySetInnerHTML`) and validate profile IDs. |
| **INFO** | **Rate Limiting (`rate-limits.ts`)** | Solid per-session (`sha256(token)`) + per-IP throttling (`300/min` read, `60/min` write, `60/min` search). Note: counters are in-memory per instance (acceptable for single-instance deployment; document if horizontally scaled). |

---

## 4. Database & Performance Review (Part G)

1. **`ResearchPostCard` N+1 HTTP Waterfall (`ResearchPostCard.tsx:72-76`):**
   - Every visible post card runs `useEffect(() => fetchCollabStatus(authorId, post.id))` on mount. A 20-post feed fires up to **20 parallel `GET /api/collaborations/status/:targetUserId`** requests on every feed load.
   - **Fix:** Batch-resolve collaboration statuses for the page's unique `authorId`s in a single query/endpoint or attach it in the feed payload.
2. **Search Bug in `UsersService.getResearchers` (`users.service.ts:839-864`):**
   - If both `q` and `department` are supplied, `where.OR = [...]` on line 858 overwrites `where.OR` from line 840, silently dropping the `q` search filter. Must combine using `where.AND`.
3. **`ThreadsService.getThreads` Over-fetching:**
   - Returns full `comments` (top 3 with nested author + likes) on every list item even when comments are collapsed by default. Consider returning only `_count.comments` on the list endpoint and fetching comments lazily on expand (as `FeedComments` already fetches `/api/comments/thread/:id` on mount).
4. **Unbounded `getTrendingResearch` Scan (`feed.service.ts:163-204`):**
   - Scans latest 100 threads and **all** `ResearchInterest` rows with `_count.users` on every sidebar load. Cache in-process for 60–300s (no Redis required for single instance) or compute via aggregate query.
5. **Database Indexes (Evidence-Based Only):**
   - `Thread` already has `@@index([authorId])`, `@@index([hidden, createdAt])`, `@@index([type, createdAt])`, `@@index([createdAt])`.
   - `UserFollow` has `@@unique([followerId, followingId])`, `@@index([followerId])`, `@@index([followingId])`.
   - **Recommendation:** Do **not** add speculative indexes now. Once server-side feed queries (`Following`, `For You`) are written, run `EXPLAIN (ANALYZE, BUFFERS)` on realistic seeded data (`10k+` threads) to verify whether `Thread(hidden, authorId, createdAt DESC)` or a GIN index on `Thread.tags` is actually needed.

---

## 5. Server-Side Feed Improvement Design (Part B)

Extend the **existing** `GET /api/threads` (`ThreadsController` / `ThreadsService`)—without creating duplicate feed endpoints—to accept `tab=foryou|following|discover`:

- **Visibility Baseline (all tabs):** `hidden: false` and `author: { status: 'ACTIVE', suspended: false }`.
- **Discover (`tab=discover`):** Global institutional feed filtered by optional `type`, `tag`, `search`, sorted by `latest` (`createdAt DESC, id DESC`) or `top`.
- **Following (`tab=following`):** Server-side `where` matching:
  - `authorId IN (user's followedUserIds)` OR
  - `tags` overlaps user's `followedTopics` / `followedDomains` (normalized).
  - If user follows nothing, return an empty list with `hasMore: false` (or explicit `emptyReason: 'NO_FOLLOWS'` metadata) rather than silently showing global posts—letting the UI show a clear "Follow researchers or topics to build your feed" prompt with suggested peers.
- **For You (`tab=foryou`):** Server-side candidate retrieval + deterministic SQL/service scoring combining:
  1. Direct supervision (`supervisorId` / `myScholars`)
  2. Shared `WorkspaceMember` co-membership
  3. `UserFollow`, `DomainFollow`, `TopicFollow`, `UserInterest`
  4. Same `departmentId`
  5. Recency decay + engagement (`likes`, `comments`, `reposts`).
- **Stable Pagination Response Shape:**
  - Return `{ items: Thread[], nextCursor: string | null, hasMore: boolean }` (update `useStore.fetchFeedThreads` & `apps/web/src/app/(portal)/feed/page.tsx` with a "Load more" button).
  - For `latest`: composite keyset cursor `(createdAt, id)` so new posts arriving mid-scroll never cause duplicates or skipped items.
  - For `top`: window-scoped ranking (e.g., last 30 days or score-sorted with deterministic `(score, id)` tie-breaker / offset or keyset cursor).

---

## 6. Repost & Quote-Post Design (Part C)

Instead of duplicating original post content, extend `Thread` with a **self-referential relation**:

### 6.1 Proposed Prisma Schema Change (Do Not Apply Yet)
```prisma
model Thread {
  // ... existing fields ...
  // Self-referential repost / quote-post
  repostOfId   String?
  repostOf     Thread?   @relation("ThreadReposts", fields: [repostOfId], references: [id], onDelete: SetNull)
  reposts      Thread[]  @relation("ThreadReposts")
  isQuote      Boolean   @default(false)

  @@index([repostOfId])
}
```
*(Note: For pure reposts (`isQuote = false`), `title` and `content` can be empty strings; for quote-posts (`isQuote = true`), `content` holds the quoter's commentary. A partial unique index in PostgreSQL migration: `CREATE UNIQUE INDEX "Thread_authorId_repostOfId_pure_key" ON "Thread"("authorId", "repostOfId") WHERE "repostOfId" IS NOT NULL AND "isQuote" = false;` prevents duplicate pure reposts while allowing multiple quote-posts.)*

### 6.2 Behavioral & Security Rules
- **Attribution:** Feed returns `repostOf` (with its `author` via safe `DISCOVERY_PROFILE_SELECT`, `attachments`, `tags`, `_count`).
- **Repost Removal:** Deleting the repost `Thread` removes it cleanly (`DELETE /api/threads/:id` or `DELETE /api/threads/:id/repost`).
- **Moderation & Deletion Propagation:**
  - If `repostOf` is `hidden = true` or deleted (`repostOfId = null` via `onDelete: SetNull`):
    - **Pure reposts (`isQuote = false`):** Automatically excluded from feed queries (`where: { hidden: false, OR: [{ repostOfId: null, isQuote: false }, { repostOf: { hidden: false } }] }` — or soft-filtered).
    - **Quote-posts (`isQuote = true`):** Commentary remains visible, but the embedded card renders a neutral placeholder: *"Original post is unavailable or removed by moderation."*
- **Notifications:** Notify `repostOf.authorId` (when `!== actorId`) with `type: 'REPOST'` and `actionUrl: /feed/${newThread.id}`.

---

## 7. `@mentions` Design (Part D)

- **Autocomplete Endpoint:** `GET /api/users/mention-suggestions?q=<prefix>` (or extend `GET /api/users/researchers?q=...&limit=8` with `status: 'ACTIVE'`).
  - **Privacy:** Returns **only** `{ id, name, image, role, department }` — **never** `email`, `employeeId`, or `INSTITUTE_ADMIN` accounts.
  - **Rate Limit:** Apply `SEARCH_THROTTLE` (`60/min` per session).
- **Storage & Parsing Format:**
  - Store canonical mention tokens in post/comment text or structured metadata, e.g., `@[Dr. Priya](user:cuid)` (or parse `@` + store `ThreadMention` / `CommentMention` join rows linking `mentionedUserId`, `threadId`/`commentId`). Storing a `Mention` join table guarantees:
    1. Easy lookup of "posts mentioning user X".
    2. Duplicate mention prevention (`@@unique([threadId, mentionedUserId])` / `@@unique([commentId, mentionedUserId])`).
    3. Clean handling of deleted/suspended users (if user is deleted or `status !== 'ACTIVE'`, render plain `@Name` without an active profile link).
- **Safe Rendering (XSS Prevention):**
  - Tokenize text into React nodes (`text` segments + `<Link href="/researchers/[id]">@Name</Link>`). **Never** use `dangerouslySetInnerHTML`.
- **Notifications:** On thread/comment creation, notify newly mentioned `ACTIVE` `RESEARCH_SCHOLAR`/`RESEARCH_SUPERVISOR` users (excluding self-mentions), with `actionUrl: /feed/${threadId}`.

---

## 8. Real-Time Architecture Evaluation (Part E)

| Option | Complexity & Infra Cost | Auth / Authz | Suitability for CuriousBees |
| :--- | :--- | :--- | :--- |
| **1. Current Approach (Fetch on mount/action)** | Zero extra infra | Standard JWT on REST | Too stale for X/Threads-style notifications and Nexus DMs. |
| **2. Smart HTTP Polling (Visibility-aware)** | Zero extra infra; uses existing NestJS REST + `@nestjs/throttler` | Existing `SupabaseAuthGuard` | **Best immediate fit** for notifications (30s–60s when tab visible) & open Nexus chat (5s–10s when thread open). |
| **3. Server-Sent Events (SSE)** | Low; single NestJS `@Sse()` endpoint; no Redis needed on 1 instance | Token via header/query (requires careful CORS/proxy buffering config) | Good Phase 2 upgrade for notification bell + feed "New posts available" banner. |
| **4. Supabase Realtime** | Already have Supabase project, **but** CuriousBees uses Prisma + custom NestJS auth/RLS bypasses; enabling Postgres CDC requires Supabase RLS policies matching Prisma tables | High RLS maintenance risk | **Not recommended** (splits authz between NestJS guards and Postgres RLS). |
| **5. WebSocket Gateway + Redis Adapter** | High; requires Redis pub/sub for multi-instance, sticky sessions, WS auth handshake | Custom WS JWT guard | **Over-engineered** for current institutional scale (SRMIST campus). |

**Recommendation:** Start with **visibility-aware smart polling** (zero new infrastructure, respects `RATE_LIMIT_USER_READ=300/min`) for notifications and active Nexus conversations, plus a lightweight `GET /api/threads/latest-count?since=<iso>` check for a "New posts available" banner on `/feed`. Re-evaluate SSE only if concurrent active users exceed single-instance polling comfort.

---

## 9. Testing Plan Summary (Part H)

All new features will be covered across 4 layers while preserving `apps/api/test/e2e-safety.ts` (never touching dev/prod DBs):
1. **Unit Tests (Jest, mocked Prisma):** Server-side feed query builders (`foryou`/`following`/`discover`), repost/quote-post creation & duplicate prevention, mention parsing/deduplication, notification dispatch.
2. **Integration Tests (`.e2e-spec.ts` on `127.0.0.1:55432`):** Cursor pagination stability, hidden-post filtering across feed/saved/counts/reposts, `INSTITUTE_ADMIN` blocked by `ResearchParticipantGuard` on reposts/mentions, privacy assertions (zero `email`/`employeeId` in responses).
3. **Security & Moderation Tests:** Verify hidden original post hides pure reposts and masks quote-post embed; verify inactive/deleted mentioned users cannot be linked or notified; verify XSS payloads in post content/mentions render as escaped text.
4. **Frontend Tests:** Component/unit tests for `@mention` tokenization & safe rendering, repost/quote-post modal state, and "Load more" pagination state in `useStore`.
