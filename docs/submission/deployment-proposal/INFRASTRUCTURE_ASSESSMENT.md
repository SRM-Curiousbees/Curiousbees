# CuriousBees — SRM Institutional Infrastructure Assessment & Three-Tier Proposal

**Target Institution:** SRM Institute of Science and Technology (ITKM)  
**Currency Reference:** 1 USD = ₹92.92 INR (Nov 24, 2026)  
**Important Caveat:** The target concurrency levels (**500 / 2,500 / 5,000 concurrent users**) are **institutional capacity objectives**, not verified performance claims. Live load testing against deployed infrastructure is required before guaranteeing any SLA.

---

## 1. Three Required Deployment Plans (Definitions)

| Plan | Registered Users | Target Concurrent Users | Estimated MAU (~70%) |
| :--- | :---: | :---: | :---: |
| **Base** | 1,500 | 500 | ~1,050 |
| **Growth** | 5,000 | 2,500 | ~3,500 |
| **Institutional** | 10,000 | 5,000 | ~7,000 |

* **Registered Users:** Total provisioned accounts in PostgreSQL (`User`).
* **Concurrent Users:** Users actively holding sessions simultaneously.
* **Monthly Active Users (MAU):** Distinct users active in a 30-day window.
* **Requests Per Second (RPS):** Incoming HTTP requests/sec hitting the API/CDN.

---

## 2. Repository Architecture & Bottleneck Assessment (Verified Code)

* **Stack Discovered:** Next.js 15 (`apps/web`, standalone Docker output) + NestJS 11 (`apps/api`) + Prisma ORM v6.19.3 (54 models, 21 enums) + Supabase Auth/PostgreSQL + AWS S3 (`FilesService`) + Brevo (`MailService`) + optional n8n event webhook (`N8nEventsController`).
* **Verified Bottlenecks & Scaling Considerations:**
  1. **Client-Side Feed Filtering (`apps/web/src/app/(portal)/feed/page.tsx`):** `GET /api/threads` returns `take <= 50` (default 20) with `comments` (top 3) + attachments + counts; `For you`/`Following` tabs filter/score in browser `useMemo`. Moving to server-side feeds will increase SQL join/filter load.
  2. **In-Memory Rate Limiting (`apps/api/src/common/throttling/rate-limits.ts`):** `@nestjs/throttler` stores per-session (`sha256(token)`) and per-IP counters **in memory per API instance**. Scaling beyond 1 API instance requires a shared Redis/Valkey store for consistent rate limiting.
  3. **Auth Token Verification (`apps/api/src/auth/supabase.guard.ts`):** Every authenticated API request calls `SupabaseService.verifyToken(token)` (remote Supabase Auth check unless cached). High RPS increases auth latency and Supabase Auth rate-limit pressure.
  4. **Trending & Search Queries (`apps/api/src/feed/feed.service.ts`):** `getTrendingResearch` scans the latest 100 threads + all `ResearchInterest` rows; `searchFeed` runs ILIKE queries across `Thread`, `Publication`, and `User` when `OPENSEARCH_ENDPOINT` is unset.
  5. **Daily Digest Cron (`apps/api/src/notifications/digest.scheduler.ts`):** Uses `pg_try_advisory_xact_lock` so multi-instance ECS deployments safely run only once (`ENABLE_CRON=true`).
  6. **Resolved in Phase 1B:** Per-card collaboration status waterfall (`ResearchPostCard`) was batched via `GET /api/collaborations/statuses` (capped at 50 IDs).

---

## 3. Workload & Capacity Model (Assumptions Requiring k6 Validation)

| Metric | Base (500 Conc.) | Growth (2,500 Conc.) | Institutional (5,000 Conc.) |
| :--- | :---: | :---: | :---: |
| **Active Requesting Users (~20% of Concurrent)** | 100 | 500 | 1,000 |
| **Normal Sustained RPS (~9 req/min/active)** | 15 RPS | 75 RPS | 150 RPS |
| **Peak Sustained RPS (3× Normal)** | 45 RPS | 225 RPS | 450 RPS |
| **Short Burst RPS (3× Peak)** | 135 RPS | 675 RPS | 1,350 RPS |
| **Read : Write Ratio** | 85 : 15 | 85 : 15 | 85 : 15 |
| **S3 Storage Footprint / Growth** | 100 GB (~10 GB/mo) | 500 GB (~40 GB/mo) | 1,500 GB (~100 GB/mo) |
| **CloudFront Egress / Month** | 150 GB | 600 GB | 1,500 GB |
| **Monthly Transactional Emails (Brevo)** | ~8,000 | ~35,000 | ~90,000 |

---

## 4. Infrastructure Architecture Comparison (Option A vs. Option B)

| Criterion | Option A: Supabase (Auth + DB) + AWS (`ap-south-1`) **(RECOMMENDED)** | Option B: AWS-Centric (ECS + RDS + Cognito/Self-Auth) |
| :--- | :--- | :--- |
| **Monthly Cost** | Lowest entry cost ($143/mo Base); predictable compute tiers. | Higher baseline (`db.t4g.medium` + ALB + NAT + Auth engineering). |
| **Code Compatibility** | **100% native** to existing `SupabaseAuthGuard`, `SupabaseService`, and `FilesService` (S3). | Requires rewriting `SupabaseAuthGuard` & Next.js SSR auth (`@supabase/ssr`) if replacing Supabase Auth. |
| **Network & Latency** | Public TLS (`pgbouncer=true`) between AWS Mumbai ECS and Supabase Mumbai (`ap-south-1`)—sub-5ms intra-region, no cross-region egress if both pinned to `ap-south-1`. | Full private VPC peering between ECS and RDS. |
| **Operational Complexity** | Low (Supabase manages Postgres, Auth, PgBouncer, PITR). | High (VPC, RDS patching, Cognito migration, custom auth testing). |

**Recommendation:** **Option A (Supabase Auth + Managed PostgreSQL in `ap-south-1` + AWS ECS Fargate + AWS S3 + CloudFront)** is recommended for SRM because it preserves 100% of existing verified authentication and storage code, avoids costly auth rewrites, and scales cleanly from Base to Institutional.

---

## 5. Three-Tier Infrastructure Bill of Materials & Budget Summary

*(All figures match `THREE_TIER_BUDGET.xlsx`. Contingency = 15%; GST = 18%. USD/INR = ₹92.92.)*

| Component | Base (1,500 / 500) | Growth (5,000 / 2,500) | Institutional (10,000 / 5,000) |
| :--- | :---: | :---: | :---: |
| **Frontend (AWS ECS Fargate)** | 1–2 tasks (0.5 vCPU, 1 GB) — $19.00 | 2–4 tasks (avg 2 × 0.5 vCPU, 1 GB) — $38.00 | 3–8 tasks (avg 4 × 1 vCPU, 2 GB) — $152.00 |
| **Backend (AWS ECS Fargate)** | 1–2 tasks (1 vCPU, 2 GB) — $38.00 | 2–6 tasks (avg 3 × 1 vCPU, 2 GB) — $114.00 | 4–12 tasks (avg 6 × 1 vCPU, 2 GB) — $228.00 |
| **Load Balancer (AWS ALB)** | 1 ALB (~1 LCU) — $23.50 | 1 ALB (~4 LCU) — $41.00 | 1 ALB (~8 LCU) — $64.00 |
| **Database & Auth (Supabase)** | Pro + Small (2 GB RAM) — $30.00 | Pro + Large (8 GB) + PITR — $229.00 | Pro + XL (16 GB) + Replica + PITR — $546.50 |
| **Object Storage (AWS S3)** | 100 GB — $2.50 | 500 GB — $12.50 | 1,500 GB — $37.50 |
| **CDN & Egress (CloudFront)** | 150 GB — $5.00 | 600 GB — $50.00 | 1,500 GB — $140.00 |
| **Cache (ElastiCache Valkey)** | In-memory ($0.00) | `t4g.small` ($25.00) | `m6g.large` Multi-AZ ($180.00) |
| **Email (Brevo)** | Starter 10k ($17.00) | Starter 40k ($46.00) | Business 100k+ ($95.00) |
| **Monitoring & Security** | CloudWatch ($8.00) | CloudWatch + WAF ($35.00) | CloudWatch + WAF/GuardDuty ($80.00) |
| **Monthly Infra Subtotal (Excl. Cont/GST)** | **$143.00 (₹13,288)** | **$590.50 (₹54,869)** | **$1,523.00 (₹1,41,517)** |
| **Monthly Total (Incl. 15% Cont + 18% GST)** | **$194.05 (₹18,031)** | **$801.31 (₹74,458)** | **$2,066.71 (₹1,92,039)** |
| **Annual Total (Incl. 15% Cont + 18% GST)** | **$2,328.61 (₹2,16,375)** | **$9,615.70 (₹8,93,491)** | **$24,800.53 (₹23,04,465)** |
| **One-Time Setup (Excl. GST, Separate)** | **₹1,25,000** | **₹2,25,000** | **₹3,50,000** |
| **Optional Monthly Support (Excl. GST)** | **₹25,000 / mo** | **₹45,000 / mo** | **₹75,000 / mo** |
| **Cloud Cost / Registered User / Mo** | **₹12.02** | **₹14.89** | **₹19.20** |
| **Cloud Cost / Target Concurrent / Mo** | **₹36.06** | **₹29.78** | **₹38.41** |

---

## 6. Reliability, Security & Phased Rollout Roadmap

* **Indicative Availability Objectives (Pending SRM Approval, Not Guaranteed SLAs):** Base `99.5%` (Single-AZ DB/single task risk), Growth `99.9%` (multi-task + PITR), Institutional `99.95%` (multi-AZ cache + read replica + autoscaling).
* **Security Controls:** TLS 1.2+ via ACM/CloudFront, S3 Block Public Access + presigned URLs, AWS Secrets Manager / ECS task env, Helmet headers, `SupabaseAuthGuard`, `ResearchParticipantGuard`, and immutable `AuditLog`.
* **Phased Rollout (Separate from Software Dev):**
  1. *Phase 1 (1–2 wks):* AWS & Supabase Mumbai (`ap-south-1`) staging provisioning.
  2. *Phase 2 (1 wk):* Production secrets, S3 CORS, OAuth callbacks, and security review.
  3. *Phase 3 (1–2 wks):* Base Plan deployment + `500` concurrent k6 validation.
  4. *Phase 4 (1 wk):* Growth Plan scaling (`2,500` concurrent k6 + ElastiCache Valkey).
  5. *Phase 5 (1–2 wks):* Institutional scaling (`5,000` concurrent k6 + Read Replica).
  6. *Phase 6 (Ongoing):* CloudWatch alerts, quarterly backup restore drills, and cost optimization.
