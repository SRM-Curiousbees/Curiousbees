# CuriousBees — Production Capacity, Usage Tiers & Cost Analysis

This document provides the authoritative engineering capacity, usage limits, and monthly cloud cost analysis for **CuriousBees V2**.

---

## 1. Executive Summary

CuriousBees is an institutional academic collaboration platform composed of:
* **Frontend:** Next.js 15 App Router, React 19, Zustand, TanStack React Query, Tailwind CSS.
* **Backend:** NestJS 11 REST API, in-memory async job processing (Stateless compute).
* **Conferencing & Meetings:** Google Workspace (Google Meet, Google Chat) and Zoom Workplace integrations.
* **Database:** PostgreSQL 15+ managed via Prisma ORM 6.19 with PgBouncer connection pooling.
* **Object Storage:** **Amazon S3 (Fixed)** for research papers, thesis PDFs, evidence files, and media.
* **Authentication:** Supabase Auth (GoTrue) with Google Workspace OAuth (`srmist.edu.in` domain restriction).
* **Email:** Brevo REST API for transactional alerts and supervisor notices.

---

## 2. Infrastructure Sizing & Cost Model

### Fixed vs. Variable Cost Allocation

| Component | Provider / Technology | Pricing Model | Monthly Cost (INR) |
|---|---|---|---:|
| **Frontend Web Hosting** | Vercel / Node Container | Fixed compute / Free tier | **₹0 – ₹1,290** |
| **Backend API Server** | Railway / Linux VPS (Node 22) | Fixed compute (1–2 vCPU, 1–4GB RAM) | **₹430 – ₹2,580** |
| **PostgreSQL Database** | Managed PostgreSQL + PgBouncer | Fixed compute & NVMe SSD | **₹430 – ₹2,580** |
| **Amazon S3 Object Storage** | Amazon S3 Standard Tier | $0.023 / GB / month | **₹55 – ₹625** |
| **Amazon S3 Bandwidth** | AWS CloudFront Edge CDN | 1 TB/month Free Tier | **₹0** |
| **Supabase Auth** | GoTrue Identity Service | Free up to 50,000 MAUs | **₹0** |
| **Transactional Email** | Brevo HTTPS REST API | Tiered (Free 9k $\rightarrow$ Starter 20k–40k) | **₹0 – ₹1,290** |
| **Observability & Logging** | Sentry Developer + BetterStack | Free tier | **₹0 – ₹430** |
| **Domain & SSL** | Institutional DNS + Let's Encrypt | Fixed | **₹100** |

---

## 3. Production Usage Plans

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CURIOUSBEES PRODUCTION USAGE TIERS                              │
├───────────────────────────────┬────────────────────┬───────────────────┬───────────────┤
│ Metric                        │ Plan 1: BASE       │ Plan 2: STANDARD  │ Plan 3: SCALE │
├───────────────────────────────┼────────────────────┼───────────────────┼───────────────┤
│ Target Monthly Budget         │ ₹1,500 – ₹3,000    │ ₹3,000 – ₹4,500   │ ₹4,500 – ₹6,500│
│ Estimated Infrastructure Cost │ ₹1,850 / mo ($21)  │ ₹3,950 / mo ($46) │ ₹6,150 / mo ($72)│
│ Peak Concurrent Users (PCU)   │ 30 – 50 Users      │ 100 – 150 Users   │ 250 – 350 Users│
│ Average Concurrent Users      │ 8 – 15 Users       │ 25 – 40 Users     │ 70 – 100 Users│
│ Daily Active Users (DAU)      │ 250 – 400 DAU      │ 800 – 1,200 DAU   │ 2,000 – 3,000 │
│ Monthly Active Users (MAU)    │ 1,000 – 1,500 MAU  │ 3,500 – 5,000 MAU │ 8,000 – 12,000│
│ Maximum Registered Users      │ 2,500 – 3,500      │ 8,000 – 12,000    │ 20,000 – 30,000│
│ Steady API Throughput         │ 5 – 8 RPS          │ 18 – 25 RPS       │ 40 – 60 RPS   │
│ Peak Burst API Throughput     │ 25 RPS             │ 75 RPS            │ 175 RPS       │
│ PostgreSQL Query Load (QPS)   │ 15 – 35 QPS        │ 45 – 70 QPS       │ 100 – 160 QPS │
│ Database Sizing               │ 1 vCPU / 1 GB RAM  │ 2 vCPU / 4 GB RAM │ 2–4 vCPU / 8GB│
│ Amazon S3 Storage Allowance   │ 25 GB              │ 100 GB            │ 300 GB        │
│ Monthly S3 Egress Traffic     │ 50 GB              │ 150 GB            │ 450 GB        │
│ Monthly Email Volume (Brevo)  │ Up to 9,000 (Free) │ Up to 20,000      │ Up to 50,000  │
│ Safety Headroom Buffer        │ 35% Headroom       │ 38% Headroom      │ 42% Headroom  │
└───────────────────────────────┴────────────────────┴───────────────────┴───────────────┘
```

---

## 4. Architectural Advantages of Pure Stateless REST

1. **Seamless Horizontal Scaling:** Without stateful WebSocket connections, backend API instances can scale horizontally behind any standard round-robin load balancer (Nginx / AWS ALB / Cloudflare) with zero session stickiness or Redis pub/sub adapters required.
2. **Reduced Server Memory Footprint:** Eliminates persistent socket connection memory allocations, keeping API memory usage predictable under heavy concurrent scholar browsing.
3. **Enterprise Institutional Compliance:** Audio, video, and persistent chat are delegated to official Google Workspace and Zoom enterprise domains, ensuring compliance with institutional data governance policies.
4. **CloudFront CDN Shield:** Amazon S3 object downloads remain fronted by **AWS CloudFront**, guaranteeing $0 bandwidth costs under the 1 TB monthly free tier.

---

## 5. Scaling Triggers

Transition between tiers based on the following automated thresholds:

* **Upgrade to Standard Tier when:**
  - Sustained Peak Concurrent Users $> 45$ for $> 15\text{ minutes}$.
  - Database CPU utilization $> 70\%$ sustained.
  - S3 Storage exceeds $22\text{ GB}$.
  - Daily email volume exceeds $280\text{ emails/day}$ (approaching Brevo's 300 free cap).
* **Upgrade to Scale Tier when:**
  - Sustained Peak Concurrent Users $> 140$ for $> 15\text{ minutes}$.
  - Database connection pool utilization $> 75\%$.
  - S3 Storage exceeds $90\text{ GB}$.
  - Monthly email volume exceeds $18,000\text{ emails/month}$.
