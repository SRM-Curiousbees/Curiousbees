# CuriousBees — Operations & Maintenance Handbook

**Related:** [MONITORING_AND_TROUBLESHOOTING.md](./MONITORING_AND_TROUBLESHOOTING.md) | [DATABASE_AND_BACKUP_GUIDE.md](./DATABASE_AND_BACKUP_GUIDE.md) | [DISASTER_RECOVERY_AND_ROLLBACK.md](./DISASTER_RECOVERY_AND_ROLLBACK.md)

---

## 1. Maintenance Responsibility Matrix (RACI)

| Activity | SRM ITKM Infrastructure Admin | CuriousBees Institute Admin (`/admin`) | Software Developer / DevOps |
| :--- | :---: | :---: | :---: |
| Hosting, DNS, TLS, CloudFront/ALB, AWS IAM | **Owner (R/A)** | Informed | Consulted |
| Supabase project, backups, PITR, DB sizing | **Owner (R/A)** | Informed | Consulted |
| User provisioning, roles, suspensions, moderation | Informed | **Owner (R/A)** | Consulted |
| Campus / Faculty / Department hierarchy | Informed | **Owner (R/A)** | Consulted |
| Event inbox approval & announcements | Informed | **Owner (R/A)** | Informed |
| Code updates, Prisma migrations, security patches | Approve / Deploy | Informed | **Owner (R/A)** |
| Incident triage (L1 infra vs L2 app) | **L1 Owner** | L1 Functional | **L2/L3 Owner** |

---

## 2. Operational Checklists

### Daily Checks (Automated + 5-min Review)
- Verify Web (`/healthz`) and API (`/api/health/ready`) return HTTP `200` and `database: "connected"`.
- Review container/ECS CPU, memory, and HTTP `5xx` error rates.
- Check Brevo email delivery dashboard & `/admin/email-delivery` for bounce/quota alerts.
- *(Institute Admin)* Review `/admin/moderation` and `/admin/event-inbox` queues.

### Weekly Checks
- Inspect API error logs (`LOG_TO_FILE` or CloudWatch/container stdout) for recurring `500`/`503` or `AUTH_SERVICE_UNAVAILABLE` spikes.
- Review S3 bucket storage growth (`aws s3 ls --summarize --recursive s3://<BUCKET>`).
- Verify Supabase connection pooler saturation and slow queries in Supabase Dashboard.
- Confirm daily digest cron execution (`ENABLE_CRON=true` on single instance) if enabled.

### Monthly Maintenance
- Run backup restoration verification drill into Staging ([DATABASE_AND_BACKUP_GUIDE.md](./DATABASE_AND_BACKUP_GUIDE.md)).
- Review active `INSTITUTE_ADMIN` accounts and `AuditLog` entries for anomalous privilege changes.
- Run `npm audit` on a clean branch to review dependency CVEs and schedule patch releases.
- Review AWS & Supabase billing vs. budget thresholds.

---

## 3. Dependency & Security Update Procedure

1. Create a feature/maintenance branch in Git; never patch dependencies directly on production.
2. Update targeted packages (`package.json` / `package-lock.json` via `npm install --legacy-peer-deps`).
3. Run the full verification suite before merging:
   ```bash
   npm run build:packages && npm run lint && npm run typecheck && npm test && npm run test:web && npm run build
   ```
4. Deploy to **Staging**, verify `/api/health/ready` and critical flows, then promote to Production during a scheduled maintenance window.

---

## 4. User, Role & Content Administration

- **User Lifecycle:** Managed exclusively by `INSTITUTE_ADMIN` in `/admin/users`. New users must be provisioned in the database before they can pass `SupabaseAuthGuard`.
- **Role Changes:** Updated in `/admin/users` (or `/admin/roles-permissions`). Never assign `INSTITUTE_ADMIN` to active researchers who need to post/collaborate, as `ResearchParticipantGuard` blocks admins from research participation.
- **System Announcements & Moderation:** Handled via `/admin/announcements`, `/admin/moderation`, and `/admin/posts`.

---

## 5. Logs, Performance & Maintenance Windows

- **Application Logs:** NestJS uses `nest-winston` (`apps/api/src/config/winston.config.ts`), writing structured logs to `stdout` (default for Docker/ECS) and optionally to `apps/api/logs/combined.log` & `error.log` when `LOG_TO_FILE=true`.
- **Performance Monitoring:** Monitor `dbLatencyMs` returned by `/api/health/ready`, `GET /api/system` (requires `INSTITUTE_ADMIN` JWT for OS/heap metrics), and ALB target response times (`p95 < 400ms` target).
- **Maintenance Windows & Release Procedure:**
  1. Schedule low-traffic window (e.g., Sunday 01:00–03:00 IST) and post notice via `/admin/announcements` 24 hours prior.
  2. Take pre-release DB backup (`pg_dump`).
  3. Apply DB migrations (`prisma migrate deploy`) if any.
  4. Roll out new API & Web container images with zero-downtime health-check grace period.
  5. Run post-deploy smoke checks (`/healthz`, `/api/health/ready`, login, feed load).
