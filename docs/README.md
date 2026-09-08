# CuriousBees V2 — Documentation Portal

Welcome to the central documentation portal for **CuriousBees V2** (Institutional Research Collaboration & Governance Platform). This directory provides architectural blueprints, database models, cloud deployment runbooks, security audits, and developer onboarding guides.

---

## 🏛️ 1. Architecture & System Design

Blueprints, tech stack breakdowns, domain boundaries, and capacity calculations.

* [System Architecture](./architecture/ARCHITECTURE.md) — Comprehensive architecture of Next.js 15 App Router, NestJS 11 Core API, PostgreSQL database, Supabase Auth, Brevo Gateway, and AWS S3 Object Storage.
* [Tech Stack Breakdown](./architecture/tech-stack.md) — Full matrix of frontend, backend, database, and infrastructure frameworks with Mermaid topology diagrams.
* [Project Overview](./architecture/PROJECT_OVERVIEW.md) — Business domain breakdown, institutional workflows, and role interaction models (Scholar, Supervisor, Institute Admin).
* [Production Capacity & Cloud Cost Analysis](./architecture/PRODUCTION_CAPACITY_COST_ANALYSIS.md) — Sizing models, concurrency metrics, usage tier allocations, and projected AWS / cloud infrastructure costs.
* [Monorepo Directory Layout](./architecture/file-structure.md) — Monorepo directory map across `apps/`, `packages/`, `docs/`, and `scripts/`.

---

## 💻 2. Local Development & Onboarding

Quickstart workflows, local database setup, demo credentials, and environment configuration.

* [Developer Quick Start Guide](./guides/QUICK_START.md) — 5-minute onboarding and setup workflow.
* [Demo User Accounts Roster](./guides/DEMO_USERS.md) — Pre-seeded credentials for Admin, Supervisor, and Scholar roles.
* [Development & Sandbox Mode](./guides/DEVELOPMENT_MODE_GUIDE.md) — Testing workflows, mocked bypass patterns, and development flags.
* [Pre-Release Checklist](./guides/RELEASE_CHECKLIST.md) — Mandatory verification and quality assurance checklist prior to production deployment.
* **Platform Installation Guides**:
  * [macOS Setup Guide](./guides/setup-macos.md)
  * [Linux Setup Guide](./guides/setup-linux.md)
  * [Windows Setup Guide](./guides/setup-windows.md)

---

## 🗄️ 3. Database Architecture & Schemas

* [Database Architecture & Entity Relationships](./database/DATABASE_ARCHITECTURE.md) — PostgreSQL relational schema, Prisma models, indexing strategy, foreign key cascades, and audit triggers.

---

## 🚀 4. Deployment & Infrastructure Runbooks

Production deployment configurations, containerization, hosting platforms, and CI/CD pipelines.

* [Cloud Production Hosting Guide](./deployment/DEPLOYMENT_GUIDE.md) — Master deployment runbook for Next.js (Vercel), NestJS (Railway / Docker), PostgreSQL (Supabase), Brevo Email, and Amazon S3.
* [Railway Deployment Runbook](./deployment/railway.md) — Backend deployment configuration on Railway.
* [Vercel Deployment Runbook](./deployment/vercel.md) — Frontend Next.js deployment configuration on Vercel.
* [Production Bundle Testing](./deployment/deployment_test_production.md) — Commands and procedures for compiling and validating production builds locally.
* [Team Testing & Shared Staging](./deployment/TEAM_TESTING_DEPLOYMENT.md) — Guidelines for shared staging environments and team validation.
* [GitHub CI/CD Automation](./deployment/CI_CD.md) — Automated build, linting, typechecking, and release pipelines.

---

## 🔒 5. Security, Auth & Audits

Security policies, role-based access control, telemetry, and system audits.

* [Admin-Managed Authentication](./auth/admin-managed-auth.md) — Institutional identity model, Google OAuth integration, role assignment, and administrative control.
* [Security Policies & Headers](./audits/SECURITY_AUDIT.md) — CORS configuration, Helmet security headers, rate limiting, and input sanitization.
* [Railway Deployment Audit](./audits/RAILWAY_DEPLOYMENT_AUDIT.md) — Infrastructure verification and container validation report.
* [System Health Diagnostics](./development/HEALTHCHECK.md) — Health telemetry specification for `/api/health` and `/api/system`.
* [Comprehensive Project Documentation](./reports/CuriousBees_V2_Project_Documentation.md) — Master reference report for the CuriousBees V2 platform.
