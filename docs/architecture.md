# CuriousBees V2 — Architecture Specification

## 1. System Overview
CuriousBees is an institutional academic research collaboration, Ph.D. supervision, and governance platform for the SRMIST academic ecosystem.

### Target Scale
* **Registered Base:** ~15,000 academic users (scholars, supervisors, institute administrators).
* **Target Concurrency:** Designed for a target peak concurrency of approximately 5,000 users, *subject to production load testing and measured application/database performance.*

---

## 2. High-Level Topology

```
                         Internet
                            │
                            ▼
                  Cloudflare / Route 53
                  (DNS, SSL Termination, DDoS)
                            │
                            ▼
              AWS Application Load Balancer (ALB)
              ├── Port 443 (HTTPS) -> TLS termination
              └── Port 80  (HTTP)  -> Redirect 301 to HTTPS
                            │
           ┌────────────────┴────────────────┐
           ▼                                 ▼
   Path: /api/*                      Path: /* (Default)
   Target Group: Backend             Target Group: Frontend
   Port: 4000                        Port: 3000
   Instances: NestJS (Auto Scaling)  Instances: Next.js (Auto Scaling)
           │                                 │
           └────────────────┬────────────────┘
                            ▼
             AWS RDS PostgreSQL (Multi-AZ)
                            ▲
                            │ Direct presigned URL uploads
             AWS S3 (Private Bucket, KMS encrypted)
```

---

## 3. Component Architecture

### 3.1 Frontend (Next.js 15)
* **Framework:** Next.js 15 App Router running React 19 and Zustand.
* **Packaging:** `output: 'standalone'` in `next.config.ts` compiled into an Alpine Linux container image (~180MB) executed with non-root user `nextjs`.
* **State Management:** Stateless across instances; user session tokens stored client-side via Supabase Auth and sent via standard HTTP headers.

### 3.2 Backend API (NestJS 11)
* **Framework:** NestJS 11 with Express adapter.
* **Lifecycle & Readiness:**
  - `GET /health/live` returns process liveness.
  - `GET /health/ready` actively queries PostgreSQL (`SELECT 1`) with db latency tracking. Returns HTTP 503 if disconnected.
* **Rate Limiting:** `@nestjs/throttler` with tiered thresholds (120 req/min general, 10-30 req/min for auth, upload, and search).
* **Logging:** Structured JSON logs streamed to `stdout`/`stderr` with `x-request-id` correlation for CloudWatch ingestion.

### 3.3 Database Layer (PostgreSQL / AWS RDS)
* **ORM:** Prisma Client with singleton connection lifecycle.
* **Connection Pooling:** Controlled via query parameters (`connection_limit=25`, `pool_timeout=15`).
* **Optimized Indexes:**
  - `User`: `(role, status)`, `(departmentId)`, `(createdAt)`
  - `Thread`: `(hidden, createdAt)`, `(type, createdAt)`
  - `Publication`: `(hidden, createdAt)`, `(userId, createdAt)`
  - `Notification`: `(userId, createdAt)`
  - `Comment`: `(threadId, createdAt)`

### 3.4 Storage Layer (AWS S3)
* **Design:** Direct browser-to-S3 uploads via presigned URLs.
* **Flow:**
  1. Browser calls `POST /api/files/presigned-upload`.
  2. NestJS validates authentication, MIME type whitelist, and size limit (<= 50MB).
  3. NestJS issues an encrypted presigned PUT URL (`expiresIn: 900s`).
  4. Browser PUTs directly to S3.
  5. S3 bucket remains strictly private with server-side AES256 encryption.
