# CuriousBees V2 — Documentation Directory

Welcome to the documentation homepage for CuriousBees V2. This index categorizes all project blueprints, onboarding guides, architectural designs, and production capacity plans.

---

## 🏛️ 1. Architecture & Blueprints

Overview of the system design, tech stack selection, codebase structure, and capacity planning.

* [System Architecture](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/architecture/ARCHITECTURE.md): Complete structural design of the Next.js 15 frontend, NestJS 11 API, PostgreSQL database, Amazon S3 storage, and Supabase Auth.
* [Tech Stack Breakdown](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/architecture/tech-stack.md): In-depth inventory of chosen libraries, frameworks, and cloud services with updated Mermaid topology.
* [Project Overview](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/architecture/PROJECT_OVERVIEW.md): Business domains, user journeys (Scholar, Supervisor, Admin), and core modules.
* [Production Capacity & Cost Analysis](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/architecture/PRODUCTION_CAPACITY_COST_ANALYSIS.md): Comprehensive sizing, usage tier allocations, concurrent user formulas, and monthly cloud cost calculations.
* [Directory Layout Details](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/architecture/file-structure.md): Granular file-tree layout details for monorepo packages and apps.

---

## 💻 2. Local Development & Setup

Guidelines for configuring local dev instances, database containers, and debugging setups.

* [Onboarding Quick Start](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/guides/QUICK_START.md): 5-minute local startup script workflow.
* [Local Troubleshooting Guide](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/guides/troubleshooting.md): Resolution steps for PostgreSQL connections, CORS errors, or Prisma locks.
* [Demo User Accounts Roster](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/guides/DEMO_USERS.md): List of pre-seeded supervisor, scholar, and admin credentials.
* **Platform Setup Guides**:
  * [macOS Installation](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/guides/setup-macos.md)
  * [Windows Installation](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/guides/setup-windows.md)
  * [Linux Installation](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/guides/setup-linux.md)

---

## 🗄️ 3. Database Architecture

* [Database System Design](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/database/DATABASE_ARCHITECTURE.md): Database schemas, tables, index definitions, and Prisma model relationships.

---

## 🚀 4. Deployment & Infrastructure

Release checklists, production runbooks, and hosting environments.

* [Cloud Production Hosting Guide](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/deployment/DEPLOYMENT_GUIDE.md): Complete cloud release runbook for Next.js, NestJS, Amazon S3, PostgreSQL, Supabase, and Brevo.
* [Railway Deployment Runbook](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/deployment/railway.md): Specific deployment configurations for Railway.
* [Production Build Details](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/deployment/deployment_test_production.md): Commands for testing production bundles locally.
* [GitHub CI/CD Pipelines](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/deployment/CI_CD.md): Automated builds, lints, and test pipelines.

---

## 🩺 5. Telemetry & Audits

Telemetry specs, security practices, and repository health audits.

* [Railway Readiness Audit Report](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/RAILWAY_DEPLOYMENT_AUDIT.md): Production hardening report confirming Redis removal and container alignment.
* [Health Diagnostics Telemetry](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/development/HEALTHCHECK.md): Output specs for `/api/health` and `/api/system`.
* [Security Audits](file:///Users/maddy/Current%20Project/Curious%20Bees/CuriousBees_V2/docs/audits/SECURITY_AUDIT.md): CORS setups, Helmet headers, and rate limits.
