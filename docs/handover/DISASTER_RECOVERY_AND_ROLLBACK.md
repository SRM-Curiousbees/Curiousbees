# CuriousBees — Disaster Recovery & Rollback Plan

**Related:** [DATABASE_AND_BACKUP_GUIDE.md](./DATABASE_AND_BACKUP_GUIDE.md) | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | [MONITORING_AND_TROUBLESHOOTING.md](./MONITORING_AND_TROUBLESHOOTING.md)

---

## 1. Proposed Recovery Objectives *(Subject to SRM ITKM Approval)*

The following targets are **proposed operational objectives** for SRM approval (not guaranteed SLAs):

| Tier / Scenario | Proposed RPO (Max Data Loss) | Proposed RTO (Max Downtime) | Primary Mechanism |
| :--- | :--- | :--- | :--- |
| **Application Container Crash** | `0` (stateless) | `< 5 minutes` | ECS / orchestrator auto-restart & multi-task ALB |
| **Faulty App Deployment** | `0` (no schema change) | `< 15 minutes` | Immutable container image rollback |
| **Database Corruption / Bad Migration (With PITR)** | `<= 5 minutes` *(Pending SRM Supabase Pro + PITR)* | `1–2 hours` | Supabase Point-in-Time Recovery + API re-point |
| **Database Recovery (Daily Snapshot Only)** | `<= 24 hours` | `2–4 hours` | Daily Supabase backup / `pg_restore` from S3 dump |
| **S3 Object Accidental Deletion** | `0` *(if S3 Versioning enabled)* | `< 1 hour` | Restore non-current S3 object version |

---

## 2. Application Deployment Rollback

1. **Identify Previous Good Tag:** Locate the prior verified Docker image tag in ECR / container registry (e.g., `curiousbees-api:<PREV_SHA>`, `curiousbees-web:<PREV_SHA>`).
2. **Update Service Definition:** Revert ECS task definition / container orchestrator to the previous image tag (leaving environment secrets intact unless a new variable caused the failure).
3. **Verify Health:** Confirm `/healthz` (`web`) and `/api/health/ready` (`api`) return `200 OK`.
4. **If Database Schema Changed:** Do **not** run `prisma migrate reset`. If the new migration is backward-incompatible with the previous code, restore the pre-release database backup first.

## 3. Database Restoration Procedure

1. Put the application in maintenance mode (scale API tasks to `0` or route traffic to a maintenance page) so no writes occur during restore.
2. Restore the latest clean Supabase PITR timestamp or pre-migration `pg_dump` into a **recovery database** first (`pg_restore --dbname="$RECOVERY_DIRECT_URL" --no-owner --no-acl --clean --if-exists <backup.dump>`).
3. Verify schema & row counts (`npx prisma migrate status --schema=apps/api/prisma/schema.prisma`).
4. Update `DATABASE_URL` and `DIRECT_URL` secrets to point to the restored database, restart API tasks, and verify `/api/health/ready`.

## 4. Storage Recovery Considerations (AWS S3)

- Enable **S3 Bucket Versioning** on the production bucket (`srm-curiousbees-prod-files`) so accidental overwrites or deletions can be recovered via object version restoration.
- Never allow bulk `s3:DeleteBucket` or unversioned `DeleteObject` permissions on CI/CD roles.

## 5. Environment Configuration & Credential Rotation

- **Configuration Recovery:** Store non-secret config manifests in Git (`infra/aws/ecs/`, `.env.example`) and back up encrypted SSM Parameter Store / Secrets Manager keys in SRM's institutional vault.
- **Credential Rotation Playbook:**
  - **`N8N_INTEGRATION_TOKEN` (Zero-Downtime):** Set `N8N_INTEGRATION_TOKEN_PREVIOUS` to the old token and `N8N_INTEGRATION_TOKEN` to the new 32+ char token, restart API, update n8n, then remove `_PREVIOUS`.
  - **`SUPABASE_SERVICE_ROLE_KEY` / `BREVO_API_KEY` / `AWS_SECRET_ACCESS_KEY` / `DB Password`:** Generate new credential in provider console, update secret store, trigger rolling restart of API tasks, then revoke the old credential.
  - **`NEXT_PUBLIC_SUPABASE_ANON_KEY`:** Requires rebuilding and redeploying `apps/web` image (`NEXT_PUBLIC_*` is inlined at build time).

## 6. Post-Recovery Verification Checklist

- [ ] `GET /healthz` returns `200 OK`.
- [ ] `GET /api/health/ready` returns `200 OK` with `database: "connected"`.
- [ ] Google OAuth login succeeds for a test scholar/admin account.
- [ ] Feed read, post creation, and S3 file presign/download succeed.
- [ ] Brevo test email sends cleanly (`NotificationLog` updated).
