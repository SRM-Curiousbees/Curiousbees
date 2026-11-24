# CuriousBees — Deployment Guide (Staging & Production)

**Related:** [ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md) | [DATABASE_AND_BACKUP_GUIDE.md](./DATABASE_AND_BACKUP_GUIDE.md) | [DISASTER_RECOVERY_AND_ROLLBACK.md](./DISASTER_RECOVERY_AND_ROLLBACK.md)

> **Important Status Notice:** CuriousBees is **not** currently deployed to any live SRM production environment. This guide provides concrete, verified instructions for deploying to SRM-approved infrastructure.

---

## 1. Recommended Hosting Architecture

CuriousBees consists of two stateless Node.js 22 containers (`Dockerfile.web` and `Dockerfile.api`) plus managed external services:

- **Option A — AWS ECS Fargate + ALB + CloudFront (Primary Enterprise Architecture):** Reference manifests exist in [`infra/aws/`](../../infra/aws/), [`Dockerfile.api`](../../Dockerfile.api), and [`Dockerfile.web`](../../Dockerfile.web). Suitable for SRM institutional ownership in `ap-south-1` (Mumbai).
- **Option B — SRM On-Premise / Institutional VM (Docker Compose / Reverse Proxy):** Deploy the same `Dockerfile.api` and `Dockerfile.web` containers behind Nginx/HAProxy with TLS termination.
- **Option C — Managed PaaS (Vercel + Railway):** Reference files [`vercel.json`](../../vercel.json) and [`railway.json`](../../railway.json) exist in the repo, though AWS ECS (`ap-south-1`) is recommended for institutional governance and predictable scaling.

---

## 2. Staging vs. Production Separation

| Aspect | Staging Environment | Production Environment |
| :--- | :--- | :--- |
| **Domain Example** | `https://staging.srmcuriousbees.in` | `https://curiousbees.srmist.edu.in` (or SRM-approved domain) |
| **Supabase Project** | Dedicated Staging Supabase project | Dedicated Production Supabase project (`ap-south-1`, Pro + PITR) |
| **AWS S3 Bucket** | `srm-curiousbees-staging-files` | `srm-curiousbees-prod-files` (SSE-S3, Block Public Access ON) |
| **`NODE_ENV`** | `production` (tests prod build behavior) | `production` |
| **`ENABLE_SWAGGER`** | `true` (optional for QA) | `false` |
| **`ENABLE_CRON`** | `false` (or `true` on 1 instance only) | `true` on **exactly one** API task/instance |
| **`ALLOWED_EMAIL_DOMAINS`** | `srmist.edu.in` (+ QA test domain if approved) | `srmist.edu.in` (institutional domain only) |

---

## 3. External Service Setup Prerequisites

### 3.1 Supabase Setup (Auth + PostgreSQL)
1. Create separate **Staging** and **Production** projects in Supabase (`ap-south-1` Mumbai).
2. In **Authentication → Providers → Google**: Enable Google OAuth using SRM's Google Cloud OAuth Client ID/Secret.
3. In **Authentication → URL Configuration**:
   - **Site URL:** `https://<YOUR_DOMAIN>`
   - **Redirect URLs:** `https://<YOUR_DOMAIN>/auth/callback`
4. Record `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (Transaction/Session Pooler `:6543?pgbouncer=true`), and `DIRECT_URL` (Direct `:5432` for Prisma migrations).

### 3.2 AWS S3 Setup
1. Create a private S3 bucket in `ap-south-1` with **Block all public access** enabled and default encryption (`AES256` / SSE-S3).
2. Apply CORS rules from [`infra/aws/s3/cors.json`](../../infra/aws/s3/cors.json) updated with your exact `https://<YOUR_DOMAIN>` origin so browsers can upload directly via presigned `PUT` URLs.
3. Apply lifecycle rules ([`infra/aws/s3/lifecycle.json`](../../infra/aws/s3/lifecycle.json)) and grant the API IAM role/user least-privilege `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on the bucket prefix ([`infra/aws/iam/api-task-role-policy.json`](../../infra/aws/iam/api-task-role-policy.json)).

### 3.3 Brevo Email Setup
1. Create/use an institutional Brevo account and verify SRM's sending domain (SPF + DKIM DNS records).
2. Generate a Brevo API v3 key (`BREVO_API_KEY`) and set `MAIL_FROM_EMAIL` (e.g., `noreply@curiousbees.srmist.edu.in`) and `MAIL_FROM_NAME=CuriousBees`.

---

## 4. Domain, DNS, HTTPS/TLS & Reverse Proxy Routing

Configure DNS (`A`/`ALIAS` or `CNAME`) to point your domain to the Load Balancer / CloudFront / Reverse Proxy with TLS 1.2+ (ACM certificate or institutional SSL cert).

**Path Routing Rules (Single-Origin Recommended):**
- `/api/*` → Backend API (`apps/api`, port `4000`)
- `/*` → Frontend Web (`apps/web`, port `3000`)

**Why Single-Origin Routing?** When both web and API share `https://<YOUR_DOMAIN>`, browser requests avoid cross-site cookie/CORS complexity, and `NEXT_PUBLIC_API_URL` can be set to `https://<YOUR_DOMAIN>`.

**Reverse Proxy Headers:**
- Forward `X-Forwarded-For`, `X-Forwarded-Proto`, and `Host`.
- Set `TRUST_PROXY_HOPS` on `apps/api` to match the exact number of trusted proxies (`1` behind ALB only; `2` behind CloudFront → ALB) so rate limiting and audit logs see the real client IP.

**CORS Configuration:**
- Set `FRONTEND_URL=https://<YOUR_DOMAIN>` and `ALLOWED_ORIGINS=https://<YOUR_DOMAIN>` on `apps/api`. `apps/api/src/main.ts` enforces an explicit allow-list (no wildcards in production).

---

## 5. Build & Deployment Commands

### 5.1 Build Docker Images (From Repository Root)

```bash
# Build Backend API image
docker build -f Dockerfile.api -t curiousbees-api:1.0.0 .

# Build Frontend Web image (NEXT_PUBLIC_* are inlined at build time — NEVER pass secrets here)
docker build -f Dockerfile.web \
  --build-arg NEXT_PUBLIC_SITE_URL=https://<YOUR_DOMAIN> \
  --build-arg NEXT_PUBLIC_API_URL=https://<YOUR_DOMAIN> \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<YOUR_PROJECT>.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY> \
  --build-arg NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=srmist.edu.in \
  -t curiousbees-web:1.0.0 .
```

### 5.2 Database Migration & Initial Admin Bootstrap (Pre-Traffic)

> **WARNING:** Always take a verified database snapshot/backup before running migrations in staging or production.

```bash
# Run inside the API container (or CI/CD migration task) with DATABASE_URL and DIRECT_URL set
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

# First-time production bootstrap ONLY: creates initial INSTITUTE_ADMIN from BOOTSTRAP_ADMIN_EMAIL
node apps/api/dist/scripts/seed-production.js
```

### 5.3 Container Startup & CI/CD

- **API Container:** `node apps/api/dist/main.js` (listens on `0.0.0.0:4000`)
- **Web Container:** `node apps/web/server.js` (listens on `0.0.0.0:3000`)
- **Automated CI/CD:** See [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml) for the reference GitHub Actions pipeline (validation → ARM64 ECR build → ECS deployment with OIDC).

---

## 6. Health Checks & Deployment Verification

| Target | Endpoint | Expected Response |
| :--- | :--- | :--- |
| **Web Liveness** | `GET https://<YOUR_DOMAIN>/healthz` | `200 OK` |
| **API Liveness** | `GET https://<YOUR_DOMAIN>/api/health/live` | `200 OK` (`{"status":"ok","process":"alive"}`) |
| **API DB Readiness** | `GET https://<YOUR_DOMAIN>/api/health/ready` | `200 OK` (`{"status":"ok","database":"connected"}`) |

Post-deploy verification script: [`infra/aws/verify-deployment.sh`](../../infra/aws/verify-deployment.sh) and [`scripts/health-check.js`](../../scripts/health-check.js).

## 7. Rollback Procedure

1. Re-point ECS service / container orchestrator to the previous known-good immutable image tag (e.g., `curiousbees-api:<PREVIOUS_TAG>` and `curiousbees-web:<PREVIOUS_TAG>`).
2. Verify `/api/health/ready` and `/healthz` return `200 OK`.
3. If a schema migration caused the regression, restore the pre-migration database snapshot rather than running destructive `prisma migrate reset`. See [DISASTER_RECOVERY_AND_ROLLBACK.md](./DISASTER_RECOVERY_AND_ROLLBACK.md).
