# CuriousBees — Target Information Architecture

**Phase:** Phase 0 — Product Architecture & Experience Blueprint  
**Sources:** `CURRENT_PRODUCT_INVENTORY.md`, `navigation.ts`, `permissions.ts`, `MobileFeedNav.tsx`

---

## 1. Proposed Navigation Structure

### 1.1 Research Scholar (`RESEARCH_SCHOLAR`)
* **Landing Route:** `/feed`
* **Section 1 — Researcher Network:**
  * `Home` (`/feed`)
  * `Explore` (`/researchers` — researchers, trending topics, opportunities/events discovery tabs or links)
  * `Notifications` (`/notifications` — badge count)
  * `Nexus` (`/nexus` — collaboration requests & messages)
  * `Profile` (`/profile`)
* **Section 2 — Academic Workspace:**
  * `My Research` (`/my-research` — thesis stage, milestones, progress reports)
  * `Workspaces` (`/workspace` — shared project sandboxes & files)
  * `Publications` (`/publications`)
  * `Opportunities` (`/opportunities`)
  * `Events` (`/events`)
* **Section 3 — Account:**
  * `Settings` (`/settings`), `Help` (`/help`)

### 1.2 Research Supervisor (`RESEARCH_SUPERVISOR`)
* **Landing Route:** `/feed` *(changed from `/supervisor` so supervisors share the primary Researcher Network experience)*
* **Section 1 — Researcher Network:**
  * `Home` (`/feed`)
  * `Explore` (`/researchers`)
  * `Notifications` (`/notifications`)
  * `Nexus` (`/nexus`)
  * `Profile` (`/profile`)
* **Section 2 — Academic Workspace & Supervision:**
  * `Supervision` (`/my-scholars` — overview summary + scholars, requests, reports tabs; absorbs `/supervisor` KPIs)
  * `Workspaces` (`/workspace`)
  * `Publications` (`/publications`)
  * `Opportunities` (`/opportunities`)
  * `Events` (`/events`)
* **Section 3 — Account:**
  * `Settings` (`/settings`), `Help` (`/help`)

### 1.3 Institute Admin (`INSTITUTE_ADMIN`)
* **Landing Route:** `/admin/dashboard` *(remains strictly separated from Researcher Network)*
* Preserves the 7-section Governance Sidebar in `navigation.ts`:
  * `Dashboard` (`/admin/dashboard`)
  * **People & Access:** `Users` (`/admin/users` with `SCHOLARS`, `SUPERVISORS`, `ADMINS`, `SUSPENDED` tabs), `Roles & Permissions` (`/admin/roles-permissions`)
  * **Institution:** `Faculties & Depts` (`/admin/faculties-departments`), `Campuses` (`/admin/campuses`)
  * **Research Governance:** `Research Activity` (`/admin/research-activity`), `Supervision Requests` (`/admin/scholar-requests`), `Workspaces` (`/admin/research-workspaces`), `Publications` (`/admin/publications`)
  * **Moderation:** `Posts & Discussions` (`/admin/posts`), `Reports & Queue` (`/admin/moderation`)
  * **Communication:** `Announcements` (`/admin/announcements`), `Email Delivery` (`/admin/email-delivery`), `Event Inbox` (`/admin/event-inbox`)
  * **Insight & Audit:** `Institutional Analytics` (`/admin/analytics`), `Audit Center` (`/admin/audit`), `System Settings` (`/admin/settings`)

---

## 2. Desktop vs. Mobile Structure

* **Desktop (`lg+`):**
  * Persistent left navigation rail (`Sidebar.tsx`) with clear visual grouping: **Researcher Network** vs. **Academic Workspace**.
  * Sticky top bar (`Navbar.tsx`) with `⌘K` global search (`SpotlightSearch` upgraded to query backend `/api/feed/search`), notification bell, and profile menu.
  * On `/feed`, 2-column layout: Center timeline (`max-w-[680px]`) + Right discovery rail (`ResearchDiscoverySidebar`: Trending Research, Suggested Peers).
* **Mobile (`< md`):**
  * **Global Mobile Bottom Bar** across all Researcher Network routes (`/feed`, `/researchers`, `/notifications`, `/nexus`, `/profile`)—extending `MobileFeedNav.tsx` from `/feed`-only to `(portal)/layout.tsx` for research participants:
    1. `Home` (`/feed`)
    2. `Explore` (`/researchers`)
    3. `Compose` (quick post action / navigates to `/feed?compose=1`)
    4. `Nexus` (`/nexus`)
    5. `Alerts` (`/notifications`) — with `Profile` accessible from top-bar avatar or drawer.
  * Slide-in drawer (`Sidebar.tsx`) houses Academic Workspace items (`My Research`, `Supervision`, `Workspaces`, `Publications`, `Opportunities`, `Events`, `Settings`).

---

## 3. Existing Route Disposition Matrix

| Existing Route(s) | Proposed Disposition | Reasoning |
| :--- | :--- | :--- |
| `/feed`, `/feed/[id]`, `/researchers`, `/researchers/[id]`, `/profile`, `/nexus`, `/workspace`, `/workspace/[id]`, `/my-research`, `/my-scholars`, `/publications`, `/opportunities`, `/events`, `/notifications`, `/settings`, `/help` | **Remain (Primary)** | Core Researcher Network & Academic Workspace destinations. |
| `/admin/*` (17 active governance pages) | **Remain (Admin Only)** | Core Institutional Governance console. |
| `/supervisor` | **Merge into `/my-scholars` & Redirect** | Supervisor KPIs (`SupervisorOverview`) belong at the top of `/my-scholars` so supervisors land on `/feed` and have one unified Supervision hub. |
| `/chat` | **Redirect -> `/nexus`** | Duplicates `CuriousNexusHub`. |
| `/dashboard`, `/scholar`, `/reports`, `/approval-requests` | **Keep as Redirects (Review Retirement)** | Legacy role-routing aliases; safe to keep as server redirects until all notification `actionUrl`s are verified. |
| `/supervisor/{scholars,workspaces,requests,approval-requests,settings}` | **Keep as Redirects** (keep `/supervisor/requests/[id]` & `/supervisor/approval-requests/[id]` or alias to `/my-scholars`) | Already redirect to `/my-scholars`, `/workspace`, `/settings`. |
| `/admin/approval-requests`, `/institute-admin/*` | **Keep as Redirects** | Already redirect to `/admin/dashboard` / `/admin/users`. |
| `/feed/post/[id]` | **Keep as Redirect -> `/feed/[id]`** | Preserves shared URLs while enforcing login via middleware. |
| `/sso-callback`, `/auth/pending`, `/approval-pending` | **Review & Consolidate** | Redundant status/callback pages alongside `/auth/callback` and `/verification-pending`. |
