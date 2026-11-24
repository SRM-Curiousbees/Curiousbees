# CuriousBees — Existing System Gaps & UX Assessment

**Audit Type:** Read-Only Product Structure, UX & System Gap Analysis

---

## 1. Product Identity & UX Assessment

### How CuriousBees Feels Today
CuriousBees currently feels like a **hybrid between an institutional Ph.D. governance portal and a social feed**, rather than a unified X-like research network:
- **For Scholars:** The landing route (`/feed`) feels social, but the sidebar mixes social discovery (`Research Feed`, `Researchers`, `Curious Nexus`) with ERP-style lifecycle forms (`My Research`, `Workspaces`, `Publications`, `Events`, `Opportunities`).
- **For Supervisors:** They land on `/supervisor` (an institutional KPI dashboard) rather than `/feed`, and must navigate between `/supervisor`, `/my-scholars`, `/workspace`, and `/nexus` to manage scholars and collaborate.
- **For Admins:** `/admin/*` is purely an institutional governance console (19 nav items across 7 sections), intentionally isolated from the social product.

### Key UX Friction Points Observed in Code
1. **Fragmented Collaboration Concepts:** Users encounter three overlapping collaboration surfaces: `ResearchConnection` (`/users/:id/connect`), `CollaborationRequest` (legacy thread/opportunity join), and `ResearchCollabRequest` / `ResearchCollaboration` (`/nexus`), plus `Workspace` (`/workspace/[id]`).
2. **Mobile Navigation Inconsistency:** `MobileFeedNav` bottom bar only renders inside `/feed/page.tsx`. Navigating to `/researchers`, `/notifications`, `/profile`, or `/nexus` on mobile removes the bottom tab bar, forcing users back to the top-left hamburger drawer.
3. **Fake Background Notifications (`PushNotificationPrompt.tsx`):** When browser notifications are allowed and the user switches tabs, fake notifications (*"Dr. Jane Du"*, *"Arjun Kumar"*) fire on a timer—creating confusion with real institutional data.
4. **Client-Side `Following` & `For you` Confusion:** Because `/feed` filters `Following` over only the latest 20 global posts in browser memory, following an active researcher who posted earlier in the week shows nothing in `Following` (or silently falls back to global posts when 0 follows exist).
5. **No Post History on Profiles:** Clicking a researcher's name opens `AcademicProfileView` (`/researchers/[id]`), which shows bio, publications, and thesis info, **but not their feed posts/thoughts**, breaking the core X profile loop.
6. **Global Search (`⌘K` `SpotlightSearch`) Scope:** Searches only client-cached store arrays (`threads`, `opportunities`, `events`, `collaborators`) unless the user clicks through to `/feed`.

---

## 2. Consolidated System Gaps (Fact vs. Inference)

### Verified Facts (Confirmed in Source Code)
1. **No In-App Reposts or Quote-Posts:** `ThreadShare` only tracks external link shares (`COPY_LINK`, `WHATSAPP`, `LINKEDIN`, `EMAIL`).
2. **No `@mentions` or Inline `#hashtag` Links:** No mention parser, autocomplete endpoint, mention notifications, or clickable inline hashtags exist.
3. **No Server-Side Feed Personalization or Load-More Pagination:** `GET /api/threads` returns `Thread[]` without `nextCursor`/`hasMore`; `For you`/`Following` run in `apps/web/src/app/(portal)/feed/page.tsx` `useMemo`.
4. **No Real-Time Messaging or Notification Polling:** Backend push is disabled (`NotificationsService.sendPushToUser`); Nexus chat and notification bell do not poll or subscribe to live updates.
5. **N+1 HTTP Calls on Feed Load:** `ResearchPostCard` calls `GET /api/collaborations/status/:targetUserId` individually per card on mount.
6. **Disconnected Moderation Reporting:** `ThreadsService.reportThread` writes to `ThreadReport`, while `AdminModerationService` reads `ModerationReport`.
7. **Authorization Gaps on Secondary Controllers:**
   - `EventsController` (`events.controller.ts:28-61`) lacks `RolesGuard`/`ResearchParticipantGuard` on `review`, `POST`, `PUT`, `PATCH status`, and `DELETE`.
   - `PublicationsController` (`publications.controller.ts:38-47`) lacks `ResearchParticipantGuard` on `PUT :id` and `DELETE :id`.
8. **Empty/Legacy Artifacts:** `apps/api/src/gmail-ingestion/` is empty; `SupervisorsController` duplicates `SupervisorRequestsController`; 12+ legacy redirect routes exist in `apps/web/src/app/(portal)/`.

### Inferences & Missing Runtime Information
- **Live Database Verification:** Because the Supabase host in `.env` (`ndtaxeqsefusocwgqppx.supabase.co`) is currently unreachable (`ENOTFOUND`), live PostgreSQL query plans, seed state, and E2E integration tests (`127.0.0.1:55432`) were not executed during this audit.
- **Unverified Institutional Policy:** Whether `ThreadsPublicController` (`/api/threads/public/:id`) is intended to remain unauthenticated for external previews or should be removed to match `apps/web/src/app/feed/post/[id]/page.tsx`'s login redirect is a product/security policy decision for SRM.
