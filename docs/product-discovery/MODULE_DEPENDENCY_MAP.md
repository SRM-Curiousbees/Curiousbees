# CuriousBees — Module Dependency Map

**Audit Type:** Read-Only Dependency Analysis (Frontend -> Backend -> Database -> Notifications/Automation)

---

## 1. Core Social & Networking Modules

| Module | Frontend Routes & Components | Backend Modules & Controllers | Prisma Models | Downstream / Cross-Module Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **Feed & Threads** | `/feed`, `/feed/[id]`, `/feed/post/[id]`, `CompactComposer`, `ResearchPostCard`, `FeedComments`, `ShareModal`, `ResearchDiscoverySidebar` | `ThreadsModule` (`ThreadsController`, `ThreadsPublicController`), `FeedModule` (`FeedController`), `CommentsModule` (`CommentsController`) | `Thread`, `ThreadAttachment`, `ThreadLike`, `ThreadShare`, `ThreadReport`, `SavedThread`, `Comment`, `CommentLike` | `FilesModule` (S3 presigned post attachments), `NotificationsModule` (like/comment alerts), `CollaborationsModule` (`ResearchPostCard` fetches `collabStatuses`), `AdminContentModule` (`hidden` moderation) |
| **Researchers & Social Graph** | `/researchers`, `/researchers/[id]`, `/profile`, `AcademicProfileView`, `ResearcherProfileModal` | `UsersModule` (`UsersController`), `ResearchDomainsModule` | `User`, `UserFollow`, `DomainFollow`, `TopicFollow`, `ResearchConnection`, `ResearcherExternalLink`, `ResearchInterest`, `ResearchDomain`, `ResearchTopic` | `FeedModule` (peers/trending), `SupervisorRequestsModule` (`RequestSupervisorModal` on supervisor profile), `SupervisorsModule` |
| **Curious Nexus & Workspaces** | `/nexus`, `/chat`, `/workspace`, `/workspace/[id]`, `CuriousNexusHub`, `CreateWorkspaceModal`, `WorkspaceFileDownloadButton` | `CollaborationsModule`, `WorkspacesModule`, `IntegrationsModule` (`MeetingsController`, `WorkspaceCollaborationController`) | `ResearchCollabRequest`, `ResearchCollaboration`, `CollaborationMessage`, `CollaborationRequest`, `Workspace`, `WorkspaceMember`, `WorkspaceFile`, `WorkspaceMilestone`, `WorkspaceAnnouncement`, `ResearchMeeting`, `IntegrationConnection` | `FilesModule` (S3 workspace files), `NotificationsModule`, `ThreadsModule` (post-originated collabs), `OpportunitiesModule` (opportunity join requests), `Google Workspace OAuth` |

---

## 2. Academic Governance, Supervision & Institutional Modules

| Module | Frontend Routes & Components | Backend Modules & Controllers | Prisma Models | Dependencies & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Supervision & My Research** | `/my-research`, `/my-scholars`, `/supervisor`, `/supervisor/requests/[id]`, `/supervisor/approval-requests/[id]`, `SupervisorOverview`, `ResearchLifecycle` | `MyResearchModule`, `SupervisorRequestsModule`, `ReportsModule`, `SupervisorsModule` (legacy) | `ResearchProfile`, `ResearchMilestone`, `ResearchActivity`, `ScholarSupervisorRequest`, `Report`, `SupervisorProfile`, `ScholarProfile` | `OnboardingModule` (creates initial `ScholarSupervisorRequest`), `NotificationsModule`, `MailService` (Brevo emails), `AdminScholarsModule` (reassignment). **Note:** `SupervisorsController` (`/supervisor/pending-scholars`) is still called by `useStore.ts:3058` even though `SupervisorRequestsController` handles the main flow. |
| **Opportunities & Events** | `/opportunities`, `/events`, `PremiumOpportunities`, `PremiumEvents`, `PremiumCalendarWidget`, `EventDetailModal`, `SRMVenueSelector` | `OpportunitiesModule`, `EventsModule`, `EventIngestionModule` (`N8nEventsController`, `AdminEventIngestionController`) | `Opportunity`, `CollaborationRequest`, `Event`, `EventIngestion` | `NotificationsModule`, `InterestMatcherService`, `n8n` Gmail workflow (`integrations/n8n/event-ingestion`), `Admin` event inbox (`/admin/event-inbox`). |
| **Publications** | `/publications`, `/admin/publications` | `PublicationsModule`, `AdminContentModule` | `Publication` | `AcademicProfileView` (renders researcher publications), `FeedService.searchFeed` (searches publications). |
| **Admin Governance** | `/admin/*` (18 pages) | `AdminModule` (13 controllers), `AnnouncementsModule`, `FacultiesModule`, `DepartmentsModule` | `AuditLog`, `ModerationReport`, `SystemSetting`, `SystemAnnouncement`, `Campus`, `Faculty`, `Department` | `User` provisioning feeds `SupabaseAuthGuard`; `Department`/`Faculty` feeds `Onboarding`, `Researchers`, `Events`, `Opportunities`. |

---

## 3. Potentially Removable / Mergeable / Relocatable Items (Verified Dependencies)

| Item | Current Status | Dependencies Found Before Any Removal | Safe Recommendation (For Future Phase) |
| :--- | :--- | :--- | :--- |
| **`apps/api/src/gmail-ingestion/`** | Empty directory (`0` files) | Zero imports in `app.module.ts` or anywhere else. | Safe to delete directory. |
| **`/chat` route** | Duplicates `/nexus` (`CuriousNexusHub`) | Listed in `ROLE_PERMISSIONS` (`permissions.ts:53,72`). Check any email/notification links before removing. | Keep as redirect to `/nexus` or merge. |
| **Legacy Redirect Pages** (`/dashboard`, `/scholar`, `/reports`, `/approval-requests`, `/supervisor/{scholars,workspaces,requests,approval-requests,settings}`, `/admin/approval-requests`, `/institute-admin/*`) | Client-side `router.replace()` wrappers | Referenced in older bookmarks, `permissions.ts`, and `alsoMatches` in `navigation.ts`. | Keep lightweight server/client redirects or consolidate only after updating all `actionUrl`s. |
| **`PushNotificationPrompt.tsx`** | Mounted in `PortalLayout` | Calls no backend API; fires fake `setInterval` mock notifications when tab hidden. | Remove mock `setInterval` simulator before production use. |
| **`SupervisorsController` (`/supervisor/pending-scholars`)** | Legacy approval endpoints | Still called in `useStore.ts:3058`. | Migrate `useStore.ts` to `/api/supervisor-requests` before removing. |
