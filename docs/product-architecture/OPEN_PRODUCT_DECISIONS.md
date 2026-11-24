# CuriousBees — Open Product & Policy Decisions

**Phase:** Phase 0 — Product Architecture & Experience Blueprint  
**Purpose:** Decisions that cannot be determined from the repository alone and require institutional policy or product approval before implementation.

---

## 1. Decisions Requiring Your Approval

### Decision 1: Supervisor Default Landing Route (`/feed` vs. `/supervisor`)
* **Context:** Currently `RESEARCH_SUPERVISOR` lands on `/supervisor` (KPI dashboard) while `RESEARCH_SCHOLAR` lands on `/feed`.
* **Options:**
  * *Option A:* Land supervisors on **`/feed`** (unified Researcher Network experience) with `/supervisor` merged into `/my-scholars` and a prominent "Pending requests" badge in the sidebar.
  * *Option B:* Keep `/supervisor` as the landing page.
* **Recommended Default (Recommendation):** **Option A (`/feed`)** — directly supports making CuriousBees an X-like research network where supervisors actively participate alongside scholars.

### Decision 2: Unauthenticated Public Post Links (`/api/threads/public/:id`)
* **Context:** `apps/web/src/app/feed/post/[id]/page.tsx` redirects visitors to `/feed/[id]` (requiring login), yet `ThreadsPublicController` (`GET /api/threads/public/:id` and `/api/threads/public/files/download`) remains open without authentication (and is tested by `app.e2e-spec.ts:379,504`).
* **Options:**
  * *Option A:* Remove/disable unauthenticated `/threads/public/*` so zero institutional research posts or attachments can ever be fetched without a verified SRM session.
  * *Option B:* Keep `/threads/public/:id` for explicit link previews/OG cards (requiring a dedicated opt-in `isPublic` flag or keeping current behavior).
* **Recommended Default (Recommendation):** **Option A (Require Authentication)** — matches the frontend's stated policy (*"Posts are only visible to signed-in members of the institution"*), coordinated with updating those two E2E tests.

### Decision 3: Empty `Following` Tab Behavior
* **Context:** Currently `feed/page.tsx` silently shows all global posts in `Following` if a user follows 0 people/domains/topics.
* **Options:**
  * *Option A:* Show an empty state with inline **Suggested Researchers & Domains to Follow** cards.
  * *Option B:* Keep showing global fallback posts with a banner.
* **Recommended Default (Recommendation):** **Option A** — makes `Following` honest and drives social graph adoption.

### Decision 4: Account Onboarding & Self-Registration Policy (`AUTH_MODE`)
* **Context:** `SupabaseAuthGuard` enforces `GOOGLE_ADMIN_MANAGED` (accounts must be pre-created by an Institute Admin before Google OAuth sign-in succeeds).
* **Question:** For campus-wide X-style adoption across SRMIST, should `AUTH_MODE` remain strictly admin-provisioned, or allow verified `@srmist.edu.in` users to self-register into onboarding (with supervisor approval for scholars)?
* **Recommended Default (Recommendation):** **Keep `GOOGLE_ADMIN_MANAGED` for Phase 1–3** unless SRM administration explicitly approves self-registration, as changing auth policy alters institutional governance guarantees.

### Decision 5: `EventsController` Permissions
* **Context:** `EventsController` currently allows any `ApprovedGuard` user (scholars and supervisors) to call `POST /events`, `PUT /events/:id`, `PATCH /events/:id/status`, and `GET /events/review`.
* **Question:** Who should be permitted to publish, edit, or review institutional events (`INSTITUTE_ADMIN` only, `RESEARCH_SUPERVISOR` + `INSTITUTE_ADMIN`, or all researchers)?
* **Recommended Default (Recommendation):** **Restrict `review`, `PATCH status`, and `DELETE` to `INSTITUTE_ADMIN`**, and allow `RESEARCH_SUPERVISOR` + `INSTITUTE_ADMIN` (or `ResearchParticipantGuard` for community events) based on SRM's event-publishing policy.

### Decision 6: Consolidation of Legacy `ResearchConnection` & `POST /threads/:id/collaborate`
* **Context:** `ResearchConnection` (`/users/:id/connect`) and `ThreadsService.requestCollaboration` (`POST /threads/:id/collaborate`) coexist alongside `ResearchCollabRequest` (`/api/collaborations/request`).
* **Recommended Default (Recommendation):** **Retire `POST /threads/:id/collaborate`** (superseded by `/api/collaborations/request`), keep `CollaborationRequest` scoped to `OpportunitiesService`, and confirm whether any active scholar directory view still depends on `ResearchConnection` before deprecating it.

### Decision 7: Live Database Target for Phase 1B–5 Verification
* **Context:** `.env` currently points to an unreachable Supabase host (`ndtaxeqsefusocwgqppx.supabase.co`).
* **Question:** Should we set up the local disposable PostgreSQL (`scripts/db/local-test-db.sh` / Homebrew PostgreSQL) for upcoming migrations & E2E verification, or will you provide updated Supabase credentials?
* **Recommended Default (Recommendation):** **Local PostgreSQL for development/E2E testing** (`127.0.0.1:55432`) so all migrations and `EXPLAIN ANALYZE` checks are verified safely without touching cloud/production.
