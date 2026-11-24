# CuriousBees — Testing and Verification Report

All results below are taken directly from verified command executions recorded in `docs/product-architecture/FINAL_DELIVERY_READINESS_REPORT.md`.

---

## 1. Automated & Static Verification Results (Executed)

| Category | Verification Type | Command | Verified Result |
| :--- | :--- | :--- | :--- |
| **API Production Build** | Static / Build | `npm run build:api` | **PASSED (`exit 0`)** — Shared packages built, Prisma Client v6.19.3 generated, NestJS compiled. |
| **Web Production Build** | Static / Build | `npm run build:web` | **PASSED (`exit 0`)** — All 75 Next.js App Router pages/routes compiled. |
| **API Unit Tests** | Automated (Mocked Prisma) | `npm test --workspace=apps/api -- --runInBand --no-watchman` | **PASSED (`exit 0`)** — **23/23 suites**, **227 passed**, 2 skipped, 229 total. Includes `events.service.spec.ts`, `collaborations.service.spec.ts`, `publications.service.spec.ts`, `threads.service.spec.ts`, `comments.service.spec.ts`, `discovery.spec.ts`, `research-participant.guard.spec.ts`, `supabase.guard.spec.ts`, `rate-limits.spec.ts`. |
| **Web Unit Tests** | Automated | `npm run test:web` | **PASSED (`exit 0`)** — **3/3 tests** (`apps/web/tests/event-links.test.mts`). |
| **TypeScript Typecheck** | Static | `npm run typecheck` | **PASSED (`exit 0`)** — 0 errors (`apps/web` + `apps/api`). |
| **ESLint** | Static | `npm run lint` | **PASSED (`exit 0`)** — 0 errors (pre-existing React hooks & `<img>` warnings only). |
| **Prisma Validation** | Static | `npx prisma validate --schema=apps/api/prisma/schema.prisma` | **PASSED (`exit 0`)** — Schema valid. |

---

## 2. Database & E2E Testing Limitations (Blocked Locally)
- **API E2E Integration Tests (`npm run test:e2e --workspace=apps/api`):** **Not Executed (Blocked).**
  - The E2E suite (`apps/api/test/*.e2e-spec.ts`) is strictly guarded by `e2e-safety.ts` to run only against a positively identified disposable database at `127.0.0.1:55432` (`curiousbees.disposable_test_db = on`).
  - Neither Docker nor local PostgreSQL (`psql`/`initdb`/`pg_ctl`) is installed on this machine, so the disposable database could not be started.
- **Database Connectivity Limitation:**
  - The Supabase host in `.env` (`ndtaxeqsefusocwgqppx.supabase.co`) fails DNS resolution (`ENOTFOUND`), so live SQL execution and manual runtime persistence testing against PostgreSQL were not verified.

---

## 3. Distinction of Verification Scope
- **Verified Automatically (Unit + Static):** Type safety, production bundling, schema syntax, role guards, PII field omission (`PUBLIC_AUTHOR_SELECT`), moderation report creation, and collaboration status batching logic (with mocked Prisma).
- **Not Yet Verified at Runtime Against Live SQL:** End-to-end PostgreSQL query execution, S3 presigned upload/download roundtrips, and live Supabase OAuth login flows.
