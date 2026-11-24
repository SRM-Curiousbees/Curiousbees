# CuriousBees — System Architecture

## 1. Architecture Overview
CuriousBees uses a **decoupled monorepo architecture**:
- **Frontend (`apps/web`):** Next.js 15 App Router (`:3000`), React 19, Zustand global state (`useStore.ts`), TanStack React Query, and Edge/Node middleware (`middleware.ts`). Browser requests to `/api/*` are proxied via Next.js `rewrites()` (`next.config.ts`) to the NestJS API.
- **Backend (`apps/api`):** Modular NestJS 11 REST API (`:4000`, global prefix `/api` except health), `ThrottlerModule` rate limiting (`sessionTracker` + `ipTracker`), `Helmet` security headers, `ValidationPipe`, Winston logging, and Swagger (`/api/docs`).
- **Shared Packages (`packages/*`):** `@curiousbees/types`, `@curiousbees/constants`, `@curiousbees/shared-utils` (Zod schemas), and `@curiousbees/ui`.
- **Infrastructure Status:**
  - **Configured & Code-Verified:** Multi-stage Dockerfiles (`Dockerfile.web`, `Dockerfile.api`), Prisma ORM (`schema.prisma`), Supabase JWT verification (`SupabaseService`), S3 presigned URL signing (`FilesService`), Brevo SMTP/API dispatch (`MailService`), and n8n webhook ingestion (`N8nEventsController`).
  - **Planned / Pending Live Credentials:** Production AWS ECS/S3 deployment, active cloud Supabase PostgreSQL (`ndtaxeqsefusocwgqppx.supabase.co` currently unreachable in `.env`), and live Google Workspace OAuth credentials.

```mermaid
flowchart TB
    subgraph Client ["Client Layer (Verified Build)"]
        Browser["Web Browser (Next.js 15 / React 19)"]
    end

    subgraph Edge ["Next.js Server (:3000)"]
        MW["Middleware (Session + Domain Check)"]
        Proxy["/api/* Rewrite Proxy"]
    end

    subgraph API ["NestJS 11 REST API (:4000)"]
        Guards["Guards: SupabaseAuth, Approved, Roles, ResearchParticipant"]
        Modules["27 Domain Modules (39 Controllers)"]
        Prisma["PrismaService (Fallback Demo Mode if DB Down)"]
    end

    subgraph Cloud ["External Services (Planned Production / Env Configured)"]
        SupaAuth["Supabase Auth (Google OAuth)"]
        PG[("Supabase PostgreSQL")]
        S3["Amazon S3 (Private Bucket)"]
        Brevo["Brevo Transactional Email"]
        N8N["n8n Gmail Event Ingestion"]
    end

    Browser --> MW --> Proxy --> Guards --> Modules --> Prisma
    Browser --> SupaAuth
    Guards --> SupaAuth
    Prisma --> PG
    Modules --> S3
    Modules --> Brevo
    N8N -->|X-Integration-Token| Modules
```

---

## 2. Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant MW as Next.js Middleware
    participant Supa as Supabase Auth (Google)
    participant API as NestJS SupabaseAuthGuard
    participant DB as PostgreSQL (User Table)

    U->>Supa: Sign in with Google OAuth
    Supa-->>U: Redirect to /auth/callback with session
    U->>MW: Request /feed (or portal route)
    MW->>Supa: updateSession()
    MW->>MW: isEmailDomainAllowed(email)
    MW-->>U: Allow or redirect to /login or /access-denied
    U->>API: GET /api/... (Authorization: Bearer JWT)
    API->>Supa: verifyToken(jwt)
    API->>API: isEmailDomainAllowed(email)
    API->>DB: Lookup User by supabaseAuthId or email
    alt Not provisioned or SUSPENDED/DEACTIVATED
        API-->>U: 403 Forbidden (AccessDenialReason)
    else Active & Approved
        API->>API: ApprovedGuard / RolesGuard / ResearchParticipantGuard
        API-->>U: 200 OK + JSON Response
    end
```

---

## 3. Main Application Request Lifecycle

```mermaid
flowchart LR
    Req["HTTP Request"] --> Helmet["Helmet + CORS + Compression"]
    Helmet --> Throttle["ThrottlerGuard (Session + IP)"]
    Throttle --> Auth["SupabaseAuthGuard (JWT + Provisioned User)"]
    Auth --> Approved["ApprovedGuard (ACTIVE + approved)"]
    Approved --> RoleGuard["RolesGuard / ResearchParticipantGuard"]
    RoleGuard --> Ctrl["Controller + ValidationPipe / Zod"]
    Ctrl --> Svc["Service + PrismaService"]
    Svc --> Res["JSON Response / HttpExceptionFilter"]
```

---

## 4. Role Workflows

### 4.1 Research Scholar Workflow
```mermaid
flowchart LR
    S1["Admin Provisions Account"] --> S2["Google Login -> /onboarding"]
    S2 --> S3["Select Domains, Dept & Supervisor"]
    S3 --> S4["/verification-pending (Await Approval)"]
    S4 --> S5["Supervisor Approves -> /feed"]
    S5 --> S6["Post, Comment, Like, Bookmark, Follow"]
    S5 --> S7["/my-research & Progress Reports"]
    S5 --> S8["/nexus DMs -> /workspace/[id] S3 Files"]
```

### 4.2 Research Supervisor Workflow
```mermaid
flowchart LR
    P1["Admin Provisions Account"] --> P2["Google Login -> /onboarding"]
    P2 --> P3["/supervisor Overview & /my-scholars"]
    P3 --> P4["Approve/Reject Scholar Requests"]
    P3 --> P5["Review Scholar Progress Reports"]
    P3 --> P6["/feed Discussions & /opportunities"]
    P3 --> P7["/nexus & /workspace/[id]"]
```

### 4.3 Institute Admin Workflow
```mermaid
flowchart LR
    A1["Login -> /admin/dashboard"] --> A2["Provision Scholars, Supervisors & Admins"]
    A1 --> A3["Manage Campuses, Faculties & Depts"]
    A1 --> A4["Moderation Queue & Hide/Restore Posts"]
    A1 --> A5["Review Event Inbox & Broadcast Announcements"]
    A1 --> A6["Inspect AuditLog & SystemSettings"]
```

---

## 5. File Storage, Notifications & External Integrations
- **File Storage (`FilesService`):** Private Amazon S3 bucket; server validates file extensions, MIME types, and size limits (`10 MB` for feed attachments under `threads/posts/...`, `50 MB` for workspaces under `workspaces/...`), issuing short-lived presigned `PUT`/`GET` URLs.
- **Notifications (`NotificationsService`):** Persisted in-app `Notification` records + Brevo transactional emails (`MailService`). Browser push delivery (`sendPushToUser`) is disabled (no push provider configured).
- **External Integrations:** Google Workspace OAuth (`IntegrationConnection`) for Google Meet/Chat Space links in workspaces, and `n8n` webhook ingestion (`N8nEventsController`) protected by timing-safe `N8N_INTEGRATION_TOKEN`.
