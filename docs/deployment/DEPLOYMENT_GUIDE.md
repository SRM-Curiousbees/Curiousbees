# CuriousBees V2 — Production Deployment & Infrastructure Runbook

This guide describes how to deploy and configure CuriousBees V2 for local development, containerized environments, and cloud production hosting across our three infrastructure capacity tiers.

---

## 💻 1. Local Development Setup

CuriousBees is built as an npm workspace monorepo. Ensure you have **Node.js >= 22** and **npm >= 10** installed.

```bash
# 1. Clone repository
git clone <curiousbees-repo-url>
cd CuriousBees_V2

# 2. Reset workspace dependencies cleanly
npm run reset

# 3. Start local PostgreSQL background container
npm run docker:up

# 4. Copy environment configuration
cp .env.example .env

# 5. Build packages and generate Prisma client
npm run setup

# 6. Run diagnostics check
npm run doctor

# 7. Start development servers
npm run dev
```

* **Web Application:** [http://localhost:3000](http://localhost:3000)
* **REST API Backend:** [http://localhost:4000](http://localhost:4000)
* **Swagger API Documentation:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## 🐳 2. Production Docker Containers

CuriousBees provides optimized multi-stage Docker builds for standalone server or VPS deployments:

### Build & Run API Container
```bash
docker build -t curiousbees-api -f Dockerfile.api .
docker run -d -p 4000:4000 --env-file .env --name cb-api curiousbees-api
```

### Build & Run Web Container
```bash
docker build -t curiousbees-web -f Dockerfile.web .
docker run -d -p 3000:3000 --env-file .env --name cb-web curiousbees-web
```

---

## ☁️ 3. Cloud Production Deployment Architecture

```mermaid
flowchart LR
    A[Vercel / Next.js Web] -->|HTTPS REST & WSS| B[Railway / VPS API Server]
    B -->|PgBouncer: 6543| C[(PostgreSQL Database)]
    B -->|Verify JWT| D[Supabase Auth]
    B -->|HTTPS POST| E[Brevo Email API]
    A -->|Direct Upload & Download| F[Amazon S3 + CloudFront CDN]
```

### Step 1: Database Setup (PostgreSQL with PgBouncer)
1. Provision a PostgreSQL 15+ instance (e.g. Supabase, Railway, or managed VPS).
2. Configure **PgBouncer** connection pooling:
   - `DATABASE_URL`: Connection string with pooling enabled (port `6543`, `pgbouncer=true`).
   - `DIRECT_URL`: Direct session connection string (port `5432`) used for running schema migrations.
3. Deploy migrations:
   ```bash
   npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
   npm run db:seed
   ```

### Step 2: Object Storage Setup (Amazon S3 + CloudFront)
1. Create an **Amazon S3** bucket (e.g., `curiousbees-production-assets`).
2. Configure CORS rules on S3 to allow uploads from `https://your-frontend-domain.com`.
3. Set up an **AWS CloudFront** distribution pointing to the S3 bucket origin. This provides edge caching and grants access to AWS's **1 TB/month free data transfer out tier**.
4. Configure S3 bucket lifecycle rules to transition archived research drafts to S3 Standard-Infrequent Access after 90 days.

### Step 3: Identity & Authentication (Supabase Auth)
1. In the Supabase project dashboard, navigate to **Authentication > Providers**.
2. Enable **Google OAuth** and add your Google Cloud OAuth Client ID and Secret.
3. In redirect URLs, add:
   - `https://your-frontend-domain.com/auth/callback`
   - `https://your-frontend-domain.com/sso-callback`
4. Set `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS="srmist.edu.in"` in environment variables.

### Step 4: Transactional Email Gateway (Brevo)
1. Sign up on [Brevo](https://brevo.com) and generate an API key (`xkeysib-...`).
2. Verify your institutional sender domain/email (`notifications@curiousbees.srmist.edu.in`).
3. Set `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, and `MAIL_FROM_NAME` in API environment variables.

### Step 5: Backend API Deployment (Railway / Container VPS)
1. Connect your repository to **Railway** (or AWS Lightsail / Hetzner VPS).
2. Set root directory to `/` and select `Dockerfile.api`.
3. Set environment variables:
   ```env
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=postgresql://postgres:password@pooler-host:6543/curiousbees_db?pgbouncer=true
   DIRECT_URL=postgresql://postgres:password@direct-host:5432/curiousbees_db
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   BREVO_API_KEY=xkeysib-your-key
   MAIL_FROM_EMAIL=notifications@curiousbees.srmist.edu.in
   MAIL_FROM_NAME=CuriousBees
   FRONTEND_URL=https://curiousbees.srmist.edu.in
   ALLOWED_ORIGINS=https://curiousbees.srmist.edu.in
   ```

### Step 6: Frontend Web Deployment (Vercel)
1. Connect repository to **Vercel**.
2. Set Root Directory to `apps/web`.
3. Set environment variables:
   ```env
   NEXT_PUBLIC_API_URL=https://api.curiousbees.srmist.edu.in
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=srmist.edu.in
   ```

---

## 📊 4. Production Tier Deployment Configurations

| Tier | Monthly Budget | API Compute | Database Spec | Amazon S3 Storage | Brevo Email Plan | Target Concurrency |
|---|---:|---|---|---|---|---:|
| **Base** | **₹1,500 – ₹3,000** | 1x 1 vCPU / 1 GB RAM | 1 vCPU / 1 GB RAM (10 GB SSD) | 25 GB S3 | Free Tier (9k/mo) | 30 – 50 PCU |
| **Standard** | **₹3,000 – ₹4,500** | 1x 2 vCPU / 4 GB RAM | 2 vCPU / 4 GB RAM (30 GB SSD) | 100 GB S3 | Starter (20k/mo) | 100 – 150 PCU |
| **Scale** | **₹4,500 – ₹6,500** | 2x 2 vCPU / 4 GB RAM | 2–4 vCPU / 8 GB RAM (80 GB SSD)| 300 GB S3 | Starter+ (50k/mo) | 250 – 350 PCU |
