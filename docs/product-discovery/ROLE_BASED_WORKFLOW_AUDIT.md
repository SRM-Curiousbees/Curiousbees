# CuriousBees — Role-Based Workflow Audit

**Audit Type:** Read-Only Verification of Auth, Guards, Role Matrices & Workflows  
**Key Sources:** [supabase.guard.ts](file:///Users/matheshwaran/Projects/CuriousBees/apps/api/src/auth/supabase.guard.ts), [approved.guard.ts](file:///Users/matheshwaran/Projects/CuriousBees/apps/api/src/auth/approved.guard.ts), [research-participant.guard.ts](file:///Users/matheshwaran/Projects/CuriousBees/apps/api/src/auth/guards/research-participant.guard.ts), [permissions.ts](file:///Users/matheshwaran/Projects/CuriousBees/apps/web/src/lib/auth/permissions.ts), [middleware.ts](file:///Users/matheshwaran/Projects/CuriousBees/apps/web/src/middleware.ts).

---

## 1. Authentication & Provisioning Model (Verified)

1. **Google OAuth via Supabase:** Users sign in at `/login` -> Supabase Google OAuth -> `/auth/callback` sets session cookies.
2. **Edge Middleware (`middleware.ts`):** Checks Supabase session and `ALLOWED_EMAIL_DOMAINS` (`isEmailDomainAllowed`). Note: Next.js middleware checks **authentication and email domain**, not `role` or `approved` status; role checks in `permissions.ts` (`isRouteAllowedForRole`) are enforced client-side in [PortalLayout](file:///Users/matheshwaran/Projects/CuriousBees/apps/web/src/app/(portal)/layout.tsx) after `syncUserSession()` (`GET /api/auth/me`).
3. **Backend Authorization (`SupabaseAuthGuard`):**
   - Verifies Supabase Bearer JWT (`SupabaseService.verifyToken`).
   - Rejects disallowed email domains (`EMAIL_DOMAIN_NOT_ALLOWED`).
   - **Invite-Only / Admin-Managed:** Looks up existing `User` by `supabaseAuthId` or `email`; unprovisioned emails are denied (`USER_NOT_PROVISIONED`)—except `ROOT_ADMIN_EMAIL` (`srmcuriousbees@gmail.com`), which auto-provisions as `INSTITUTE_ADMIN`.
   - Blocks `SUSPENDED`, `DEACTIVATED`, and `REJECTED` accounts (`403`).
4. **Approval Gate (`ApprovedGuard`):** `INSTITUTE_ADMIN` passes automatically; `RESEARCH_SCHOLAR` and `RESEARCH_SUPERVISOR` require `user.approved === true` and `user.status === 'ACTIVE' | 'APPROVED'`.

---

## 2. Independent Role Journeys

### 2.1 Research Scholar (`RESEARCH_SCHOLAR`)
1. **Provisioning & Onboarding:** Admin creates scholar account -> scholar signs in with Google -> `/onboarding` (selects research domains/topics, department if unassigned, and picks a `RESEARCH_SUPERVISOR` + submits proposal title) -> status becomes `PENDING_SUPERVISOR_APPROVAL` (`/verification-pending` polls `/api/auth/me` every 5s).
2. **Approval:** Supervisor approves in `/my-scholars?tab=requests` (`PUT /api/supervisor-requests/:id/approve`) -> scholar gains portal access, landing on `/feed`.
3. **Daily Social & Research Collaboration:**
   - **Feed (`/feed`):** Posts updates/papers/questions, likes, comments/replies, saves bookmarks, follows researchers/domains/topics, requests collaborations.
   - **My Research (`/my-research`):** Tracks doctoral stage (`PROPOSAL` -> `THESIS_PUBLICATION`), milestones, and submits progress reports (`/api/reports`) to assigned supervisor.
   - **Workspaces & Nexus (`/nexus`, `/workspace/[id]`):** 1:1 collaboration DMs, shared S3 files, milestones, Google Meet links.
   - **Discovery:** Browses `/researchers`, `/opportunities` (can apply/request to join), `/events`, `/publications`.

### 2.2 Research Supervisor (`RESEARCH_SUPERVISOR`)
1. **Provisioning & Onboarding:** Admin creates supervisor account -> signs in -> `/onboarding` sets research areas and department (if unset). Does **not** require supervisor approval (`approved` is set directly). Lands on `/supervisor` (`SupervisorOverview`).
2. **Scholar Management (`/my-scholars` & `/supervisor/requests/[id]`):**
   - Reviews incoming `ScholarSupervisorRequest`s within `SupervisorProfile.maxScholars` capacity.
   - Views supervised scholars and reviews submitted progress `Report`s (`APPROVED`, `REJECTED`, `NEEDS_INFO` + feedback).
3. **Social & Research Collaboration:** Full access to `/feed`, `/researchers`, `/nexus`, `/workspace`, `/publications`, `/events`, and can post/manage openings on `/opportunities`.

### 2.3 Institute Admin (`INSTITUTE_ADMIN`)
1. **Governance Only:** Lands on `/admin/dashboard`. Sidebar exposes 19 governance items across 7 sections.
2. **Core Workflows:**
   - **People & Access (`/admin/users`, `/admin/roles-permissions`):** Provision scholars/supervisors/admins, bulk CSV import, suspend/reactivate, reassign supervisors.
   - **Institution (`/admin/faculties-departments`, `/admin/campuses`):** Maintain SRM campuses, faculties, and departments.
   - **Moderation & Oversight (`/admin/posts`, `/admin/moderation`, `/admin/publications`, `/admin/research-workspaces`, `/admin/audit`):** Hide/restore/delete posts & publications with mandatory reason logged to `AuditLog`; resolve/dismiss `ModerationReport`s; inspect `EventIngestion` queue (`/admin/event-inbox`).
3. **Strict Non-Participation:** Blocked from `/feed`, `/researchers`, `/nexus`, `/workspace`, `/events`, `/opportunities`, `/publications` in `ROLE_PERMISSIONS` and blocked on all write endpoints by `ResearchParticipantGuard`.

---

## 3. Role Comparison & Authorization Inconsistencies

| Feature / Endpoint | Scholar | Supervisor | Institute Admin | Verified Consistency / Issue |
| :--- | :--- | :--- | :--- | :--- |
| Feed read (`GET /threads`) | Allowed | Allowed | Allowed (API) / Blocked (UI route) | Consistent (`ResearchParticipantGuard` blocks admin writes; `app.e2e-spec.ts:458` verifies admin read access). |
| Feed writes (`POST /threads`, `/comments`, `/like`, `/follow`) | Allowed | Allowed | Blocked (`403` `ResearchParticipantGuard`) | Consistent. |
| **Events (`EventsController`)** | Allowed | Allowed | Blocked in UI | **Inconsistency:** `EventsController` (`events.controller.ts:28-61`) uses `@UseGuards(SupabaseAuthGuard, ApprovedGuard)` **without** `@Roles` or `ResearchParticipantGuard` on `GET review`, `POST`, `PUT`, `PATCH status`, `DELETE`. Let's note that any approved scholar/supervisor can call event mutation/review endpoints directly if not checked inside `EventsService`. |
| **Reports (`ReportsController`)** | Submit | Review | Blocked in UI | `ReportsController` uses `SupabaseAuthGuard, ApprovedGuard` (relies on service-level role checks). |
| **Publications (`PublicationsController`)** | Allowed | Allowed | Blocked on `POST` (`ResearchParticipantGuard`) | Note: `PUT :id` and `DELETE :id` only have class-level `SupabaseAuthGuard, ApprovedGuard` (ownership checked in service, but missing `ResearchParticipantGuard`). |
| **Legacy `SupervisorsController`** (`/supervisor/pending-scholars`) | Blocked (`SupervisorGuard`) | Allowed | Blocked | Coexists alongside newer `/supervisor-requests` (`RequestsController`), creating two parallel approval APIs. |
