# CuriousBees — Limitations and Future Scope

---

## 1. Current Verified Limitations
1. **Database Connectivity Limitation:** The Supabase host configured in `.env` (`ndtaxeqsefusocwgqppx.supabase.co`) is unreachable (`ENOTFOUND`). Without an active PostgreSQL/Supabase instance, `PrismaService` falls back to demo mode and E2E SQL integration tests cannot execute.
2. **Pending Live Supabase & AWS Configuration:** Live Google OAuth roundtrips, S3 presigned uploads/downloads, and Brevo email delivery require active cloud credentials and deployed buckets/policies.
3. **Push Notifications Disabled:** `NotificationsService.sendPushToUser` is disabled (no push provider configured). The previous fake `setInterval` simulator in `PushNotificationPrompt.tsx` was removed in Phase 1B.
4. **Client-Side Feed Tab Personalization:** On `/feed`, `For you` and `Following` tabs filter/score in browser `useMemo` over only the fetched page of threads, and no "Load more" pagination button is wired yet.
5. **Public Thread Endpoint Policy Pending:** `ThreadsPublicController` (`GET /api/threads/public/:id`) remains unauthenticated (tested by `app.e2e-spec.ts:379,504`) even though web `/feed/post/[id]` redirects to login.
6. **Legacy Module Overlaps:** `SupervisorsController` (`/api/supervisor/pending-scholars`), `POST /api/threads/:id/collaborate`, `/chat` alias, and empty `apps/api/src/gmail-ingestion/` remain for backward compatibility.
7. **Offline `next build` Font Fetching:** `next/font/google` requires outbound access to `fonts.googleapis.com` during `next build`.

---

## 2. Proposed Future Scope (Planned Enhancements)
1. **Server-Side Feed & Keyset Pagination (Roadmap Phase 3):** Move `For you` / `Following` ranking into PostgreSQL/NestJS (`GET /api/threads?tab=...`) returning `{ items, nextCursor, hasMore }` with `EXPLAIN ANALYZE`-verified indexes.
2. **Reposts & Quote-Posts (Roadmap Phase 4):** Self-referential `Thread.repostOfId` + `isQuote` with partial unique index and moderation propagation.
3. **`@mentions` & Profile Post History (Roadmap Phase 5):** Privacy-safe researcher autocomplete, `ThreadMention`/`CommentMention` join tables, XSS-safe `<MentionText />` rendering, and a `Posts` tab + Followers/Following drawer on profiles.
4. **Visibility-Aware Smart Polling & Server-Backed `⌘K` Search:** Lightweight polling for `/api/notifications` and active `/nexus` chats, plus upgrading `SpotlightSearch` to query `/api/feed/search`.
5. **Supervisor Experience Alignment:** Land supervisors on `/feed` and consolidate `/supervisor` KPIs into `/my-scholars`.
6. **Self-Hosted Fonts:** Switch `next/font/google` to `next/font/local` for offline CI builds.
