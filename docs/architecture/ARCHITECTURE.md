# CuriousBees Architecture Guide & System Design Blueprint

This document provides a comprehensive, authoritative technical overview of the **CuriousBees V2** production platform architecture, runtime components, data flows, and infrastructure capacity models.

---

## 1. System Topology & Architecture

CuriousBees utilizes a decoupled, high-performance, strictly typed client-server architecture:
* **Presentation & Client Layer (`apps/web`):** Next.js 15 App Router with React 19, Zustand state persistence, and React Query caching.
* **API & Business Logic Tier (`apps/api`):** NestJS 11 HTTP REST server with Zod schema validation, Helmet security headers, and compression.
* **Meetings & Realtime Collaboration:** Seamlessly handled via direct **Google Workspace (Google Meet, Google Chat Space)** and **Zoom Workplace** integrations.
* **Identity & Authentication:** Supabase Auth (GoTrue) with Google Workspace OAuth, strictly enforcing institutional email domain filtering (`srmist.edu.in`).
* **Relational Database:** PostgreSQL 15+ managed with Prisma ORM 6.19 and PgBouncer connection pooling.
* **Object & Binary Storage (Fixed):** Amazon Simple Storage Service (Amazon S3) for research papers, thesis PDFs, evidence uploads, and workspace assets.
* **Email & Notifications:** Transactional email alerts dispatched via Brevo REST API, combined with in-app notifications and scheduled event digests.

```mermaid
flowchart TB
    subgraph Clients["End Users & Clients"]
        Scholar["Research Scholars"]
        Supervisor["Research Supervisors"]
        Admin["Institute Admins"]
    end

    subgraph Edge["Edge / CDN & Security Layer"]
        CDN["CloudFront / Edge CDN<br/>• Static Asset Caching (JS, CSS, Images)<br/>• 1 TB/mo Free Egress Tier"]
        DNS["Domain & SSL (Let's Encrypt / ACM)"]
    end

    subgraph Frontend["Frontend Tier (apps/web)"]
        NextJS["Next.js 15.3 (App Router / React 19)<br/>• SSR + Dynamic Client Rendering<br/>• Zustand Global Store & React Query<br/>• Port 3000"]
    end

    subgraph Backend["Backend API Tier (apps/api)"]
        NestREST["NestJS 11 HTTP Server (Port 4000)<br/>• Global Prefix: /api<br/>• Helmet, Compression, Winston<br/>• SupabaseAuthGuard (JWT Bearer)"]
        CronJob["@nestjs/schedule<br/>• DigestScheduler (8:00 AM Cron)"]
        MemProc["In-Memory NotificationProcessor<br/>• Direct Async Worker (No Redis required)"]
    end

    subgraph DataTier["Data & Storage Tier"]
        Pooler["PgBouncer Connection Pooler<br/>• Transaction Pooling"]
        Postgres["PostgreSQL 15+ Database<br/>• Prisma ORM 6.19 (36 Schema Models)<br/>• Indexes & Foreign Keys"]
        S3["Amazon S3 (Fixed Object Storage)<br/>• Research Papers & PDFs<br/>• Workspace Files & Milestone Evidence<br/>• Avatars & Thread Attachments"]
    end

    subgraph ExternalSaaS["Managed Cloud & SaaS Integrations"]
        SupaAuth["Supabase Auth (GoTrue)<br/>• Google OAuth (srmist.edu.in domain)<br/>• User Metadata & JWTs"]
        Brevo["Brevo REST API<br/>• HTTPS: /v3/smtp/email<br/>• Supervision Requests & Alerts"]
        ThirdParty["Google Workspace & Zoom Integrations<br/>• Google Meet Links<br/>• Google Chat Spaces<br/>• Zoom Meetings"]
    end

    Clients --> DNS --> CDN --> NextJS
    NextJS -->|REST API Requests (Bearer JWT)| NestREST
    NestREST -->|Verify Bearer Token| SupaAuth
    NestREST -->|Dispatch Transactional Mail| Brevo
    NestREST -->|Google Meet / Zoom Links| ThirdParty
    NestREST --> Pooler --> Postgres
    CronJob --> Postgres
    MemProc --> Postgres
    NextJS -->|Direct Upload / Presigned URLs| S3
    NestREST -->|File URLs & Metadata Storage| Postgres
```

---

## 2. Frontend Architecture (`apps/web`)

* **Framework:** Next.js 15.3.0 utilizing React 19 (Server Components + Client Components mix).
* **State Management:** Zustand (`apps/web/src/store/useStore.ts`) handles global UI caching and session persistence. API responses are selectively cached using `@tanstack/react-query` 5.100.14.
* **API Communications:** Outgoing requests utilize a unified client wrapper `apiFetch` (`apps/web/src/lib/api-client.ts`), which automatically fetches and attaches the Supabase Bearer JWT.
* **Collaboration & Meetings:** Direct integrations with **Google Workspace (Google Meet, Google Chat)** and **Zoom Workplace** for audio/video conferencing and persistent group channels.
* **UI & Design System:** Styled with Tailwind CSS 3.4, Framer Motion animations, Lucide icons, Recharts for analytics, FullCalendar for events, and `@react-three/fiber` for interactive 3D elements.

---

## 3. Backend Architecture (`apps/api`)

* **Framework:** NestJS 11.1.24 configured with modular domain architecture on Express.
* **Dependency Injection Modules:**
  - `AuthModule`: Supabase JWT verification, user auto-provisioning, domain checking, role guards.
  - `UsersModule` & `MailService`: Profile management and Brevo transactional email delivery.
  - `ThreadsModule` & `CommentsModule`: Academic discussions, papers, tags, likes, saves, reports.
  - `WorkspacesModule`: Milestone management, shared files, announcements.
  - `CollaborationsModule`: Peer collaboration requests, project linking, message history.
  - `MyResearchModule`: Doctoral milestones, research stages, materials, activities.
  - `PublicationsModule`: DOI tracking, citations, publication lifecycle.
  - `SupervisorRequestsModule`: Supervision workflows, advisor alerts, approval tracking.
  - `AdminModule`: Governance dashboard, bulk Excel user imports, moderation, audit logging.
  - `IntegrationsModule`: Google Workspace (Google Meet/Chat) and Zoom Workplace integrations.
* **Task Scheduling:** `@nestjs/schedule` executes recurring background jobs (e.g. `DigestScheduler` runs daily at 8:00 AM IST).
* **Asynchronous Jobs:** Direct in-memory async processing via `NotificationProcessor` (zero external Redis / queue dependency for Base/Standard deployments).

---

## 4. Relational Database Schema (`apps/api/prisma`)

CuriousBees runs PostgreSQL managed via Prisma ORM 6.19.

### Key Database Models (36 Entity Types):
* **`User`**: Identifies researchers, supervisors, and admins. Stores profiles, departmental relations, and approval status.
* **`ScholarProfile` & `SupervisorProfile`**: Specialized profiles with designation, research area, and max scholars allowance.
* **`Workspace`**: Isolated research project space containing files (`WorkspaceFile`), milestones (`WorkspaceMilestone`), announcements (`WorkspaceAnnouncement`), and meeting references (`ResearchMeeting`).
* **`ResearchCollaboration` & `CollaborationMessage`**: Peer-to-peer collaboration hub with persistent message history and integration provider bindings (`GOOGLE_WORKSPACE` / `ZOOM_WORKPLACE`).
* **`ResearchProfile` & `ResearchMilestone`**: Doctoral lifecycle tracking from proposal to thesis publication.
* **`Thread` & `Comment`**: Academic feed posts, research updates, and paper preprints with nested discussions.
* **`Publication`**: Formal academic outputs (DOI, journal, authors, status).
* **`Report`**: Scholar progress submissions with evidence URLs and supervisor feedback.
* **`ScholarSupervisorRequest`**: Direct supervision applications between scholars and faculty.
* **`AuditLog`**: Immutable, append-only record of all administrative, governance, and access modifications.

---

## 5. Object Storage Architecture (Amazon S3)

**Amazon S3 is the fixed standard** for all binary file storage in CuriousBees:
* **Research Artifacts:** PDF drafts, publications, literature reviews, thesis documents.
* **Workspace Evidence:** Milestone verification attachments, datasets, project zip files.
* **Scholar Reports:** Monthly progress evidence documents (`Report.evidenceUrl`).
* **Media & Avatars:** User profile images and thread attachments.
* **Bandwidth Optimization:** S3 is fronted by **AWS CloudFront CDN**, eliminating egress transfer costs by leveraging AWS's **1 TB/month free data transfer out tier**.

---

## 6. Authentication & Security (RBAC)

Access control operates across three distinct security layers:
1. **Next.js Edge Middleware (`apps/web/src/middleware.ts`):** Validates the Supabase session, extracts user identity, and enforces institutional email domain filtering (`srmist.edu.in`).
2. **NestJS Supabase Guard (`SupabaseAuthGuard`):** Verifies the Bearer JWT with Supabase GoTrue, auto-provisions verified users into PostgreSQL, and enforces account status checks.
3. **Role Guards & Decorators:** Enforces granular permissions (`INSTITUTE_ADMIN`, `RESEARCH_SUPERVISOR`, `RESEARCH_SCHOLAR`) across sensitive endpoints.
4. **Immutable Audit Logging:** All governance actions automatically create structured records in `AuditLog` capturing actor ID, target entity, action type, IP, and timestamp.

---

## 7. Production Usage Tiers & Capacity Specifications

CuriousBees is engineered to scale across three validated production budget allocations:

| Metric | Plan 1: Base | Plan 2: Standard | Plan 3: Scale |
|---|---:|---:|---:|
| **Monthly Budget Target** | **₹1,500 – ₹3,000** | **₹3,000 – ₹4,500** | **₹4,500 – ₹6,500** |
| **Estimated Monthly Cost** | **₹1,850 / mo ($21)** | **₹3,950 / mo ($46)** | **₹6,150 / mo ($72)** |
| **Peak Concurrent Users (PCU)** | **30 – 50 Users** | **100 – 150 Users** | **250 – 350 Users** |
| **Daily Active Users (DAU)** | **250 – 400 DAU** | **800 – 1,200 DAU** | **2,000 – 3,000 DAU** |
| **Monthly Active Users (MAU)** | **1,000 – 1,500 MAU** | **3,500 – 5,000 MAU** | **8,000 – 12,000 MAU** |
| **Maximum Registered Users** | **2,500 – 3,500 Accounts** | **8,000 – 12,000 Accounts** | **20,000 – 30,000 Accounts** |
| **API Throughput (Steady / Peak)** | **5–8 / 25 RPS** | **18–25 / 75 RPS** | **40–60 / 175 RPS** |
| **Database Compute & RAM** | **1 vCPU / 1 GB RAM (10GB SSD)** | **2 vCPU / 4 GB RAM (30GB SSD)** | **2–4 vCPU / 8 GB RAM (80GB SSD)** |
| **Amazon S3 Storage Allowance** | **25 GB** | **100 GB** | **300 GB** |
| **Transactional Email (Brevo)** | **Up to 9,000 / mo (Free)** | **Up to 20,000 / mo (Starter)** | **Up to 50,000 / mo (Starter+)** |
| **Safety Headroom Buffer** | **35%** | **38%** | **42%** |
