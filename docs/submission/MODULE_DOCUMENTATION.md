# CuriousBees — Module Documentation

Every module below reflects verified code in `apps/web/src` and `apps/api/src`.

---

## 1. Researcher Network & Feed (`ThreadsModule`, `FeedModule`, `CommentsModule`)
- **Purpose:** Academic microblogging timeline for sharing research updates, papers, questions, and discussions.
- **Capabilities:** 8 `ThreadType`s, `Latest`/`Top` sort, type filter pills, `For you`/`Following`/`Discover` tabs, S3 attachments (`<= 10 MB`), likes, nested replies (depth 3), bookmarks, external share links, and content reporting.
- **Frontend:** `/feed`, `/feed/[id]`, `/feed/post/[id]`, `CompactComposer`, `ResearchPostCard`, `FeedComments`, `ShareModal`.
- **Backend:** `ThreadsController`, `ThreadsPublicController`, `ThreadsService`, `FeedController`, `FeedService`, `CommentsController`, `CommentsService`.
- **Models:** `Thread`, `ThreadAttachment`, `ThreadLike`, `ThreadShare`, `ThreadReport`, `SavedThread`, `Comment`, `CommentLike`, `ModerationReport`.
- **Permissions:** Read by approved users (`GET /threads` also readable by `INSTITUTE_ADMIN`); writes guarded by `ResearchParticipantGuard`.
- **Status & Limitations:** Core CRUD/interactions implemented and unit-tested; `For you`/`Following` tabs filter client-side over the fetched page; no "Load more" pagination, reposts, or `@mentions` yet; `ThreadsPublicController` remains unauthenticated.

## 2. Researcher Discovery & Social Graph (`UsersModule`, `SearchModule`)
- **Purpose:** Discover SRM researchers, supervisors, and trending research areas.
- **Capabilities:** Filter researchers by campus, faculty, department, role, and interest; alignment score & supervisor capacity; follow/unfollow researchers, domains, and topics; `Suggested Peers` & `Trending Research`.
- **Frontend:** `/researchers`, `ResearchDiscoverySidebar`, `SpotlightSearch` (`⌘K`).
- **Backend:** `UsersController`, `UsersService`, `FeedController` (`/feed/search`, `/feed/peers`, `/feed/trending`), `SearchService`.
- **Models:** `User`, `UserFollow`, `DomainFollow`, `TopicFollow`, `ResearchInterest`, `ResearchDomain`, `ResearchTopic`.
- **Permissions:** `SupabaseAuthGuard`; follow mutations guarded by `ResearchParticipantGuard`; `INSTITUTE_ADMIN` excluded from discovery.
- **Status & Limitations:** Implemented; `getResearchers` hardened to active non-suspended users; `SpotlightSearch` searches client cache unless clicking through to `/feed`.

## 3. User Profiles (`/profile`, `/researchers/[id]`)
- **Purpose:** Academic identity showcasing bio, department, thesis/supervision links, publications, and ORCID/Scholar links.
- **Frontend:** `/profile`, `/researchers/[id]`, `AcademicProfileView`, `EditResearcherProfileDrawer`, `ProfessionalLinksEditor`.
- **Backend:** `UsersController` (`GET /users/profile`, `GET /users/:id/profile`, `PUT/PATCH /users/profile`, external links).
- **Models:** `User`, `SupervisorProfile`, `ScholarProfile`, `ResearcherExternalLink`.
- **Permissions:** Self-profile returns full owner fields; viewing another researcher routes to `getPublicProfile` (no `email`, `employeeId`, or hidden publications).
- **Status & Limitations:** Implemented; lacks a researcher "Posts" history tab and Followers/Following list drawer in UI.

## 4. My Research (`MyResearchModule`)
- **Purpose:** Scholar's doctoral lifecycle tracker.
- **Capabilities:** Manage thesis title, abstract, `ResearchStage` (`PROPOSAL` -> `THESIS_PUBLICATION`), milestones, and activity log; submit progress reports.
- **Frontend:** `/my-research`, `ResearchLifecycle`.
- **Backend:** `MyResearchController`, `MyResearchService`, `ReportsController`.
- **Models:** `ResearchProfile`, `ResearchMilestone`, `ResearchActivity`, `Report`.
- **Permissions:** `@Roles(Role.RESEARCH_SCHOLAR)` on `MyResearchController`.
- **Status:** Implemented.

## 5. Supervision (`SupervisorRequestsModule`, `ReportsModule`, `SupervisorsModule`)
- **Purpose:** Scholar-to-supervisor matching, capacity-checked approvals, and progress report review.
- **Frontend:** `/supervisor`, `/my-scholars`, `/supervisor/requests/[id]`, `/supervisor/approval-requests/[id]`, `SupervisorOverview`.
- **Backend:** `RequestsController` (`/supervisor-requests`), `ReportsController` (`/reports`), legacy `SupervisorsController` (`/supervisor/pending-scholars`).
- **Models:** `ScholarSupervisorRequest`, `SupervisorProfile`, `Report`.
- **Permissions:** Scholars submit requests & reports; Supervisors approve/reject requests and review reports; Admins can reassign supervisors.
- **Status & Limitations:** Implemented; legacy `SupervisorsController` coexists with `RequestsController`.

## 6. Curious Nexus & Workspaces (`CollaborationsModule`, `WorkspacesModule`, `IntegrationsModule`)
- **Purpose:** Consented 1:1 research messaging escalating into shared project workspaces.
- **Capabilities:** Send/accept/decline/cancel collaboration requests, 1:1 messages, batch status lookup (`GET /api/collaborations/statuses`), workspace members, S3 files (`<= 50 MB`), milestones, announcements, Google Meet/Chat links.
- **Frontend:** `/nexus`, `/chat` (alias), `/workspace`, `/workspace/[id]`, `CuriousNexusHub`, `CreateWorkspaceModal`.
- **Backend:** `CollaborationsController`, `WorkspacesController`, `MeetingsController`, `WorkspaceCollaborationController`, `IntegrationsController`.
- **Models:** `ResearchCollabRequest`, `ResearchCollaboration`, `CollaborationMessage`, `Workspace`, `WorkspaceMember`, `WorkspaceFile`, `WorkspaceMilestone`, `WorkspaceAnnouncement`, `ResearchMeeting`, `IntegrationConnection`.
- **Permissions:** `ResearchParticipantGuard` + workspace membership checks on file upload/download.
- **Status & Limitations:** Implemented; no real-time WebSocket/polling for messages yet.

## 7. Publications, Opportunities & Events
- **Publications (`/publications`):** `PublicationsController`/`Service` (`Publication` model); `POST`/`PUT`/`DELETE` guarded by `ResearchParticipantGuard` + owner check; public author projection omits `email`.
- **Opportunities (`/opportunities`):** `OpportunitiesController`/`Service` (`Opportunity`, `CollaborationRequest`); `POST`/`PUT`/`DELETE`/join guarded by `ResearchParticipantGuard`.
- **Events (`/events`):** `EventsController`/`Service`, `EventIngestionModule` (`Event`, `EventIngestion`); `POST`/`PUT` restricted to `INSTITUTE_ADMIN` & `RESEARCH_SUPERVISOR` (own events), `review`/`status`/`DELETE` restricted to `INSTITUTE_ADMIN`.

## 8. Notifications (`NotificationsModule`)
- **Purpose:** In-app notification bell & preferences.
- **Frontend:** `/notifications`, `NotificationDropdown`, `PushNotificationPrompt` (now no-op after removing mock simulator).
- **Backend:** `NotificationsController`, `NotificationsService`, `DigestScheduler`.
- **Models:** `Notification`, `NotificationLog`, `NotificationToken`, `UserPreference`.
- **Status & Limitations:** In-app DB notifications implemented; browser push provider is disabled.

## 9. Administration, Governance & Moderation (`AdminModule`, `AnnouncementsModule`)
- **Purpose:** Institutional oversight, provisioning, hierarchy, and content moderation.
- **Frontend:** `/admin/*` (18 pages).
- **Backend:** 13 controllers under `apps/api/src/admin/` (`AdminUsersController`, `AdminInstitutionController`, `AdminContentController`, `AdminModerationController`, `AdminAuditController`, `AdminAnalyticsController`, `AdminSettingsController`, etc.) + `AnnouncementsController`.
- **Models:** `AuditLog`, `ModerationReport`, `SystemSetting`, `SystemAnnouncement`, `Campus`, `Faculty`, `Department`.
- **Permissions:** Strictly `@Roles(Role.INSTITUTE_ADMIN)`.
- **Status:** Implemented; `ThreadsService.reportThread` now creates `ModerationReport` entries visible in `/admin/moderation`.
