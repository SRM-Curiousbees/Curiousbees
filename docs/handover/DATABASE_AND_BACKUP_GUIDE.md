# CuriousBees — Database & Backup Guide

**Related:** [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | [DISASTER_RECOVERY_AND_ROLLBACK.md](./DISASTER_RECOVERY_AND_ROLLBACK.md)

---

## 1. PostgreSQL & Supabase Architecture

CuriousBees uses **PostgreSQL** managed through **Prisma ORM (`6.19.3`)**, with schema and migrations located in [`apps/api/prisma/`](../../apps/api/prisma/).

- **`DATABASE_URL`:** Used by the running NestJS API. In Supabase production, this should point to the **PgBouncer Transaction/Session Pooler (`:6543?pgbouncer=true`)** to handle concurrent connections safely.
- **`DIRECT_URL`:** Used by Prisma CLI (`prisma migrate deploy`, `prisma migrate diff`) to connect directly to PostgreSQL on port `5432`, bypassing PgBouncer.

> **Legacy File Warning:** [`supabase/schema.sql`](../../supabase/schema.sql) is an obsolete initialization script containing `DROP TABLE IF EXISTS ... CASCADE`. **NEVER run `supabase/schema.sql` against any environment.** Always use Prisma migrations (`apps/api/prisma/migrations/`).

---

## 2. Development vs. Production Database Rules

| Operation | Development / Disposable Test DB | Staging / Production DB |
| :--- | :--- | :--- |
| `prisma migrate deploy` | Allowed | **Allowed** (after backup) |
| `prisma migrate dev` | Allowed (`npm run db:migrate`, guarded by `local-only.js`) | **FORBIDDEN** |
| `prisma db push` | Allowed (`local-only.js` guarded) | **FORBIDDEN** |
| `prisma migrate reset` / `npm run db:reset` | Allowed only on DBs marked `curiousbees.disposable_test_db = 'on'` | **STRICTLY FORBIDDEN** |
| `npm run db:seed` (`prisma/seed.ts`) | Allowed (creates mock dev users) | **FORBIDDEN** |
| `npm run seed:prod --workspace=apps/api` | N/A | **Initial setup only** (idempotent bootstrap of `BOOTSTRAP_ADMIN_EMAIL` + reference data) |

CuriousBees includes safety guards ([`scripts/db/local-only.js`](../../scripts/db/local-only.js) and [`scripts/db/reset-guard.js`](../../scripts/db/reset-guard.js)) to prevent accidental resets against non-disposable databases.

---

## 3. Migration Workflow

### Existing Migrations (`apps/api/prisma/migrations/`)
1. `20260929000000_production_baseline`
2. `20261001000000_event_email_ingestion`
3. `20261023000000_remove_zoom_workplace`

### Applying Migrations in Staging / Production
**Working directory:** Repository root (`CuriousBees/`)

```bash
# 1. Take a pre-migration logical backup (see Section 4)
# 2. Check migration status without modifying the DB
npx prisma migrate status --schema=apps/api/prisma/schema.prisma

# 3. Apply pending migrations safely
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

### Creating New Schema Changes (Developer Local Machine Only)
1. Edit `apps/api/prisma/schema.prisma`.
2. Run `npm run db:migrate` against your **local** dev database to generate a new SQL migration folder.
3. Verify zero schema drift with `npx prisma validate --schema=apps/api/prisma/schema.prisma`.
4. Commit the generated migration SQL file and test `prisma migrate deploy` in CI/Staging.

---

## 4. Database Backup Procedures

### 4.1 Managed Supabase Backups (Recommended Primary)
- **Daily Automated Backups:** Enabled on Supabase Pro (`ap-south-1`).
- **Point-in-Time Recovery (PITR):** Strongly recommended for Production (`Growth` / `Institutional` tiers) to enable second-level recovery before any accidental deletion or faulty migration.

### 4.2 Manual Pre-Maintenance Logical Backup (`pg_dump`)
Run before every production migration or major release from a secure admin/bastion host using `DIRECT_URL`:

```bash
# Export custom-format compressed backup (non-destructive read)
pg_dump "$DIRECT_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="curiousbees_prod_$(date +%Y%m%d_%H%M%S).dump"
```

Store encrypted backups in a restricted SRM AWS S3 backup bucket with versioning and retention lock.

---

## 5. Database Restoration & Backup Verification

> **WARNING:** Never restore directly over a live production database without first putting the API in maintenance mode or restoring to a **new/staging** database to verify integrity.

### Restoration into a Target Recovery Database

```bash
# Restore custom dump into a clean recovery database
pg_restore \
  --dbname="$RECOVERY_DIRECT_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  curiousbees_prod_YYYYMMDD_HHMMSS.dump
```

### Monthly Backup Verification Drill
1. Restore the latest backup into an isolated **Staging / Sandbox** PostgreSQL instance.
2. Run `npx prisma migrate status --schema=apps/api/prisma/schema.prisma` to confirm migration table consistency.
3. Run row-count sanity checks on core tables (`"User"`, `"Thread"`, `"Workspace"`, `"Publication"`, `"AuditLog"`).
4. Record verification date, duration, and result in the ITKM operations log.

---

## 6. Data Retention Considerations

- **`AuditLog` & `NotificationLog`:** Retain for institutional compliance/audit windows (recommended minimum 1–3 years per SRM IT policy); archive older partitions/rows to cold S3 storage if table size grows significantly.
- **User Offboarding:** Use `UserStatus.DEACTIVATED` or `SUSPENDED` via `/admin/users` rather than hard-deleting users, preserving academic authorship integrity on `Thread`, `Comment`, and `Publication` records.
