# CuriousBees — Institutional Academic Collaboration & Governance Platform

<div align="center">
  <img src="https://img.shields.io/badge/Production-Ready-0C4DA2.svg?style=for-the-badge" alt="Production Ready" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js%2015-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS%2011-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma%20ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
</div>

<br />

**CuriousBees** is an enterprise-grade digital research collaboration and governance platform designed for university institutions. It connects research scholars, faculty supervisors, and university leadership into a structured, secure, and audited academic ecosystem.

---

## 🏛️ Core Product & Role Model

CuriousBees enforces strict separation of concerns across three primary institutional roles:

```
                  ┌─────────────────────────────────┐
                  │         INSTITUTE ADMIN         │
                  │  (Governance, Moderation, Audit)│
                  └──────────────┬──────────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
┌───────────────────────┐                   ┌───────────────────────┐
│  RESEARCH SUPERVISOR  │ ◄──[Supervises]── │    RESEARCH SCHOLAR   │
│ (Direct Registration, │                   │ (Requests Supervisor, │
│  Scholar Mentorship)  │                   │  Authors Research)    │
└───────────────────────┘                   └───────────────────────┘
```

1. **RESEARCH SCHOLAR**
   - Direct authentication and profile management.
   - Discovers faculty supervisors and submits direct supervision applications.
   - Authors publications, manages research project workspaces, and tracks milestones.

2. **RESEARCH SUPERVISOR**
   - **Direct Registration & Login**: Active immediately upon authentication with **no administrative approval required**.
   - Directly reviews and accepts or rejects scholar supervision applications.
   - Oversees supervised scholars, doctoral milestones, co-authored papers, and research workspaces.

3. **INSTITUTE ADMIN**
   - Operates the institutional governance command center (`/admin/*`).
   - Manages faculty and department structures, campus nodes, and user identity accounts.
   - Enforces content and publication moderation, supervisor reassignments, account suspensions, and reviews the immutable audit log (`AuditLog`).
   - **Zero research authoring clutter**: purely governance, compliance, and institutional administration.

---

## 🏗️ Monorepo Architecture

The repository is structured as a corporate npm workspace monorepo:

```text
CuriousBees_V2/
├── apps/
│   ├── web/                    # Next.js 15+ App Router frontend (React, Tailwind, Zustand)
│   └── api/                    # NestJS backend API (Prisma, Express, Brevo, PostgreSQL)
├── packages/
│   ├── types/                  # Shared TypeScript models and interfaces
│   ├── constants/              # Shared system tokens, cookie keys, and roles
│   ├── shared-utils/           # Common utilities (HTTP fetchers, formatting, error readers)
│   └── ui/                     # Design system primitives and UI component tokens
├── docs/                       # Technical architecture, security, and schema documentation
│   ├── architecture/           # System design diagrams and module relationships
│   ├── database/               # Relational entity schemas and ERD documentation
│   ├── deployment/             # Railway, Vercel, and Docker deployment runbooks
│   └── guides/                 # Developer onboarding and contribution guidelines
├── scripts/                    # Engineering toolchain and maintenance scripts
│   ├── database/               # Database bootstrap and seeding utilities
│   ├── development/            # Environment health check and diagnostics doctor
│   └── maintenance/            # Administrative maintenance tasks
├── .github/                    # CI/CD workflows and automated checks
├── Dockerfile.api              # Production container build for NestJS backend
├── Dockerfile.web              # Production container build for Next.js web application
└── package.json                # Root workspace configuration and developer commands
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `>= 22.0.0`
- **npm**: `>= 10.0.0`
- **PostgreSQL**: Local instance or Supabase cloud connection

### 2. Dependency Installation
```bash
npm install --legacy-peer-deps
```

### 3. Environment Configuration
```bash
cp .env.example .env
```
_Configure database connection string (`DATABASE_URL`), Supabase credentials, and Brevo API keys in `.env`._

### 4. Build Shared Packages & Prisma Generation
```bash
npm run setup
```

### 5. Diagnostics & Environment Health Check
```bash
npm run doctor
```

### 6. Start Development Servers
```bash
npm run dev
```
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **REST API Backend**: [http://localhost:4000](http://localhost:4000)
- **API Documentation (Swagger)**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## 🛠️ Monorepo Scripts Reference

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Runs Next.js frontend and NestJS API concurrently in development mode. |
| `npm run build` | Compiles shared packages, Next.js web app, and NestJS API in dependency order. |
| `npm run build:packages` | Compiles `@curiousbees/types`, `@curiousbees/constants`, and `@curiousbees/shared-utils`. |
| `npm run typecheck` | Validates TypeScript compilation across `apps/web` and `apps/api` with zero emissions. |
| `npm run doctor` | Performs diagnostic health check on environment variables, ports, and database connectivity. |
| `npm run db:generate` | Generates typed Prisma Client from `schema.prisma`. |
| `npm run db:migrate` | Runs database migrations. |
| `npm run db:seed` | Seeds initial faculties, departments, and administrative accounts. |
| `npm run clean` | Cleans build artifacts (`.next`, `dist`, `node_modules`). |

---

## 🔐 Security & Governance Principles

1. **Immutable Audit Trail**: Every administrative mutation (account suspension, user deletion, role modification, report resolution) requires an audited justification and writes directly to the immutable append-only `AuditLog` table.
2. **Strict Route Guards**: Route protection operates at both the Next.js edge middleware level and NestJS JWT/Roles guard level, strictly enforcing role-level access.
3. **Brevo Email Gateway**: System emails (supervision requests, account status notices, invitations) are routed through transactional Brevo email services with status telemetry.
4. **Amazon S3 Object Storage**: Dedicated cloud storage for all research papers, thesis PDFs, evidence uploads, and workspace assets, fronted by AWS CloudFront CDN.

---

## 📚 Architecture & Capacity Documentation

* [System Architecture Guide](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/architecture/ARCHITECTURE.md)
* [Tech Stack Breakdown & Mermaid Topology](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/architecture/tech-stack.md)
* [Production Capacity, Usage Tiers & Cost Analysis](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/architecture/PRODUCTION_CAPACITY_COST_ANALYSIS.md)
* [Production Deployment & Infrastructure Runbook](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/deployment/DEPLOYMENT_GUIDE.md)

