# CuriousBees — Role Experience Blueprint

**Phase:** Phase 0 — Product Architecture & Experience Blueprint  
**Principle:** Backend guards (`SupabaseAuthGuard`, `ApprovedGuard`, `RolesGuard`, `ResearchParticipantGuard`) are authoritative; frontend navigation mirrors them cleanly.

---

## 1. Research Scholar (`RESEARCH_SCHOLAR`)

* **Landing Experience:** `/feed` (after admin provisioning -> `/onboarding` -> supervisor approval).
* **Main Navigation:**
  * *Researcher Network:* `Home` (`/feed`), `Explore` (`/researchers`), `Notifications` (`/notifications`), `Nexus` (`/nexus`), `Profile` (`/profile`).
  * *Academic Workspace:* `My Research` (`/my-research`), `Workspaces` (`/workspace`), `Publications` (`/publications`), `Opportunities` (`/opportunities`), `Events` (`/events`).
* **Daily Workflow:**
  1. Opens `/feed` (`For you` / `Following` / `Discover`) to read supervisor & peer updates, papers, and Q&A.
  2. Shares short research updates, paper preprints, or questions via `CompactComposer`; `@mentions` co-authors/supervisors; reposts/quotes relevant papers.
  3. Responds to comments, bookmarks key threads, follows researchers/domains, and initiates collaboration requests into `/nexus`.
  4. Switches to `My Research` (`/my-research`) to update thesis milestones and submit progress reports, or `/workspace/[id]` for shared files & Google Meet sessions.
* **Available Actions:** Create/edit/delete own posts & comments; like, repost, quote-post, bookmark, report; follow researchers/domains/topics; send/accept Nexus collab requests; manage own research profile, milestones, reports, publications; apply to opportunities.
* **Restricted Actions:** Cannot access `/admin/*` or `/my-scholars`; cannot approve scholars, review progress reports, post opportunities, or create/moderate institutional events (requires backend `RolesGuard` hardening on `EventsController`).
* **Relevant Notifications:** Likes, replies, reposts/quote-posts, `@mentions`, new followers, Nexus collab requests/messages, supervisor approval & progress-report feedback, new department opportunities/events.
* **Governance Access:** None.

---

## 2. Research Supervisor (`RESEARCH_SUPERVISOR`)

* **Landing Experience:** `/feed` *(unified with scholars so supervisors are active participants in the research network, with a quick badge/link to pending scholar requests in Supervision)*.
* **Main Navigation:**
  * *Researcher Network:* `Home` (`/feed`), `Explore` (`/researchers`), `Notifications` (`/notifications`), `Nexus` (`/nexus`), `Profile` (`/profile`).
  * *Academic Workspace & Supervision:* `Supervision` (`/my-scholars` — with `SupervisorOverview` KPIs + Scholars, Requests, Reports tabs), `Workspaces` (`/workspace`), `Publications` (`/publications`), `Opportunities` (`/opportunities`), `Events` (`/events`).
* **Daily Workflow:**
  1. Reads and engages in `/feed`: shares lab breakthroughs, reposts/quotes their scholars' publications with commentary, answers questions, and `@mentions` scholars.
  2. Checks notifications & `/my-scholars` for incoming `ScholarSupervisorRequest`s (within `maxScholars` capacity) and submitted scholar progress `Report`s.
  3. Collaborates with co-investigators and scholars in `/nexus` and `/workspace/[id]`; posts Ph.D./project openings in `/opportunities`.
* **Available Actions:** All Researcher Network social actions + approve/decline scholar requests, review/feedback scholar progress reports, create/manage workspaces, post/manage opportunities & publications.
* **Restricted Actions:** Cannot access `/admin/*`, `/my-research` (scholar-only lifecycle), or submit scholar progress reports (`ReportsService` enforces scholar-only submission).
* **Relevant Notifications:** All social interactions (likes, replies, reposts, `@mentions`), incoming scholar supervision requests, submitted scholar progress reports, Nexus collab requests/messages.
* **Governance Access:** None (supervises assigned scholars only).

---

## 3. Institute Admin (`INSTITUTE_ADMIN`)

* **Landing Experience:** `/admin/dashboard`.
* **Main Navigation:** Preserves the 7-section Institutional Governance sidebar (`/admin/users`, `/admin/roles-permissions`, `/admin/faculties-departments`, `/admin/campuses`, `/admin/research-activity`, `/admin/scholar-requests`, `/admin/research-workspaces`, `/admin/publications`, `/admin/posts`, `/admin/moderation`, `/admin/announcements`, `/admin/email-delivery`, `/admin/event-inbox`, `/admin/analytics`, `/admin/audit`, `/admin/settings`).
* **Daily Workflow:** Provisions scholar/supervisor/admin accounts (single or bulk CSV), maintains SRM campuses/faculties/departments, reviews moderation reports (`/admin/moderation`) and flagged posts (`/admin/posts`), approves ingested Gmail events (`/admin/event-inbox`), broadcasts announcements, and audits `AuditLog`.
* **Available Actions:** All `/admin/*` governance, user lifecycle, hierarchy, moderation, announcement, and system configuration endpoints.
* **Restricted Actions:** Strictly blocked from participating in Researcher Network or Academic Workspace (`ResearchParticipantGuard` blocks posting, commenting, liking, reposting, saving, following, collaborating, authoring publications/opportunities/workspaces; `ROLE_PERMISSIONS` blocks `/feed`, `/researchers`, `/nexus`, `/workspace`, `/my-research`, `/my-scholars`, `/events`, `/opportunities`, `/publications`).
* **Relevant Notifications:** Moderation queue escalations, event-ingestion items requiring review, system/email delivery alerts.
* **Academic Workspace Access:** Read-only institutional oversight via `/admin/research-activity`, `/admin/scholar-requests`, `/admin/research-workspaces`, `/admin/publications` — never as a participant.
