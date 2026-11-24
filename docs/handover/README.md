# CuriousBees — SRM ITKM Institutional Handover Package

**Version:** 1.0.0 (`CuriousBees V2`)  
**Target Recipient:** SRM Institute of Science and Technology (ITKM) — Infrastructure, Operations & Engineering Teams  
**Status:** Ready for controlled staging/production onboarding once connected to SRM-owned Supabase, PostgreSQL, AWS S3, and Brevo credentials.

---

## 1. What CuriousBees Is

CuriousBees is an institutional academic research social network, supervision workspace, and governance platform built specifically for the **SRM Institute of Science and Technology** ecosystem. It connects **Research Scholars** and **Research Supervisors** through an X/Threads-inspired academic social feed, structured Ph.D. milestone and workspace collaboration, publication tracking, campus research events, and institutional governance administered by **Institute Administrators**.

## 2. Institutional Purpose

- **Break Research Silos:** Connect scholars and supervisors across SRM campuses, faculties, and departments via research posts, discussions, domain/topic discovery, and direct Nexus collaboration.
- **Unify Supervision & Progress Tracking:** Provide structured Ph.D./research milestones, supervisor assignment workflows, and shared project workspaces with S3-backed document exchange.
- **Enforce Institutional Governance:** Restrict access to administrator-provisioned accounts within approved email domains (`ALLOWED_EMAIL_DOMAINS`), enforce separation of duties (`INSTITUTE_ADMIN` governs rather than participates in social/research feeds), and log administrative actions in `AuditLog`.

## 3. Major Capabilities

- **Researcher Network:** Academic feed (`/feed`), threaded discussions (`/feed/[id]`), bookmarks, likes, shares, researcher directory (`/researchers`), domain/topic/peer following, and Nexus messaging (`/nexus`).
- **Academic Workspace:** `My Research` milestone tracker (`/my-research`), supervisor oversight (`/supervisor`, `/my-scholars`), collaborative workspaces (`/workspace`, `/workspace/[id]`) with S3 presigned uploads, publications (`/publications`), opportunities (`/opportunities`), and campus events (`/events`).
- **Institutional Governance:** User provisioning & lifecycle (`/admin/users`), campuses/faculties/departments (`/admin/campuses`, `/admin/faculties-departments`), content moderation (`/admin/moderation`, `/admin/posts`), event ingestion inbox (`/admin/event-inbox`), announcements (`/admin/announcements`), audit logs (`/admin/audit`), and email delivery status (`/admin/email-delivery`).

## 4. User Roles

| Role (`Role` enum) | Primary Responsibility | Key Routes |
| :--- | :--- | :--- |
| **`RESEARCH_SCHOLAR`** | Posts research updates, collaborates in workspaces, tracks Ph.D. milestones, requests supervisors, submits publications. | `/feed`, `/researchers`, `/my-research`, `/workspace`, `/publications`, `/events`, `/opportunities`, `/nexus`, `/profile` |
| **`RESEARCH_SUPERVISOR`** | Supervises scholars, approves scholar requests, manages workspaces, creates/edits own events, participates in research discussions. | `/supervisor`, `/my-scholars`, `/feed`, `/researchers`, `/workspace`, `/publications`, `/events`, `/nexus`, `/profile` |
| **`INSTITUTE_ADMIN`** | Provisions users, manages SRM hierarchy, moderates content, reviews/approves events, manages announcements & settings. Blocked from social/research participation by `ResearchParticipantGuard`. | `/admin/dashboard`, `/admin/users`, `/admin/campuses`, `/admin/faculties-departments`, `/admin/moderation`, `/admin/event-inbox`, `/admin/audit`, `/admin/settings` |

## 5. Technology Stack

| Layer | Technology (Verified in `package.json`) |
| :--- | :--- |
| **Frontend** | Next.js `^15.3.0` (App Router, `standalone` output), React `^19.0.0-rc.0`, Tailwind CSS `^3.4.3`, Zustand `^4.5.2`, TanStack Query `^5.100.14`, `@supabase/ssr` `^0.12.4` |
| **Backend** | NestJS `^11.1.24` (Express), TypeScript `^5.4.5`, Prisma ORM `6.19.3`, Helmet, Compression, Winston, `@nestjs/throttler`, `@nestjs/schedule` |
| **Database** | PostgreSQL (Supabase-managed in production/staging) via Prisma (`DATABASE_URL` pooler + `DIRECT_URL` direct) |
| **Authentication** | Supabase Auth + Google OAuth (`AUTH_MODE=GOOGLE_ADMIN_MANAGED`) |
| **Object Storage** | AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) |
| **Email** | Brevo REST API (`BREVO_API_KEY`) |
| **Optional Integrations** | Google Workspace (Meet/Calendar/Chat), n8n Event Ingestion (`N8N_INTEGRATION_TOKEN`), OpenSearch (`OPENSEARCH_ENDPOINT`) |

## 6. Repository Structure

```text
CuriousBees/
├── apps/
│   ├── api/                 # NestJS REST API, Prisma schema & migrations, unit & e2e tests
│   └── web/                 # Next.js 15 App Router frontend, middleware, Tailwind UI
├── packages/
│   ├── constants/           # Shared domain constants (@curiousbees/constants)
│   ├── shared-utils/        # Shared utilities (@curiousbees/shared-utils)
│   ├── types/               # Shared TypeScript interfaces (@curiousbees/types)
│   └── ui/                  # Shared UI components (@curiousbees/ui)
├── infra/aws/               # ECS task definitions, IAM/S3 policies, migration & deploy scripts
├── integrations/n8n/        # Optional n8n email-to-event ingestion workflow & tests
├── scripts/                 # Setup, doctor, health-check, DB reset guards, k6 load tests
└── docs/                    # Architecture, audits, submission & this handover/ package
```

## 7. Handover Document Index

| Document | Audience | Purpose |
| :--- | :--- | :--- |
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Management & Engineers | Product capabilities, workflows, and implemented vs. planned scope |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Architects & Developers | Frontend/backend architecture, auth flow, RBAC, Mermaid diagrams |
| [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) | Developers | Local setup, Node 22, env config, Prisma generate, dev/test/build |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | ITKM / DevOps | Staging & production hosting (AWS ECS / PaaS), DNS, TLS, CORS, rollback |
| [ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md) | ITKM / DevOps | Complete inventory of all verified API & Web environment variables |
| [DATABASE_AND_BACKUP_GUIDE.md](./DATABASE_AND_BACKUP_GUIDE.md) | DBAs & ITKM | PostgreSQL/Supabase, Prisma migrations, backup, restore, safety rules |
| [OPERATIONS_AND_MAINTENANCE.md](./OPERATIONS_AND_MAINTENANCE.md) | ITKM Operations | Daily/weekly/monthly checklists, SLA/RACI matrix, release workflow |
| [SECURITY_AND_ACCESS_CONTROL.md](./SECURITY_AND_ACCESS_CONTROL.md) | Security & ITKM | Auth, Google OAuth, RBAC guards, rate limiting, S3 upload security |
| [MONITORING_AND_TROUBLESHOOTING.md](./MONITORING_AND_TROUBLESHOOTING.md) | ITKM Support | Health checks, log inspection, common failure playbooks |
| [DISASTER_RECOVERY_AND_ROLLBACK.md](./DISASTER_RECOVERY_AND_ROLLBACK.md) | ITKM / DevOps | Recovery procedures, rollback, credential rotation, RPO/RTO targets |
| [DEVELOPER_HANDOVER.md](./DEVELOPER_HANDOVER.md) | Developers | Coding conventions, Prisma rules, adding roles/modules, PR checks |
| [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) | All Stakeholders | Verified vs. unverified, partial/unimplemented features, legacy routes |
| [HANDOVER_CHECKLIST.md](./HANDOVER_CHECKLIST.md) | SRM & Delivery Lead | Formal institutional acceptance & sign-off checklist |
| [REPOSITORY_CLEANUP_AUDIT.md](./REPOSITORY_CLEANUP_AUDIT.md) | Maintainers | File classification (A–I), justified cleanups, retained legacy items |

## 8. Prerequisites & Quick Start (Local Development)

- **Node.js:** `>= 22` (`.nvmrc` specifies `v22.14.0`) and `npm@10.8.2`
- **Database & Auth:** A Supabase project (PostgreSQL + Google OAuth) or local Docker PostgreSQL (`docker-compose.test.yml` for E2E)

```bash
# Run from repository root
cp .env.example .env
# Populate DATABASE_URL, DIRECT_URL, SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm install --legacy-peer-deps
npm run build:packages
npm run db:generate
npm run dev
```

- **Web UI:** `http://localhost:3000`
- **API & Swagger:** `http://localhost:4000/api` (`http://localhost:4000/api/docs` when `ENABLE_SWAGGER=true`)

## 9. Support and Ownership Information

- **Institutional Owner:** SRM Institute of Science and Technology — ITKM
- **Initial Bootstrap Admin:** Configured via `BOOTSTRAP_ADMIN_EMAIL` / `MAIN_ADMIN_EMAIL` in production environment variables and seeded via `npm run seed:prod --workspace=apps/api`.
- **Related Deployment Proposal:** See [docs/submission/deployment-proposal/INFRASTRUCTURE_ASSESSMENT.md](../submission/deployment-proposal/INFRASTRUCTURE_ASSESSMENT.md) for three-tier capacity and cost modeling (`Base`, `Growth`, `Institutional`).
