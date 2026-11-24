# CuriousBees — Practical Low-Cost Deployment Analysis & SRM Budget Proposal

**Target Region:** `ap-south-1` (Mumbai) | **Currency Reference:** `1 USD = ₹92.92 INR` (Nov 24, 2026)  
**Cost Model:** Lowest practical operating cost with acceptable security, reliability, and clear scale path.

---

## 1. Capacity Targets (Planning Estimates — Not Verified Live Claims)

| Plan | Registered Users | Target Concurrent Users | Estimated MAU (45%–65%) | Target Monthly Cloud Cost (Incl. 15% Cont + 18% GST) |
| :--- | :---: | :---: | :---: | :---: |
| **Base** | 1,000 | 250 | 450 – 650 | **`$52.25` (`₹4,855/mo`)** |
| **Growth** | 5,000 | 1,000 | 2,200 – 3,200 | **`$118.13` (`₹10,976/mo`)** |
| **Institutional** | 10,000 | 2,500 | 4,500 – 6,500 | **`$465.59` (`₹43,262/mo`)** |

---

## 2. Repository Performance & Resource Risk Findings

Direct inspection of `apps/api`, `apps/web`, `apps/api/prisma/schema.prisma`, and [`scripts/load/curiousbees.k6.js`](../../../scripts/load/curiousbees.k6.js) shows:

1. **Low Background Polling Overhead (Positive):** Only [`verification-pending/page.tsx`](../../../apps/web/src/app/(auth)/verification-pending/page.tsx#L53) polls (`5s` interval). The main portal has **no** background feed/notification polling, keeping idle concurrent users near `0 RPS`.
2. **Direct S3 Presigned Transfers (Positive):** [`files.service.ts`](../../../apps/api/src/files/files.service.ts) issues presigned `PUT`/`GET` URLs directly to AWS S3 (`50 MB` cap), eliminating binary file bandwidth through the NestJS server.
3. **k6 Traffic Profile (`curiousbees.k6.js`):** Models `2–8s` user think time (`~0.2 RPS` per active concurrent user) with **`91%` reads / `9%` writes**. Portal open fires 4 initial GETs (`/api/auth/me`, `/api/opportunities`, `/api/events`, `/api/threads`).
4. **Search Query Risk:** `FeedService.searchFeed` uses Prisma `contains(..., mode: 'insensitive')` (`ILIKE '%term%'`) across `Thread`, `Publication`, and `User` when `OPENSEARCH_ENDPOINT` is unset. Standard B-tree indexes do not accelerate leading-wildcard `ILIKE` — monitor DB CPU or add PostgreSQL `pg_trgm` GIN indexes before enabling heavy search at Institutional scale.
5. **Auth Verification Latency:** `SupabaseAuthGuard` verifies Bearer tokens via `SupabaseService.verifyToken` + Prisma `User` lookup on every authenticated request. Keeping compute in `ap-south-1` (same region as Supabase) keeps RTT low.
6. **In-Memory Rate Limiting:** [`rate-limits.ts`](../../../apps/api/src/common/throttling/rate-limits.ts) stores counters in-memory per API instance (`300/min` read, `60/min` write, `6000/min` IP total). Single-instance Base & Growth work cleanly without Redis; Institutional (2+ API instances) should add Redis/Valkey (`t4g.micro`).

---

## 3. Realistic Workload Profiles

| Workload Profile | Traffic Behavior | Base (250 Conc.) | Growth (1,000 Conc.) | Institutional (2,500 Conc.) |
| :--- | :--- | :---: | :---: | :---: |
| **A. Normal Usage** | 15%–30% of peak concurrency active during working hours | `8–16 RPS` | `36–64 RPS` | `80–150 RPS` |
| **B. Peak Usage** | Full target concurrency at `~0.2 RPS/user` (k6 model) | `~50 RPS` | `~200 RPS` | `~500 RPS` |
| **C. Short Burst** | Simultaneous logins / announcement opens (4 GETs on load) | `~90 RPS` | `~350 RPS` | `~850 RPS` |

---

## 4. Cost-First Architecture (Option A — Supabase + Lightweight Compute)

Instead of overengineering Base with AWS ECS Fargate + ALB + CloudFront (`~$194/mo`), Option A uses **AWS EC2 Graviton (`t4g`) in `ap-south-1` running Docker Compose + Caddy/Nginx auto-TLS** alongside **Supabase Pro**, **AWS S3**, and **Brevo**:

| Component | Base (1,000 / 250) | Growth (5,000 / 1,000) | Institutional (10,000 / 2,500) |
| :--- | :--- | :--- | :--- |
| **Application Compute** | 1 × EC2 `t4g.small` (2 vCPU, 2 GB) + 20 GB EBS (`$10.00`) | 1 × EC2 `t4g.medium` (2 vCPU, 4 GB) + 30 GB EBS (`$21.05`) | 2 × EC2 `t4g.medium` Multi-AZ + EBS (`$38.10`) + ALB (`$22.00`) |
| **Shared Cache / Throttle** | Not needed (in-memory) | Not needed (in-memory) | ElastiCache Valkey `t4g.micro` (`$12.00`) |
| **Supabase Auth + Postgres** | Supabase Pro (`$25.00`, 100k MAU, 8 GB DB, 250 GB egress) | Supabase Pro + Small Compute (`$35.00`) | Supabase Pro + Medium Compute + PITR (`$190.00`) |
| **AWS S3 + Presigned Egress** | 50 GB + 25 GB egress (`$3.50`) | 200 GB + 100 GB egress (`$14.00`) | 500 GB + 250 GB egress (`$35.00`) |
| **Brevo Email** | Free tier (`$0.00`, 300/day) | Starter (`$17.00`) | Starter/Standard (`$46.00`) |
| **Monthly Subtotal** | **`$38.50` (`₹3,577`)** | **`$87.05` (`₹8,089`)** | **`$343.10` (`₹31,881`)** |
| **Total (Incl. 15% Cont + 18% GST)** | **`$52.25` (`₹4,855/mo`)** | **`$118.13` (`₹10,976/mo`)** | **`$465.59` (`₹43,262/mo`)** |
| **Annual Total (Incl. Cont + GST)** | **`$626.94` (`₹58,255/yr`)** | **`$1,417.52` (`₹1,31,716/yr`)** | **`$5,587.04` (`₹5,19,148/yr`)** |

*Alternative PaaS Note:* Railway Hobby/Pro (`$20–$45/mo` compute) + Vercel Hobby/Pro can replace EC2 if SRM prefers zero VM patching, at ~$15–$30/mo higher compute cost than `t4g.small`.
