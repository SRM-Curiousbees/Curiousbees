# CuriousBees — Project Overview

**Related:** [README.md](./README.md) | [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)

---

## 1. Institutional Research Collaboration Objectives

CuriousBees is designed for the **SRM Institute of Science and Technology (SRMIST)** ecosystem to unify:

1. **Academic Discovery & Discourse:** Give scholars and faculty a dedicated, verified institutional network for sharing research updates, preprints, open questions, and domain discussions.
2. **Structured Ph.D. Supervision:** Digitally track scholar–supervisor pairing, research milestones, progress reports, and collaborative project workspaces.
3. **Institutional Governance:** Provide SRM administrators with centralized user provisioning, campus/faculty/department hierarchy management, content moderation, and event approvals.

## 2. Three Core Product Pillars

### Pillar 1 — Researcher Network (Social Layer)
- **Academic Feed (`/feed`) & Thread Detail (`/feed/[id]`):** Rich research posts (`RESEARCH_UPDATE`, `QUESTION`, `COLLABORATION`, `RESOURCE`, `EVENT`, `PUBLICATION`) with attachments, likes, bookmarks, shares, and nested comments.
- **Researcher Directory (`/researchers`, `/researchers/[id]`):** Filterable directory of active scholars and supervisors by campus, faculty, department, and research domains/topics, with follow relationships and Nexus connection requests.
- **Nexus Collaboration (`/nexus`):** Direct peer-to-peer and project collaboration requests (`ResearchCollabRequest`, `ResearchCollaboration`, `CollaborationMessage`) plus legacy `/chat` alias support.

### Pillar 2 — Academic Workspace (Supervision & Output)
- **My Research (`/my-research`):** Scholar-facing Ph.D./research profile, research milestones (`ResearchMilestone`), activity timeline (`ResearchActivity`), external academic links (`ORCID`, `Google Scholar`), and supervisor assignment requests (`ScholarSupervisorRequest`).
- **Supervisor Workspace (`/supervisor`, `/my-scholars`):** Supervisor dashboard for reviewing incoming scholar requests, monitoring assigned scholars' milestones/reports, and managing research workspaces.
- **Project Workspaces (`/workspace`, `/workspace/[id]`):** Shared research rooms with member management, milestone tracking, announcements, and AWS S3-backed file sharing (`WorkspaceFile`).
- **Publications, Opportunities & Events (`/publications`, `/opportunities`, `/events`):** Institutional publication registry, research opportunities board, and campus/academic events calendar.

### Pillar 3 — Institutional Governance (Admin Console)
- **Role Separation:** `INSTITUTE_ADMIN` users manage institutional structure and moderation, and are explicitly blocked from participating in social/research actions (`ResearchParticipantGuard`).
- **Directory & Hierarchy (`/admin/users`, `/admin/campuses`, `/admin/faculties-departments`):** Admin-managed user provisioning, role assignment, suspension/deactivation, and SRM campus/faculty/department structure.
- **Moderation & Operations (`/admin/moderation`, `/admin/posts`, `/admin/event-inbox`, `/admin/announcements`, `/admin/audit`, `/admin/email-delivery`, `/admin/settings`):** Report triage, post hiding/restoration, n8n ingested event review, system announcements, immutable audit log viewer, and email configuration status.

## 3. Role-Based Workflows

### Research Scholar (`RESEARCH_SCHOLAR`)
1. Signs in via Google OAuth (`@srmist.edu.in` or configured `ALLOWED_EMAIL_DOMAINS`) after admin provisioning.
2. Completes academic onboarding (`/onboarding`) with campus, faculty, department, and research interests/domains/topics.
3. Requests a supervisor, logs `My Research` milestones, collaborates in `/workspace`, posts updates on `/feed`, and submits publications.

### Research Supervisor (`RESEARCH_SUPERVISOR`)
1. Signs in as an admin-provisioned supervisor.
2. Reviews and approves/rejects scholar supervision requests (`/supervisor`, `/my-scholars`).
3. Creates shared `/workspace` rooms, monitors scholar progress reports, publishes/edits own events (`/events`), and engages in `/feed` discussions.

### Institute Administrator (`INSTITUTE_ADMIN`)
1. Bootstrapped via `seed-production.ts` (`BOOTSTRAP_ADMIN_EMAIL`) or promoted by an existing admin.
2. Provisions scholars/supervisors, manages campuses/faculties/departments, moderates flagged posts/comments, approves or rejects events (including n8n-ingested events), and audits platform activity.

## 4. Main Application Modules (`apps/api/src`)

| Module | Responsibility |
| :--- | :--- |
| `auth` | Supabase JWT verification (`SupabaseAuthGuard`), role & status enforcement (`ApprovedGuard`, `RolesGuard`, `ResearchParticipantGuard`), email domain policy |
| `users`, `onboarding`, `departments`, `faculties`, `campuses` | Profiles, public researcher discovery, onboarding, SRM academic hierarchy |
| `feed`, `threads`, `comments`, `search` | Feed aggregation, post CRUD, public share links, comments, optional OpenSearch integration |
| `collaborations`, `workspaces`, `files` | Nexus collaboration requests/messages, workspaces, AWS S3 presigned URLs |
| `my-research`, `supervisors`, `supervisor-requests`, `reports`, `publications`, `opportunities` | Scholar lifecycle, supervision requests, progress reports, publications, opportunities |
| `events`, `event-ingestion` | Campus events CRUD/review, n8n HMAC/token-authenticated event ingestion |
| `notifications`, `announcements`, `integrations` | In-app notifications, daily digest cron (`ENABLE_CRON`), announcements, Google Workspace integration |
| `admin` | User provisioning, moderation, analytics, audit logs, settings |

## 5. Implemented Capabilities vs. Planned Capabilities

| Status | Capabilities |
| :--- | :--- |
| **Implemented (Core)** | Supabase + Google OAuth admin-managed auth; 3-role RBAC + separation of duties; Research feed, threads, comments, likes, bookmarks, shares; Researcher directory & follows; Nexus collaboration & workspaces with S3 presigned uploads; My Research milestones & supervisor workflows; Publications, Events, Opportunities; Admin governance & AuditLog; n8n event ingestion. |
| **Partial / Deferred** | Server-side cursor pagination & `For you`/`Following` server-side ranking on `/feed` (currently client-filtered over fetched page); `@mentions`, repost/quote-post, and profile `Posts` tab; Web Push / OneSignal provider (`sendPushToUser` is a disabled stub); OpenSearch (optional; falls back to Prisma DB queries when `OPENSEARCH_ENDPOINT` is unset). |
| **Pending Live Verification** | End-to-end execution against SRM's live Supabase PostgreSQL instance and AWS S3 bucket, plus k6 load testing against `500` / `2,500` / `5,000` concurrent targets. |

See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) for the complete breakdown.
