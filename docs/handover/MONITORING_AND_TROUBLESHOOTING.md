# CuriousBees — Monitoring & Troubleshooting Guide

**Related:** [OPERATIONS_AND_MAINTENANCE.md](./OPERATIONS_AND_MAINTENANCE.md) | [DATABASE_AND_BACKUP_GUIDE.md](./DATABASE_AND_BACKUP_GUIDE.md) | [DISASTER_RECOVERY_AND_ROLLBACK.md](./DISASTER_RECOVERY_AND_ROLLBACK.md)

---

## 1. Health Checks & Diagnostic Endpoints

| Check | Command / URL | Healthy Response | What It Verifies |
| :--- | :--- | :--- | :--- |
| **Web Liveness** | `curl -i https://<DOMAIN>/healthz` | `200 OK` | Next.js standalone server is responsive |
| **API Liveness** | `curl -i https://<DOMAIN>/api/health/live` | `200 OK` (`process: "alive"`) | NestJS HTTP server is alive (does not hit DB) |
| **API Readiness** | `curl -i https://<DOMAIN>/api/health/ready` | `200 OK` (`database: "connected"`, `dbLatencyMs`) | NestJS + PostgreSQL (`SELECT 1`) connectivity |
| **Host/Heap Stats** | `GET https://<DOMAIN>/api/system` *(Admin Bearer JWT)* | `200 OK` | Process uptime, RSS/heap memory, CPU count, load avg |
| **Repo Health Script** | `node scripts/health-check.js` *(from repo root)* | Exit `0` | Automated check against configured local/staging URLs |

---

## 2. Log Locations & Investigation Commands

- **Containerized Staging/Production:** Logs stream to `stdout`/`stderr` in JSON/structured Winston format (`nest-winston`). Inspect via AWS CloudWatch Logs (`/ecs/curiousbees-prod-api`, `/ecs/curiousbees-prod-web`) or `docker logs -f <container_name>`.
- **Local Development with File Logging:** If `LOG_TO_FILE=true` is set, logs are written to `apps/api/logs/combined.log` and `apps/api/logs/error.log`.

---

## 3. Common Issues & Corrective Playbooks

### Issue 1: API Returns `503` on `/api/health/ready` (`database: "disconnected"`)
- **Symptoms:** Readiness probe fails (`503`), API logs `Database connection failed` or Prisma `P1001` (`Can't reach database server`).
- **Likely Causes:** Incorrect `DATABASE_URL`, paused/unreachable Supabase project, IP allow-list restriction, or PgBouncer pool exhaustion.
- **Investigation:** Verify `DATABASE_URL` secret, check Supabase project health, test TCP connectivity (`nc -zv <db-host> 6543`).
- **Safe Action:** Restore connectivity or fix `DATABASE_URL` in secrets and restart the API task. Do **not** run `prisma migrate reset`.

### Issue 2: Users Receive `AUTH_SERVICE_UNAVAILABLE` (`503`) or `401` on Login
- **Symptoms:** Valid SRM users cannot access `/feed`; logs show `Supabase token verification unavailable` or `Supabase token rejected`.
- **Likely Causes:** `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` mismatch between Web and API, expired key, or outbound HTTPS blocked from API container to Supabase.
- **Investigation:** Compare `NEXT_PUBLIC_SUPABASE_URL` (web) and `SUPABASE_URL` (api); verify `SUPABASE_AUTH_TIMEOUT_MS` (default/max `30000`) and outbound NAT/egress on port `443`.
- **Safe Action:** Align Supabase URL/keys in environment secrets and redeploy/restart.

### Issue 3: Google OAuth Redirect Error (`redirect_uri_mismatch` or Loop to `/login`)
- **Symptoms:** Google sign-in fails with `redirect_uri_mismatch` or redirects back to `/login` or `localhost:3000`.
- **Likely Causes:** `APP_URL` / `NEXT_PUBLIC_SITE_URL` mismatch, missing `https://<DOMAIN>/auth/callback` in Supabase Redirect URLs, or missing Google Cloud Console callback URI (`https://<PROJECT>.supabase.co/auth/v1/callback`).
- **Safe Action:** Update Supabase URL Configuration and Google OAuth Authorized Redirect URIs; rebuild web if `NEXT_PUBLIC_SITE_URL` changed.

### Issue 4: Users See `/access-denied` or `/not-provisioned` After Google Sign-In
- **Symptoms:** Authentication succeeds at Google, but CuriousBees denies access.
- **Likely Causes:** User email domain is not in `ALLOWED_EMAIL_DOMAINS`, OR the user has not been created by an `INSTITUTE_ADMIN` in `/admin/users`.
- **Safe Action:** Verify `ALLOWED_EMAIL_DOMAINS` includes the user's domain, and have an `INSTITUTE_ADMIN` provision the user in `/admin/users`.

### Issue 5: AWS S3 File Upload / Download Failures (`403` or CORS Error)
- **Symptoms:** Browser fails to `PUT` workspace or thread attachments to S3.
- **Likely Causes:** S3 bucket CORS does not include `https://<DOMAIN>`, IAM role lacks `s3:PutObject`/`s3:GetObject`, or system clock skew on host.
- **Investigation:** Check browser DevTools Network tab for S3 preflight `OPTIONS` failure; verify `AWS_REGION` and `AWS_S3_BUCKET`.
- **Safe Action:** Apply [`infra/aws/s3/cors.json`](../../infra/aws/s3/cors.json) with the exact production origin and verify IAM permissions.

### Issue 6: Brevo Emails Not Delivered
- **Symptoms:** Onboarding/notification emails fail; `/admin/email-delivery` shows unconfigured or errors in `NotificationLog`.
- **Likely Causes:** Missing `BREVO_API_KEY`, unverified `MAIL_FROM_EMAIL` sender/domain in Brevo, or daily Brevo quota reached.
- **Safe Action:** Verify Brevo API key and SPF/DKIM sender verification in Brevo Dashboard.

### Issue 7: `npm run build:web` Fails Locally or in Docker
- **Symptoms:** Build exits `1` with `Frontend environment validation failed` or Google Fonts fetch error.
- **Likely Causes:** Missing `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` build args, or no outbound internet access to `fonts.googleapis.com` during `next build`.
- **Safe Action:** Pass all required `NEXT_PUBLIC_*` build args and ensure build environment has outbound HTTPS access to Google Fonts.

### Issue 8: Common Prisma Errors
- **`P1001`:** Cannot reach DB server → check network/DNS/`DATABASE_URL`.
- **`P2002`:** Unique constraint violation → check duplicate email/slug in request payload.
- **`P2025`:** Record not found → verify target ID exists and is not soft-deleted/hidden.
- **Client Out-of-Sync:** Run `npm run db:generate` (`prisma generate --schema=apps/api/prisma/schema.prisma`) after any schema update.
