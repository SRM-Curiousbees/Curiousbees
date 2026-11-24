# CuriousBees — Complete Current Product Inventory

**Audit Type:** Read-Only Codebase Discovery  
**Scope:** `apps/web` (73 `page.tsx` pages + 2 `route.ts` handlers = 75 App Router routes), `apps/api` (39 controllers across 27 modules), `packages/*`, `apps/api/prisma/schema.prisma`.

---

## 1. Navigation Architecture (Desktop vs. Mobile)

- **Desktop & Tablet (`lg+`)** — [Sidebar.tsx](file:///Users/matheshwaran/Projects/CuriousBees/apps/web/src/components/dashboard/Sidebar.tsx) + [Navbar.tsx](file:///Users/matheshwaran/Projects/CuriousBees/apps/web/src/components/dashboard/Navbar.tsx) + [navigation.ts](file:///Users/matheshwaran/Projects/CuriousBees/apps/web/src/lib/navigation.ts):
  - **Persistent left sidebar** (`getNavSections(role)`), role-switched between `INSTITUTE_ADMIN` (19 nav items across 7 sections), `RESEARCH_SUPERVISOR` (10 nav items across 3 sections), and `RESEARCH_SCHOLAR` (9 nav items across 3 sections).
  - **Top bar (`Navbar.tsx`):** Displays breadcrumb context (`findNavContext`), `⌘K` [SpotlightSearch](file:///Users/matheshwaran/Projects/CuriousBees/apps/web/src/components/SpotlightSearch.tsx) (hidden for `INSTITUTE_ADMIN`), [NotificationDropdown](file:///Users/matheshwaran/Projects/CuriousBees/apps/web/src/components/shared/notification-dropdown.tsx), and [ProfileDropdown](file:///Users/matheshwaran/Projects/CuriousBees/apps/web/src/components/shared/profile-dropdown.tsx).
- **Mobile (`< lg` / `< md`):**
  - Left sidebar collapses into a slide-in drawer toggled from the top-bar hamburger menu.
  - On `/feed` only, [MobileFeedNav.tsx](file:///Users/matheshwaran/Projects/CuriousBees/apps/web/src/components/feed/MobileFeedNav.tsx) adds a fixed bottom tab bar (`Feed`, `Explore` -> `/researchers`, `Write a post` FAB, `Alerts` -> `/notifications`, `Profile` -> `/profile`). Other portal pages do not render a bottom bar.

---

## 2. Complete Frontend Route & Page Inventory (75 Routes)

### 2.1 Public Marketing & Legal Pages (`apps/web/src/app/(marketing)/` — 9 pages)
| Route | Purpose | Allowed Roles | Status |
| :--- | :--- | :--- | :--- |
| `/` | Landing page (Hero, Story, Roles, Workflow, FAQ, CTA) | Public | Complete |
| `/about`, `/research`, `/education`, `/institution`, `/ethics-framework`, `/contact`, `/privacy-policy`, `/terms-of-service` | Institutional marketing, ethics & legal info (`MarketingPage` + marketing components) | Public | Complete |

### 2.2 Auth, Onboarding & Status Screens (17 routes)
| Route | Purpose | Key APIs / Components | Status |
| :--- | :--- | :--- | :--- |
| `/login` | Google OAuth sign-in via Supabase | Supabase Auth | Complete |
| `/auth/callback` (`route.ts`) | Exchanges OAuth code for session cookie | Supabase SSR | Complete |
| `/onboarding` | 2-step onboarding: research areas, department (if unset), supervisor selection (scholars) | `GET /api/departments/:id`, `GET /api/users/supervisors`, `POST /api/onboarding/*` | Complete |
| `/verification-pending` | Polls every 5s (`setInterval`) while awaiting supervisor approval | `GET /api/auth/me` | Complete |
| `/approval-pending`, `/awaiting-supervisor-approval`, `/account-rejected`, `/access-denied`, `/account-suspended`, `/not-provisioned`, `/auth/denied`, `/auth/pending`, `/auth/unauthorized`, `/unauthorized`, `/error`, `/sso-callback` | Status/error screens & legacy auth redirects (`StatusScreen` UI) | `GET /api/auth/me` | Complete (some redundant legacy aliases: `/sso-callback`, `/auth/pending`, `/approval-pending`) |
| `/healthz` (`route.ts`) | Frontend health probe | None | Complete |

### 2.3 Research Social & Collaboration Portal (`apps/web/src/app/(portal)/` — Scholar & Supervisor)

| Page & Route | Purpose | Available Actions | Allowed Roles (Middleware + `permissions.ts`) | Key APIs & Components | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Research Feed** (`/feed`) | Main X/Threads-style feed | Search, switch `For you`/`Following`/`Discover`, filter by post type, compose post + S3 attachment, like, comment/reply, bookmark, share link, report, edit/delete own, follow author, request collab | Scholar, Supervisor | `GET/POST/PUT/DELETE /api/threads*`, `GET /api/feed/*`, `GET/POST /api/comments*`, `CompactComposer`, `ResearchPostCard`, `FeedComments`, `ResearchDiscoverySidebar`, `ShareModal`, `EditPostModal`, `ReportPostModal`, `ConfirmDeleteModal`, `ResearcherProfileModal`, `MobileFeedNav` | Complete (client-side tab filtering/scoring; no load-more pagination) |
| **Post Detail** (`/feed/[id]`) | Single post + expanded comments | All card actions + full comment thread | Scholar, Supervisor | `GET /api/threads/:id`, `ResearchPostCard` (`defaultShowComments`) | Complete |
| **Shared Post Redirect** (`/feed/post/[id]`) | Legacy public link redirect | Redirects to `/feed/[id]` (auth required) | Public -> Portal | Server `redirect()` | Complete (redirect) |
| **Researchers Directory** (`/researchers`) | Browse/search SRM researchers & supervisors | Filter by query, role, campus, faculty, department, interest; follow/unfollow; request supervision/collab | Scholar, Supervisor | `GET /api/users/researchers`, `POST/DELETE /api/users/:id/follow`, `useResearchers` | Complete |
| **Researcher Profile** (`/researchers/[id]`) | View another researcher's academic profile | View bio, publications, research profile, supervisor/scholars, external links, follow, request collab/supervision | Scholar, Supervisor | `GET /api/users/:id/profile`, `AcademicProfileView`, `RequestSupervisorModal` | Complete |
| **Own Profile** (`/profile`) | View & edit own academic profile | Edit bio, interests, external links, avatar | Scholar, Supervisor | `GET/PUT /api/users/profile`, `AcademicProfileView`, `EditResearcherProfileDrawer`, `ProfessionalLinksEditor` | Complete |
| **My Research** (`/my-research`) | Scholar's doctoral thesis lifecycle, milestones & progress reports | Update thesis title/stage, add/complete milestones, submit progress reports | Scholar | `GET/PATCH /api/my-research*`, `GET/POST /api/reports`, `ResearchLifecycle` | Complete |
| **Supervisor Overview** (`/supervisor`) | Supervisor landing dashboard | View scholar capacity, pending requests, recent reports | Supervisor | `SupervisorOverview` | Complete |
| **Supervision Panel** (`/my-scholars`) | Manage supervised scholars, requests & progress reports | Approve/reject scholar requests, review/feedback progress reports | Supervisor | `GET/PUT /api/supervisor-requests*`, `GET/PUT /api/reports*`, `GET /api/users/my-scholars` | Complete |
| **Supervisor Detail / Redirects** (`/supervisor/requests`, `/supervisor/requests/[id]`, `/supervisor/approval-requests`, `/supervisor/approval-requests/[id]`, `/supervisor/scholars`, `/supervisor/workspaces`, `/supervisor/settings`) | Request detail views + legacy redirects | Approve/reject specific request; others redirect to `/my-scholars`, `/workspace`, `/settings` | Supervisor | `/api/supervisor-requests/:id` | Detail pages complete; 5 are redirect/wrapper aliases |
| **Curious Nexus** (`/nexus`) & **Workspaces** (`/workspace`, `/workspace/[id]`) | Collaboration DMs & shared project sandboxes | Send/accept collab requests, 1:1 messages, create workspace, upload/download S3 files, milestones, Google Meet/Chat links | Scholar, Supervisor | `/api/collaborations*`, `/api/workspaces*`, `/api/integrations*`, `CuriousNexusHub`, `CreateWorkspaceModal`, `WorkspaceFileDownloadButton` | Complete |
| **Chat Alias** (`/chat`) | Legacy route rendering `CuriousNexusHub` (`messages`) | Same as `/nexus` | Scholar, Supervisor | `CuriousNexusHub` | Duplicate alias of `/nexus` |
| **Publications** (`/publications`) | Scholarly publications registry | Add, edit, delete own publications; browse | Scholar, Supervisor | `GET/POST/PUT/DELETE /api/publications*` | Complete |
| **Events** (`/events`) | Institutional academic events calendar | Browse/filter events, create event | Scholar, Supervisor | `GET/POST /api/events*`, `PremiumEvents`, `PremiumCalendarWidget`, `EventDetailModal`, `SRMVenueSelector` | Complete |
| **Opportunities** (`/opportunities`) | Research openings & fellowships board | Browse, post (supervisor), apply/request to join | Scholar, Supervisor | `GET/POST/PUT/DELETE /api/opportunities*`, `PremiumOpportunities` | Complete |
| **Notifications** (`/notifications`) | Full notification center | View alerts, mark read / mark all read | All 3 roles | `GET/PUT /api/notifications*` | Complete |
| **Settings** (`/settings`, `/settings/integrations/callback`) | Account preferences, feed display prefs, Google Workspace OAuth callback | Toggle compact cards/auto-abstracts/default sort, connect Google Workspace | All 3 roles | `/api/notifications/preferences`, `/api/integrations/*` | Complete |
| **Help** (`/help`) | Documentation & platform help | Read-only guidance | All 3 roles | Static UI | Complete |
| **Legacy Redirects** (`/dashboard`, `/scholar`, `/reports`, `/approval-requests`) | Role-based redirects to `/feed`, `/supervisor`, `/admin/dashboard`, `/my-research`, `/my-scholars` | Redirect only | Role-dependent | Client `router.replace()` | Legacy aliases |

### 2.4 Institute Admin Governance Portal (`/admin/*` — 18 pages + 2 legacy `/institute-admin/*` redirects)
- `/admin/dashboard`: Institutional KPIs & quick governance links (`GET /api/admin/dashboard`).
- `/admin/users` (tabs: `SCHOLARS`, `SUPERVISORS`, `ADMINS`, `SUSPENDED`): Provision accounts, bulk CSV import, suspend/reactivate, reassign supervisors (`AdminUsersController`, `AdminScholarsController`, `AdminSupervisorsController`, `AdminAdminsController`).
- `/admin/roles-permissions`: View role permission matrix (`AdminRolesController`).
- `/admin/faculties-departments`, `/admin/campuses`: Manage SRM campuses, faculties & departments (`AdminInstitutionController`).
- `/admin/research-activity`, `/admin/scholar-requests`, `/admin/research-workspaces`, `/admin/publications`: Read-only institutional oversight (`AdminResearchGovernanceController`, `AdminContentController`).
- `/admin/posts`, `/admin/moderation`: Hide/restore/delete posts & resolve/dismiss moderation reports (`AdminContentController`, `AdminModerationController`).
- `/admin/announcements`, `/admin/email-delivery`, `/admin/event-inbox`: Broadcast announcements (`AnnouncementsController`), track email logs, review n8n-ingested Gmail events (`AdminEventIngestionController`).
- `/admin/analytics`, `/admin/audit`, `/admin/settings`: Institutional analytics, immutable `AuditLog` explorer, `SystemSetting` editor.
- `/admin/approval-requests`, `/institute-admin/dashboard`, `/institute-admin/user-management`: Redirects to `/admin/dashboard` / `/admin/users`.

---

## 3. Incomplete / Disconnected / Apparently Unused Items Verified in Code

1. **`PushNotificationPrompt.tsx` (Mounted in `PortalLayout`):** When browser notifications are granted and the tab is hidden, it runs a `setInterval` generating **hardcoded mock notifications** (`"Dr. Jane Du"`, `"Arjun Kumar"`), while backend `NotificationsService.sendPushToUser` is explicitly disabled (`"Push provider removed"`).
2. **`apps/api/src/gmail-ingestion/`:** Completely empty directory (`0` files); superseded by `apps/api/src/event-ingestion/`.
3. **Duplicate/Legacy Routes:** `/chat` duplicates `/nexus`; `/dashboard`, `/scholar`, `/reports`, `/approval-requests`, `/supervisor/{scholars,workspaces,requests,approval-requests,settings}`, `/admin/approval-requests`, and `/institute-admin/*` are legacy redirects/wrappers.
4. **Disconnected Reporting Tables:** `ThreadsService.reportThread` writes to `ThreadReport`, whereas `AdminModerationService` (`/admin/moderation/reports`) reads `ModerationReport`.
