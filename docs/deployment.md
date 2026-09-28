# CuriousBees V2 — Deployment & ALB Configuration Guide

## 1. AWS ALB Routing Configuration

The AWS Application Load Balancer acts as the primary ingress controller for traffic.

### Listener Rules (Port 443 HTTPS)
1. **Rule 1 (`/api/*`):**
   - Path Pattern: `/api/*`
   - Target Group: `tg-curiousbees-api`
   - Port: `4000`
   - Health Check Path: `/health/ready`
   - Healthy threshold: 2, Unhealthy threshold: 3, Timeout: 5s, Interval: 15s
2. **Rule 2 (`/health/*`):**
   - Path Pattern: `/health/*`
   - Target Group: `tg-curiousbees-api`
   - Port: `4000`
3. **Default Rule (`/*`):**
   - Path Pattern: `/*`
   - Target Group: `tg-curiousbees-web`
   - Port: `3000`
   - Health Check Path: `/`
   - Healthy threshold: 2, Unhealthy threshold: 3, Timeout: 5s, Interval: 15s

### HTTP Redirection (Port 80)
- Action: Redirect to Port 443 with HTTP 301 (Permanent Redirect).

---

## 2. Docker Container Deployment

### 2.1 Backend (NestJS API)
```bash
# Build
docker build -t curiousbees-api:latest -f Dockerfile.api .

# Run
docker run -d \
  --name curiousbees_api \
  -p 4000:4000 \
  --env-file .env.production \
  curiousbees-api:latest
```

### 2.2 Frontend (Next.js Standalone)
```bash
# Build
docker build -t curiousbees-web:latest -f Dockerfile.web .

# Run
docker run -d \
  --name curiousbees_web \
  -p 3000:3000 \
  --env-file .env.production \
  curiousbees-web:latest
```

---

## 3. Database Migration Steps
Before rolling container updates to target groups:
1. Ensure AWS RDS has an active snapshot before applying migrations.
2. Run database migration from CI or an administrative bastion:
   ```bash
   npx dotenv -e .env.production -- npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
   ```

---

## 4. Rollback Strategy
If an issue is detected during or after a deployment:
1. **ALB Target Switching:** Re-point the ALB target group listener rules to the previous stable target group version (blue/green).
2. **Container Rollback:** In ECS / Auto Scaling Launch Template, revert task definition revision to previous commit SHA.
3. **Database Rollback:** If schema changes were additive (new columns, new indexes), no database downgrade is required.
