# CuriousBees — Security & Access Control

**Related:** [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | [ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md) | [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)

---

## 1. Authentication & Google OAuth Flow

CuriousBees uses **Admin-Managed Google OAuth via Supabase Auth** (`AUTH_MODE=GOOGLE_ADMIN_MANAGED`):

1. **Identity Proof:** Users sign in with Google OAuth through Supabase (`/login` → Google → `/auth/callback`).
2. **Domain Policy (`apps/api/src/auth/email-policy.ts` & `apps/web/src/lib/auth/email-domains.ts`):**
   - Emails must match `ALLOWED_EMAIL_DOMAINS` (e.g., `srmist.edu.in`).
   - If `ALLOWED_EMAIL_DOMAINS` is empty in production, `env.validation.ts` refuses to boot (`apps/api` fails closed).
   - Exception: `BOOTSTRAP_ADMIN_EMAIL` / `MAIN_ADMIN_EMAIL` (`ROOT_ADMIN_EMAIL`) is permitted for initial institutional bootstrap.
3. **Directory Provisioning (`SupabaseAuthGuard`):**
   - A valid Supabase JWT alone does **not** grant access.
   - `SupabaseAuthGuard` verifies the JWT against Supabase (`SUPABASE_SERVICE_ROLE_KEY`), confirms `email_verified`, and requires an existing `User` record in PostgreSQL with active status (rejecting `USER_NOT_PROVISIONED`, `USER_SUSPENDED`, and `USER_DEACTIVATED`/`REJECTED`).

---

## 2. Role-Based Access Control (RBAC) Matrix

| Capability / Endpoint Area | `RESEARCH_SCHOLAR` | `RESEARCH_SUPERVISOR` | `INSTITUTE_ADMIN` | Guard Enforcing |
| :--- | :---: | :---: | :---: | :--- |
| Feed, Threads, Comments, Likes, Bookmarks, Follows | Yes | Yes | **Blocked (`403`)** | `ResearchParticipantGuard` |
| Workspaces, Nexus Collaborations, Publications | Yes | Yes | **Blocked (`403`)** | `ResearchParticipantGuard` |
| `/my-research` & Scholar Supervisor Requests | Yes | Blocked | Blocked | `ScholarGuard` / Role checks |
| `/supervisor`, `/my-scholars` & Scholar Approvals | Blocked | Yes | Blocked | `SupervisorGuard` / Role checks |
| Create & Edit Own Events | Blocked | Yes | Yes | `EventsController` role checks |
| Approve/Reject/Delete Events & Event Inbox | Blocked | Blocked | **Yes** | `RolesGuard` (`INSTITUTE_ADMIN`) |
| `/api/admin/*` (Users, Hierarchy, Moderation, Audit, Settings) | Blocked (`403`) | Blocked (`403`) | **Yes** | `RolesGuard` (`INSTITUTE_ADMIN`) |
| `GET /api/system` (Host/Memory Diagnostics) | Blocked (`403`) | Blocked (`403`) | **Yes** | `RolesGuard` (`INSTITUTE_ADMIN`) |

**Frontend Enforcement:** Next.js `middleware.ts` enforces session presence and domain hints at the edge/node boundary, while `PortalLayout` hides unauthorized navigation items. **The NestJS API guards remain the authoritative security boundary.**

---

## 3. API, Network & Transport Security

- **Security Headers:**
  - `apps/api`: `helmet` (CSP enabled in production, `crossOriginEmbedderPolicy: false`).
  - `apps/web`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security` (in production), `poweredByHeader: false`.
- **CORS (`apps/api/src/main.ts`):** Explicit origin allow-list built from `FRONTEND_URL` and `ALLOWED_ORIGINS`. Wildcards are never used in production.
- **Input Validation:** Global `ValidationPipe` with `whitelist: true`, `transform: true`, and `forbidNonWhitelisted: true` strips/rejects unexpected fields.
- **Rate Limiting (`apps/api/src/common/throttling/rate-limits.ts`):**
  - Authenticated reads: `300/min`, writes: `60/min`, search: `60/min` (keyed by SHA-256 hash of Bearer token).
  - Unauthenticated endpoints: `120/min` per IP; per-IP ceiling: `6000/min`.
  - **Scaling Note:** Counters are currently in-memory per API instance; multi-instance deployments share the load across instances unless backed by Redis/Valkey.
- **n8n Integration Auth:** Protected by `IntegrationTokenGuard` requiring `X-Integration-Token` matching `N8N_INTEGRATION_TOKEN` (`>= 32` chars) using constant-time comparison, with `N8N_INTEGRATION_TOKEN_PREVIOUS` supported for rotation.

---

## 4. File Upload & Storage Security (`apps/api/src/files/files.service.ts`)

- Files are uploaded directly to private AWS S3 buckets via short-lived **presigned `PUT` URLs** and downloaded via short-lived **presigned `GET` URLs**.
- Workspace uploads enforce a **`50 MB`** maximum file size limit and block dangerous executable/script extensions (`.exe`, `.bat`, `.sh`, `.js`, `.php`, etc.).
- S3 buckets must keep **Block all public access** enabled at all times.

---

## 5. Secret Management & Audit Trail

- Store production secrets (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `N8N_INTEGRATION_TOKEN`, `GOOGLE_CLIENT_SECRET`) in **AWS SSM Parameter Store / Secrets Manager** or SRM's secret vault — never in Docker image layers or `NEXT_PUBLIC_*` variables.
- Administrative actions (user provisioning, role changes, suspensions, moderation, hierarchy edits) are recorded in `AuditLog` (`apps/api/src/admin/audit-helper.ts`) and viewable at `/admin/audit`.

## 6. Security Review Checklist (Before Go-Live)

- [ ] `NODE_ENV=production` and `ENABLE_SWAGGER=false` on production API.
- [ ] `ALLOWED_EMAIL_DOMAINS` restricted strictly to approved SRM domain(s).
- [ ] `FRONTEND_URL` and `ALLOWED_ORIGINS` use `https://` with no localhost or wildcard entries.
- [ ] `TRUST_PROXY_HOPS` matches exact proxy count (`1` or `2`).
- [ ] S3 bucket Block Public Access is ON and CORS allows only the production origin.
- [ ] `ThreadsPublicController` (`/api/threads/public/*`) policy reviewed and approved by SRM ITKM (see [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)).
