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
