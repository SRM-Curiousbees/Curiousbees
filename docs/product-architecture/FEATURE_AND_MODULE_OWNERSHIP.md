# CuriousBees — Feature & Module Ownership Matrix

**Phase:** Phase 0 — Product Architecture & Experience Blueprint  
**Note:** Distinguishes frontend navigation relocation from backend module/model removal. No database table is deleted merely because a frontend route is relocated.

---

## 1. Module Ownership & Disposition

| Existing Module / Feature | Proposed Product Area | Disposition | Verified Dependencies (FE / BE / DB) | Reasoning |
| :--- | :--- | :--- | :--- | :--- |
| **Feed & Threads** (`ThreadsModule`, `FeedModule`, `/feed`) | Researcher Network | **Keep & Enhance** | `/feed`, `/feed/[id]`, `ThreadsController`, `FeedController`, `FilesModule`, `NotificationsModule`, `Thread*` tables | Core X-style timeline; needs server-side `For you`/`Following`, cursor pagination, reposts, `@mentions`. |
| **Comments** (`CommentsModule`, `FeedComments`) | Researcher Network | **Keep & Enhance** | `CommentsController`, `Comment`, `CommentLike` | Nested replies work well; add `@mentions` support. |
| **Researchers & Social Graph** (`UsersModule`, `/researchers`, `/profile`) | Researcher Network | **Keep & Enhance** | `/researchers`, `/researchers/[id]`, `/profile`, `UserFollow`, `DomainFollow`, `TopicFollow` | Add Posts tab on profiles, Followers/Following drawer, and privacy-safe `@mention` autocomplete. |
| **Curious Nexus** (`CollaborationsModule`, `/nexus`) | Researcher Network / Academic Workspace Bridge | **Keep & Enhance** | `CuriousNexusHub`, `ResearchCollabRequest`, `ResearchCollaboration`, `CollaborationMessage`, `Workspace` | Intentional collaboration-gated DM; add visibility-aware polling + batch `collabStatuses`. |
| **`/chat` route** | Researcher Network | **Relocate / Redirect -> `/nexus`** | `app/(portal)/chat/page.tsx` renders `CuriousNexusHub` | Exact duplicate of `/nexus`; keep route as redirect to preserve links. |
| **`ResearchConnection`** (`POST /users/:id/connect`) | Legacy Social Graph | **Investigate / Merge into `UserFollow` or `ResearchCollabRequest`** | `UsersService.getCollaborators`, `discovery.spec.ts`, admin delete cascades | Overlaps with `UserFollow` + `ResearchCollabRequest`; audit if any active UI still uses `/users/:id/connect` before retiring. |
| **`CollaborationRequest`** (Opportunity + Legacy Thread) | Academic Workspace (`Opportunities`) | **Keep for Opportunities; Retire `POST /threads/:id/collaborate`** | `OpportunitiesService` (active!), `ThreadsService.requestCollaboration` (legacy) | **Do not delete DB model** (`OpportunitiesService` relies on it). Only retire the legacy `POST /threads/:id/collaborate` path once `useStore.ts:1026` is cleaned up. |
| **My Research** (`MyResearchModule`, `/my-research`) | Academic Workspace | **Keep** | `ResearchLifecycle`, `ResearchProfile`, `ResearchMilestone`, `ResearchActivity` | Core scholar thesis tracker. |
| **Supervision Panel** (`/supervisor` + `/my-scholars`) | Academic Workspace | **Merge `/supervisor` into `/my-scholars`** | `SupervisorOverview`, `/my-scholars`, `SupervisorRequestsModule`, `ReportsModule` | Supervisors land on `/feed`; `/my-scholars` becomes the single Supervision hub. |
| **`SupervisorsModule`** (`/supervisor/pending-scholars`) | Academic Workspace | **Merge / Retire after migrating `useStore.ts:3058`** | `SupervisorsController`, `useStore.ts:3058` | Legacy approval API duplicating `SupervisorRequestsModule`. |
| **Workspaces** (`WorkspacesModule`, `IntegrationsModule`, `/workspace`) | Academic Workspace | **Keep** | `Workspace*` tables, `FilesModule` (S3), `ResearchMeeting` | Core shared research sandbox; connects naturally from `/nexus` and `/my-scholars`. |
| **Publications, Opportunities, Events** | Academic Workspace / Discovery | **Keep & Harden Auth** | `PublicationsModule`, `OpportunitiesModule`, `EventsModule`, `EventIngestionModule` | Harden `EventsController` (`RolesGuard`/`ResearchParticipantGuard`) and `PublicationsController` (`ResearchParticipantGuard` on `PUT`/`DELETE`). |
| **Moderation Reporting** (`ThreadReport` vs `ModerationReport`) | Institutional Governance | **Merge / Unify** | `ThreadsService.reportThread` -> `ThreadReport`; `AdminModerationService` -> `ModerationReport` | **Critical bug:** Feed post reports write to `ThreadReport` and never appear in `/admin/moderation` (`ModerationReport`). Route `ThreadsService.reportThread` into `ModerationReport` (backfilling/preserving `ThreadReport` safely). |
| **Fake Push Simulator** (`PushNotificationPrompt.tsx`) | Notifications | **Retire Mock Timer** | Mounted in `PortalLayout`; `NotificationsService.sendPushToUser` disabled | Remove the 15s mock `setInterval` (*"Dr. Jane Du"*, *"Arjun Kumar"*); replace with real visibility-aware polling of `/api/notifications`. |
| **`apps/api/src/gmail-ingestion/`** | — | **Retire** | Empty directory (`0` files, unused) | Superseded by `EventIngestionModule`; safe to remove directory. |
| **Admin Governance** (`AdminModule`, `/admin/*`) | Institutional Governance | **Keep** | 13 controllers, `AuditLog`, `SystemSetting`, `Campus`/`Faculty`/`Department` | Remains strictly separated from researcher participation. |
