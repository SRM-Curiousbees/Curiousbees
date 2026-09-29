# CuriousBees — AWS Production Deployment

Production target: **https://srmcuriousbees.in** (web and API on one origin; the API is served under `/api/*`).
Region: **ap-south-1 (Mumbai)**. Account: `855763870172`.

> Status: application code is production-ready and tested locally (see "Verification" below).
> **No AWS resources exist yet.** Every billable resource in §3 is created only after explicit approval.

---

## 1. Architecture

```
                     Browser
                        │  https://srmcuriousbees.in
                        ▼
      Route 53 hosted zone (nameservers delegated from GoDaddy)
                        │  A/AAAA alias
                        ▼
      CloudFront  ── ACM cert (us-east-1): srmcuriousbees.in, www
       │  /_next/static/*  → cached (immutable assets)
       │  /api/*, /*       → no cache, all methods
       ▼  HTTPS to origin.srmcuriousbees.in + secret X-Origin-Verify header
      Application Load Balancer ── ACM cert (ap-south-1): origin.srmcuriousbees.in
       │  SG: 443 from CloudFront origin-facing prefix list only
       ├─ /api/*  → target group "api"  (health: /api/health/live)
       └─ default → target group "web"  (health: /healthz)
                        │
      ECS Fargate (ARM64/Graviton), public subnets, no NAT gateway
       ├─ curiousbees-api ×2  (0.5 vCPU / 1 GB)  SG: 4000 from ALB SG only
       └─ curiousbees-web ×2  (0.5 vCPU / 1 GB)  SG: 3000 from ALB SG only
                        │
       ├─ RDS PostgreSQL 17 (private/isolated subnets, SG: 5432 from API SG only)
       └─ S3 private bucket (presigned PUT/GET, Block Public Access, SSE-S3)

External: Supabase Auth (Google OAuth), Brevo (email).
Ops: CloudWatch Logs (30-day retention) + alarms, SSM Parameter Store (secrets), GitHub Actions via OIDC.
```

Key decisions (validated against the codebase — see the production readiness report):

| Decision | Why |
|---|---|
| Next.js on Fargate, not S3 static | App uses middleware, a route handler (`/auth/callback`) and SSR; `output: 'standalone'`. |
| Single origin (`/api/*` routed at ALB) | No CORS preflights for the app, cookies/redirects stay on one domain. |
| No NAT gateway | Tasks need outbound internet (Supabase, Brevo); public subnets + locked-down SGs avoid ~$41/mo + data charges. |
| No Redis / OpenSearch / Socket.IO / EventBridge | Not used by the code. Search is PostgreSQL; the one cron job takes a Postgres advisory lock so it runs once across tasks. |
| Health checks on `/api/health/live` | A database blip must not make ECS kill healthy API tasks. `/api/health` (DB check) is for alarms. |
| `TRUST_PROXY_HOPS=2` | Client → CloudFront → ALB → task. Rate limiting and logs use the real client IP; spoofed `X-Forwarded-For` is ignored. |

---

## 2. Domain & DNS

The domain is registered at **GoDaddy**; DNS is currently hosted by GoDaddy (`ns15/ns16.domaincontrol.com`) and points at Vercel.
GoDaddy DNS cannot alias the bare domain to CloudFront, so DNS hosting moves to **Route 53** (the registration stays at GoDaddy).

### 2.1 Current records (must be preserved — Brevo email depends on them)

| Type | Name | Value | Purpose |
|---|---|---|---|
| TXT | `srmcuriousbees.in` | `brevo-code:ee0da7dc4dc337bb4663198352967524` | Brevo domain verification |
| CNAME | `brevo1._domainkey` | `b1.srmcuriousbees-in.dkim.brevo.com` | Brevo DKIM |
| CNAME | `brevo2._domainkey` | `b2.srmcuriousbees-in.dkim.brevo.com` | Brevo DKIM |
| CNAME | `mail` | `mail-srmcuriousbees-in.brand.brevosend.com` | Brevo branded tracking links |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` | DMARC |
| A | `srmcuriousbees.in` | `216.198.79.1` | Current Vercel site (replaced at cutover) |
| CNAME | `www` | `8a92eb6f6063cd5b.vercel-dns-017.com` | Current Vercel site (replaced at cutover) |

Before switching nameservers, also export the full zone from GoDaddy (DNS → ⋯ → Export zone file) in case there are records not visible via public lookups.

### 2.2 Records in the new Route 53 zone

| Type | Name | Value | TTL | Purpose | When |
|---|---|---|---|---|---|
| NS (at **GoDaddy**) | `srmcuriousbees.in` | the 4 Route 53 nameservers assigned to the zone | — | Delegate DNS to Route 53 | Step D2 |
| TXT / CNAME ×4 / TXT | as in §2.1 | as in §2.1 | 3600 | Keep Brevo working | Before D2 |
| A | `srmcuriousbees.in` | `216.198.79.1` (Vercel) → later **alias to CloudFront** | 300 | Site | Vercel first, CloudFront at D4 |
| AAAA | `srmcuriousbees.in` | alias to CloudFront | — | IPv6 | D4 |
| CNAME | `www` | Vercel value → later `srmcuriousbees.in` via CloudFront alias (A/AAAA alias) | 300 | `www` → apex redirect (CloudFront function) | D4 |
| CNAME | `_<token>.srmcuriousbees.in` | `_<token>.acm-validations.aws.` | 300 | ACM validation (CloudFront cert, us-east-1) | D3 |
| CNAME | `_<token>.www.srmcuriousbees.in` | `_<token>.acm-validations.aws.` | 300 | ACM validation (www) | D3 |
| CNAME | `_<token>.origin.srmcuriousbees.in` | `_<token>.acm-validations.aws.` | 300 | ACM validation (ALB cert, ap-south-1) | D3 |
| A | `origin` | alias to the ALB | — | CloudFront → ALB origin hostname | D3 |
| CAA | `srmcuriousbees.in` | `0 issue "amazon.com"` | 3600 | Only Amazon may issue certs | Optional |

ACM `<token>` values are generated when the certificates are requested; they are added to the zone automatically if the certificate is requested with Route 53 validation.

Cutover is zero-downtime: the zone first mirrors today's records (site still on Vercel), nameservers move, and only after AWS is verified are the apex/www records switched to CloudFront.

### 2.3 Supabase / Google changes (at cutover)

- Supabase → Authentication → URL Configuration: **Site URL** `https://srmcuriousbees.in`; **Redirect URLs** add `https://srmcuriousbees.in/auth/callback`. Remove Vercel URLs once decommissioned.
- Google OAuth client: unchanged (Google redirects to Supabase, not to our domain).
- Brevo: verify the sender used in `MAIL_FROM_EMAIL` (e.g. `no-reply@srmcuriousbees.in`).

---

## 3. AWS resources and cost (ap-south-1 on-demand, AWS Pricing API, Sept 2026)

| # | Service | Resource / configuration | Est. $/month | Required |
|---|---|---|---:|---|
| 1 | IAM Identity Center | Admin user + permission set (stop using root) | 0 | Yes |
| 2 | IAM | OIDC provider, deploy role, ECS execution + API task roles | 0 | Yes |
| 3 | VPC | New VPC, 2 AZ public + 2 isolated subnets, IGW, SGs (no NAT) | 0 | Yes |
| 4 | ECR | `curiousbees-api`, `curiousbees-web`, lifecycle keep last 20 | ~0.20 | Yes |
| 5 | CloudWatch Logs | `/ecs/curiousbees-api`, `/ecs/curiousbees-web`, 30-day retention | ~2–4 | Yes |
| 6 | SSM Parameter Store | Standard SecureString `/curiousbees/prod/*` (AWS-managed key) | 0 | Yes |
| 7 | S3 | Private bucket, BPA on, SSE-S3, versioning, lifecycle, CORS | ~1–2 (50 GB) | Yes |
| 8 | RDS | PostgreSQL 17, `db.t4g.small`, Single-AZ, 20 GB gp3 (autoscale → 100 GB), 7-day backups + PITR, encrypted, deletion protection | ~33 (Multi-AZ ~67) | Yes |
| 9 | ECS Fargate | Cluster + API ×2 + web ×2, ARM64 0.5 vCPU / 1 GB | ~42 | Yes |
| 10 | Public IPv4 | 4 tasks + 2 ALB addresses × $3.65 | ~22 | Yes (no NAT) |
| 11 | ALB | 1 ALB, HTTPS listener, 2 target groups | ~23 | Yes |
| 12 | ACM | 2 public certificates | 0 | Yes |
| 13 | Route 53 | 1 hosted zone + queries | ~0.50–1 | Yes (bare domain) |
| 14 | CloudFront | 1 distribution (free tier: 1 TB + 10 M requests/month) | ~0 | Recommended |
| 15 | AWS WAF | Web ACL on CloudFront + managed rule groups | ~10 | Optional |
| 16 | CloudWatch alarms | ~8 alarms + SNS email | ~1 | Recommended |
| 17 | AWS Budgets | Monthly budget alert | 0 | Recommended (create first) |
| | **Total** | Single-AZ, without WAF | **≈ $125** | |

Cheaper variant: web ×1 task (−$14). Higher availability: RDS Multi-AZ (+$34, can be enabled later without downtime).

---

## 4. Configuration

### 4.1 API task (`infra/aws/ecs/api-task-definition.json`)

Plain environment:

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` (strict validation; boot fails on missing config) |
| `FRONTEND_URL` | `https://srmcuriousbees.in` |
| `ALLOWED_EMAIL_DOMAINS` | `gmail.com,srmist.edu.in` → later `srmist.edu.in` |
| `SUPABASE_URL` | Supabase project URL |
| `AWS_REGION` / `AWS_S3_BUCKET` | `ap-south-1` / production bucket |
| `TRUST_PROXY_HOPS` | `2` |
| `MAIL_FROM_EMAIL` | Brevo-verified sender |
| `ENABLE_CRON` | `true` (advisory lock ⇒ runs once) |
| `ENABLE_SWAGGER` | `false` |

Secrets (SSM SecureString, injected by ECS; never in GitHub, images or the repo):

| Parameter | Content |
|---|---|
| `/curiousbees/prod/DATABASE_URL` | `postgresql://curiousbees_app:<pw>@<rds-endpoint>:5432/curiousbees?schema=public&sslmode=require&connection_limit=5` |
| `/curiousbees/prod/DIRECT_URL` | same without `connection_limit` |
| `/curiousbees/prod/SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `/curiousbees/prod/BREVO_API_KEY` | Brevo API key |
| (optional) `GOOGLE_CLIENT_ID/SECRET`, `ZOOM_CLIENT_ID/SECRET` | Only if integrations are enabled; add to the task definition's `secrets` |

### 4.2 Web task (`infra/aws/ecs/web-task-definition.json`)

Runtime: `APP_URL=https://srmcuriousbees.in` (all redirects), `ALLOWED_EMAIL_DOMAINS`.
Build args (public, in the browser bundle): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL` (both the site URL), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS`.

### 4.3 GitHub (`production` environment → variables, no secrets needed)

| Variable | Example |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::855763870172:role/curiousbees-github-deploy` |
| `AWS_ACCOUNT_ID` | `855763870172` |
| `S3_BUCKET` | production bucket name |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | public Supabase values |
| `ALLOWED_EMAIL_DOMAINS` | `gmail.com,srmist.edu.in` |
| `MAIL_FROM_EMAIL` | `no-reply@srmcuriousbees.in` |
| `ECS_SUBNETS` | comma-separated public subnet IDs |
| `ECS_API_SECURITY_GROUP` | API task security group ID |
| `BOOTSTRAP_ADMIN_EMAIL` | first institute admin (used only while no admin exists) |
| `ARM_RUNNER` (optional) | override for the ARM64 runner label |

Protect the environment: *Settings → Environments → production → Required reviewers* and *Deployment branches: main*. The IAM trust policy only accepts tokens for `repo:SRM-Curiousbees/Curiousbees:environment:production`.

### 4.4 Admin accounts

- The permanent root admin **`srmcuriousbees@gmail.com`** is defined in code (`apps/api/src/auth/email-policy.ts`): it is always allowed to sign in regardless of `ALLOWED_EMAIL_DOMAINS`, is auto-provisioned as institute admin, and cannot be demoted or removed. Protect that Google account with 2-Step Verification.
- `BOOTSTRAP_ADMIN_EMAIL` (optional) creates an additional first admin on an empty database.
- Everyone else is created in the Admin Panel. Sign-in = allowed domain **and** an admin-created, non-blocked account.

---

## 5. First deployment (each billable step requires approval)

**A. Account safety**
1. Create an AWS Budget with email alerts (e.g. $150/month).
2. Enable IAM Identity Center (ap-south-1), create user + `AdministratorAccess` permission set, assign to account `855763870172`, enable MFA.
3. Locally: `aws configure sso --profile curiousbees-admin`, then use that profile. Keep root (MFA on) for account-level tasks only.

**B. Identity for CI/CD** — create OIDC provider `token.actions.githubusercontent.com`, roles `curiousbees-github-deploy` (trust: `infra/aws/iam/github-oidc-trust-policy.json`, policy: `github-deploy-policy.json`), `curiousbees-ecs-execution` (AWS managed `AmazonECSTaskExecutionRolePolicy` + `ecs-execution-role-policy.json`), `curiousbees-api-task` (`api-task-role-policy.json`). Render templates with `infra/aws/scripts/render.sh`.

**C. Core infrastructure** (approve individually): VPC + security groups → ECR repos → log groups → S3 bucket (BPA, `s3/bucket-policy.json`, `s3/cors.json`, `s3/lifecycle.json`, versioning, SSE-S3, ownership `BucketOwnerEnforced`) → RDS (+ create app DB user, store URLs in SSM) → SSM parameters → ECS cluster.

**D. Traffic**
1. Route 53 hosted zone; copy §2.1 records (A/www still → Vercel).
2. At GoDaddy: replace nameservers with the 4 Route 53 NS. Wait for propagation (`dig NS srmcuriousbees.in`).
3. ACM certs (us-east-1 for apex+www, ap-south-1 for `origin.`) with Route 53 validation; ALB + target groups + HTTPS listener (+ origin-verify header rule); `origin` alias record.
4. First image build/push + migrate + ECS services (via the pipeline or manually); run `infra/aws/verify-deployment.sh` against `https://origin.srmcuriousbees.in` equivalents; then CloudFront; switch apex/www A/AAAA to the CloudFront alias; update Supabase URLs.
5. Run `APP_URL=https://srmcuriousbees.in S3_BUCKET=… infra/aws/verify-deployment.sh`.

**E. Afterwards** — CloudWatch alarms (ALB 5xx, target unhealthy, RDS CPU/storage/connections, ECS CPU/memory), optional WAF, decommission Vercel.

---

## 6. Routine deployment (GitHub Actions)

`push to main` → **validate** (lint, typecheck, unit + integration tests on fresh Postgres + S3 emulator, migration drift check, production builds) → **images** (ARM64, pushed to ECR as `:<git-sha>`) → **deploy** (after reviewer approval):

1. Register the API task definition for the new image.
2. One-off Fargate task: `prisma migrate deploy` + idempotent reference seed (`infra/aws/scripts/run-migrations.sh`). Deployment stops if it fails.
3. Rolling update of `curiousbees-api`, then `curiousbees-web` (min 100 % healthy, deployment circuit breaker with automatic rollback).
4. Health check `/api/health/live`, `/api/health`, `/healthz` on the public URL.

Never run `prisma migrate reset`, `prisma db push` or `--force-reset` against production.

---

## 7. Rollback

**Application (no schema change involved)**
- Automatic: the ECS deployment circuit breaker rolls back a deployment whose tasks fail health checks.
- Manual: `aws ecs update-service --cluster curiousbees-prod --service curiousbees-api --task-definition curiousbees-api:<previous-revision>` (same for web), or re-run the workflow for an older commit.

**Database**
- Migrations are forward-only. Prefer a new corrective migration.
- Write migrations to be backward compatible (expand → deploy → contract) so the previous image keeps working if the app is rolled back.
- Data recovery: RDS point-in-time restore (7-day window) to a **new** instance, verify, then repoint `DATABASE_URL`/`DIRECT_URL` in SSM and redeploy. Take a manual snapshot before risky migrations.

**DNS / edge**
- Until Vercel is decommissioned, pointing the apex/www records back to the Vercel values (TTL 300) restores the old site.

---

## 8. Operations

| Task | How |
|---|---|
| Logs | CloudWatch Logs Insights on `/ecs/curiousbees-api` (JSON, includes `requestId`, real client IP) |
| Health | `GET /api/health` (DB), `/api/health/live`, `/healthz` |
| Add a user | Admin Panel → Users → Add (email, role, faculty, department) |
| Tighten sign-in to SRM only | Set `ALLOWED_EMAIL_DOMAINS=srmist.edu.in` (task definition + GitHub variable) and redeploy. No code change. |
| Rotate a secret | Update the SSM parameter, then *Force new deployment* on the service |
| Scale | Change desired count / task size on the ECS service |

---

## 9. Verification performed before any AWS work

- Fresh PostgreSQL 17: `prisma migrate deploy` of the single baseline migration creates all 53 tables, 20 enums and 84 foreign keys; `prisma migrate diff` vs `schema.prisma` reports no drift.
- 57 unit tests and 36 integration tests (real Postgres, S3 emulator with signature validation, production HTTP pipeline).
- Production images built and smoke-tested behind an ALB-style proxy (migrations + seed from the image, fail-fast config, health checks, redirects pinned to `APP_URL`, security headers, graceful shutdown).
