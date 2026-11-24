# CuriousBees — Repository Cleanup Audit

**Related:** [README.md](./README.md) | [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)

This audit classifies all repository files into Categories **A–I** and documents every cleanup decision with reference verification. **No application source code, database migrations, lockfiles, tests, or historical audit reports were deleted.**

---

## 1. Repository File Classification (Categories A–I)

| Category | Description | Scope in CuriousBees | Action |
| :---: | :--- | :--- | :--- |
| **A** | **Essential application files** | `apps/web/src/**`, `apps/api/src/**`, `packages/{types,constants,shared-utils,ui}/**` | **Retain** |
| **B** | **Essential config & deployment files** | Root/app `package.json`, `package-lock.json`, `tsconfig*.json`, `.nvmrc`, `.env.example`, `.env.docker.example`, `.gitignore`, `.dockerignore`, `Dockerfile.{api,web}`, `docker-compose*.yml`, `infra/aws/**`, `.github/**`, `apps/api/prisma/{schema.prisma,migrations/**}` | **Retain** |
| **C** | **Essential tests & scripts** | `apps/api/test/**`, `apps/api/src/**/*.spec.ts`, `apps/web/tests/**`, `scripts/{db,load,setup.js,doctor.js,health-check.js}`, `integrations/n8n/event-ingestion/**` | **Retain** |
| **D** | **Essential technical documentation** | `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/handover/**`, `docs/submission/**`, `docs/product-architecture/**`, `docs/product-discovery/**`, `docs/audits/**`, `docs/operations/rate-limiting.md`, `docs/deployment/aws-production.md`, `docs/integrations/n8n-event-ingestion.md` | **Retain** |
| **E** | **Outdated or duplicated documentation** | Older overlapping docs (`docs/architecture.md`, `docs/deployment.md`, `docs/environment.md`, `docs/testing.md`, `docs/production-readiness.md`, `docs/disaster-recovery.md`, `docs/aws-infrastructure.md`, `docs/curiousbees_presentation.html`, `docs/reports/**`, `docs/guides/**`) | **Retain** (superseded by `docs/handover/`; preserved for institutional traceability) |
| **F** | **Unused assets** | `apps/web/public/{apple-touch-icon.png,favicon.ico,icon.png,logo.png,logo_icon.png,srm_logo_transparent.png,srm_logo_white_transparent.png}` | **Retain** (`middleware.ts` and `layout.tsx` reference these public assets) |
| **G** | **Generated files, OS metadata & logs** | `.DS_Store`, `docs/.DS_Store`, `docs/submission/.DS_Store`, `apps/api/logs/*.log`, `scripts/load/results/smoke.server.log`, `apps/api/dist`, `apps/web/.next`, `packages/*/dist` | **Safe removal** of untracked `.DS_Store` and `.log` artifacts (see Section 2) |
| **H** | **Obsolete code / empty stubs** | `apps/api/src/gmail-ingestion/` (empty dir); `supabase/schema.sql` (legacy SQL); `SupervisorsController` & `POST /threads/:id/collaborate` | **Remove** empty `gmail-ingestion/` dir; **Retain** `supabase/schema.sql` (warned in DB guide) & legacy endpoints (actively used by `useStore.ts`) |
| **I** | **Uncertain / optional PaaS configs** | `railway.json`, `vercel.json`, `docs/deployment/{railway,vercel}.md`, `apps/api/src/notifications/notifications.service.ts` (`sendPushToUser` stub) | **Retain** (`sendPushToUser` is called by `comments.service.ts` and mocked in tests; PaaS files retained as optional deployment references) |

---

## 2. Verified Cleanup Actions Executed

| Exact Path | Reason Unnecessary | Search / Reference Check Performed | Imported / Executed / Used? | Risk of Removal | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `.DS_Store` | macOS Finder metadata (untracked) | `git ls-files .DS_Store` (not tracked) | No | None | **Removed** |
| `docs/.DS_Store` | macOS Finder metadata (untracked) | `git ls-files docs/.DS_Store` (not tracked) | No | None | **Removed** |
| `docs/submission/.DS_Store` | macOS Finder metadata (untracked) | `git ls-files docs/submission/.DS_Store` (not tracked) | No | None | **Removed** |
| `apps/api/logs/combined.log` | Runtime Winston log artifact (untracked) | `git ls-files apps/api/logs/` (not tracked) | No (regenerated at runtime if `LOG_TO_FILE=true`) | None | **Removed** |
| `apps/api/logs/error.log` | Runtime Winston log artifact (untracked) | `git ls-files apps/api/logs/` (not tracked) | No (regenerated at runtime if `LOG_TO_FILE=true`) | None | **Removed** |
| `scripts/load/results/smoke.server.log` | Local load-test log artifact (untracked) | `git ls-files scripts/load/results/` (not tracked) | No | None | **Removed** |
| `apps/api/src/gmail-ingestion/` | Empty untracked directory (`0` files) | `find apps/api/src/gmail-ingestion -type f` + `grep -rn "gmail-ingestion\|GmailIngestion" apps/ packages/` (`0` matches) | No | None | **Removed empty directory** |

---

## 3. Items Explicitly Retained Despite Appearing Obsolete

| Exact Path | Reason Appearing Obsolete | Evidence Requiring Retention |
| :--- | :--- | :--- |
| `apps/api/src/supervisors/supervisors.controller.ts` (`GET /api/supervisor/pending-scholars`) | Listed as legacy overlap in readiness audit | Actively called by `apps/web/src/store/useStore.ts:3092` |
| `POST /api/threads/:id/collaborate` (`threads.controller.ts`) | Listed as legacy thread collaboration endpoint | Actively called by `apps/web/src/store/useStore.ts:1038` |
| `NotificationsService.sendPushToUser` (`apps/api/src/notifications/notifications.service.ts:90`) | Push notifications disabled (no-op stub) | Actively called by `comments.service.ts:112` and asserted in `comments.service.spec.ts:26,73` |
| `docs/curiousbees_presentation.html` | Superseded by PowerPoint decks in `docs/submission/presentation/` | Tracked in Git (`git ls-files`); retained to preserve project history |
| `supabase/schema.sql` | Superseded by Prisma migrations (`apps/api/prisma/migrations/`) | Tracked in Git; retained for historical reference with explicit warning in `DATABASE_AND_BACKUP_GUIDE.md` |
| `railway.json` & `vercel.json` | Primary production target is AWS ECS (`infra/aws/`) | Retained as optional PaaS deployment manifests referenced in `docs/deployment/` |
| `docs/audits/**`, `docs/product-discovery/**`, `docs/product-architecture/**` | Internal engineering phase documents | Retained for institutional traceability and Phase 1A/1B audit evidence |
