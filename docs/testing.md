# CuriousBees V2 — Automated Testing Guide

## 1. Testing Structure

CuriousBees employs four levels of automated validation:

1. **Unit Tests:** Fast, isolated tests mocking database and external network boundaries.
2. **Integration Tests:** Verification of NestJS module compilation, authorization guards, and error filters.
3. **End-to-End (E2E) Testing:** Full request lifecycle testing against live or test database.
4. **Load Testing:** Stress testing up to 7,500 concurrency on staging infrastructure.

---

## 2. Running Automated Tests

### 2.1 Run Unit and Integration Tests
```bash
# From repository root:
npm test

# With coverage report:
npm run test --workspace=apps/api -- --coverage
```

### 2.1a Integration tests (real PostgreSQL + S3 emulator)
The integration suite **drops and recreates its database schema**, so it only runs against the dedicated, disposable test endpoint `cbtest@127.0.0.1:55432/curiousbees`. Anything else aborts the run before any connection is made; there is no override. It never reads `.env`, removes database and external-service credentials from its environment, and blocks network connections that leave the machine.
```bash
docker compose -f docker-compose.test.yml up -d
cd apps/api && E2E_DATABASE_URL="postgresql://cbtest:cbtest_local_only@127.0.0.1:55432/curiousbees?schema=public" \
  E2E_S3_ENDPOINT=http://127.0.0.1:59000 npm run test:e2e
docker compose -f docker-compose.test.yml down
```
Without Docker, `scripts/db/local-test-db.sh init` creates the same endpoint from the local PostgreSQL binaries, in its own directory. Docker is still needed for the S3 emulator.

### 2.1a′ Destructive-command safeguards
Every command that drops, resets or bulk-deletes data checks the target in two steps before acting. Neither step relies on `NODE_ENV`.
1. The URL must be exactly `cbtest@127.0.0.1:55432/curiousbees`, with no connection parameters other than `schema=public`.
2. A live connection must report that database and user, plus the setting `curiousbees.disposable_test_db = on`.

Only throwaway test servers carry that setting: `docker-compose.test.yml`, the CI step and `local-test-db.sh` set it. If the server can't be reached or lacks the marker, the command is refused.

| Command | Rule |
|---|---|
| `npm run db:reset`, `db:setup`, `team:reset`, `node scripts/db-setup.js` | Disposable test database only, passed explicitly as `RESET_DATABASE_URL`; `DATABASE_URL` and `.env` are ignored |
| Integration suites, `npm run load:seed`, load-test server | Disposable test database only (URL rule + live marker) |
| `apps/api/prisma/clean-demo-data.ts` (deletes rows) | Disposable test database only |
| `npm run db:migrate` (`prisma migrate dev`), `prisma:push` (`prisma db push`) | A database on this machine only; refuses remote, shared and production URLs (`scripts/db/local-only.js`) |
| `npm run db:seed` (named demo accounts), `seed-demo-data.ts`, `backfill-organization.ts` | A database on this machine only |
| `prisma migrate deploy`, `src/scripts/seed-production.ts` | Unchanged: forward-only and idempotent, used for deployments |

The guards' own tests: `npm run test:scripts`. Set `DISPOSABLE_TEST_DATABASE_URL` to the test endpoint to include the live, read-only identity checks; otherwise they are reported as skipped.

### 2.1b Web helper and n8n workflow tests
```bash
npm run test:web   # apps/web/tests (Node's built-in runner)
npm run test:n8n   # integrations/n8n/event-ingestion: workflow logic, workflow.json, Gemini mocked
```
No automated test calls Gemini, Gmail, Brevo, Google, Zoom, OpenSearch or AWS.

### 2.2 Run Monorepo Typechecking
```bash
npm run typecheck
```

### 2.3 Run Linter
```bash
npm run lint
```

---

## 3. Test Suites Implemented
* [app.controller.spec.ts](file:///Users/maddy/Current%20Project/CuriousBees/apps/api/src/app.controller.spec.ts): Verifies `/health/live` and `/health/ready` (503 on database disconnect, 200 on connected).
* [files.service.spec.ts](file:///Users/maddy/Current%20Project/CuriousBees/apps/api/src/files/files.service.spec.ts): Verifies S3 presigned URL generation, MIME type whitelist enforcement, and 50MB file size limit.
* [threads.service.spec.ts](file:///Users/maddy/Current%20Project/CuriousBees/apps/api/src/threads/threads.service.spec.ts): Verifies feed pagination capping (`take <= 50`), cursor navigation, and `hidden: false` moderated post exclusion.
* [publications.service.spec.ts](file:///Users/maddy/Current%20Project/CuriousBees/apps/api/src/publications/publications.service.spec.ts): Verifies publication pagination, search querying, and role authorization.
* [feed.service.spec.ts](file:///Users/maddy/Current%20Project/CuriousBees/apps/api/src/feed/feed.service.spec.ts): Verifies search queries across threads, publications, and researchers.
* [feed.controller.spec.ts](file:///Users/maddy/Current%20Project/CuriousBees/apps/api/src/feed/feed.controller.spec.ts): Verifies feed controller route handling and auth guard integration.
