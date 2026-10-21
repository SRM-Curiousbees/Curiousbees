# CuriousBees — Production Readiness Audit (Phase 1)

Date: 2026-10-22. Scope: the repository at `main` (`9af6cb3`, not pushed), read-only.
Target under evaluation: 1,500 registered users, 500 concurrent, ₹10,000/month including tax.

Nothing in this phase changed application code, databases, cloud resources or n8n. All claims below cite the code; anything not verified is labelled **unverified**.

---

## 1. Current state

| Area | What the repository actually contains |
|---|---|
| Git | Clean except `presentation.html` (deleted, pre-existing) and the untracked internship report. `9af6cb3` is local only. |
| Web | Next.js 15.5.19, `output: 'standalone'`, Node middleware calling Supabase on every page navigation. Data loading is mostly a 3,700-line Zustand store with `useEffect` + `apiFetch`. React Query is installed but used in 2 places. |
| API | NestJS 11, Express 5.2.1, one global `ThrottlerGuard` (120 req/min, in-memory), Helmet, compression, global `ValidationPipe` (whitelist + forbid), global exception filter that hides 5xx details in production, `x-request-id` correlation, JSON logs in production, `enableShutdownHooks()`. |
| Database | Prisma 6.19.3, a single shared `PrismaService` (correct lifecycle; `$disconnect` on shutdown). 54 models, 2 migrations (baseline + email ingestion). Pool size comes only from `connection_limit` in `DATABASE_URL` (the AWS guide sets 5 per task). |
| Auth | `SupabaseAuthGuard` calls `supabase.auth.getUser(token)` (a network call to Supabase) and then loads the user plus interests from PostgreSQL **on every authenticated request**. |
| Files | Private S3 bucket, presigned PUT (signed size + type, 50 MB, 300 s) and GET (300 s). Keys are built server-side. Workspace files check membership. |
| Ingestion | `sourceMessageId` unique on both `EventIngestion` and `Event`, transaction + `P2002` handling, a constant-time token guard, its own 300/min throttle. Sound. |
| Deployment | `docs/deployment/aws-production.md` (ECS Fargate + ALB + CloudFront + RDS) is the current plan. It states **no AWS resources exist yet**. `railway.json`, `apps/api/vercel.json` and `vercel.json` are older alternatives. |
| CI | GitHub Actions: lint, typecheck, unit, web and n8n tests, migration drift check, integration tests on the dedicated test DB + LocalStack, production builds, then gated ECR/ECS deploy via OIDC. |
| Load testing | `scripts/testing/load-test.js` exists but is unsafe and invalid (see R4). |

### Baseline checks run during the audit (2026-10-22)

| Check | Result |
|---|---|
| `npm run typecheck` (web + api) | Pass |
| `npm run lint` | Pass: 0 errors, 46 warnings (29 `no-img-element`, 17 `exhaustive-deps`) |
| API unit tests | 172 passed, 16 suites |
| Web tests | 3 passed |
| n8n workflow tests | 34 passed; `workflow.json` up to date |
| `prisma validate` | Pass |
| API integration tests | **Not run.** Docker is not installed on this machine (`/usr/local/bin/docker` points to a removed `Docker.app`), so the disposable test DB (`127.0.0.1:55432`) and LocalStack are unavailable. |
| Production builds, bundle size | Not run yet (Phase 4) |
| Load tests | Not run. k6 is not installed and there is no safe harness yet. |

---

## 2. Confirmed risks, by priority

### P0: fix or decide before launch

**R1. Rate limiting is per IP address only: 120 req/min, in memory.** (`app.module.ts:54`, default tracker `req.ip`)
- If most users reach the site from campus networks that share a few public IPs (typical campus NAT; **unverified for SRM**), the whole campus shares 120 requests/minute per IP.
- A single portal load already makes 4+ API calls (`/auth/me`, `/opportunities`, `/events`, `/threads`), so a few dozen people on one IP would start receiving 429s.
- Limits are also per instance, so with 2 tasks the effective limit varies by which task answers.
- Only 6 routes have tighter limits. Search, auth and most writes rely on the global limit.
- *Fix:* key authenticated traffic by a hash of the bearer token, keep a looser per-IP ceiling for abuse, and set explicit limits on search, upload-URL and write endpoints.

**R2. Every authenticated request makes an external Supabase call with no timeout.** (`auth/supabase.service.ts:50`)
- `getUser()` is an HTTPS round trip to Supabase Auth. Latency, availability and Supabase's own rate limits therefore apply to every API call.
- The browser-side middleware makes another `getUser()` call per page navigation (`web/src/lib/supabase/middleware.ts`).
- With no timeout, a slow Supabase holds API requests open; Node's fetch defaults are minutes, not seconds.
- The guard then runs 2+ queries (user + interests) before the handler.
- The Supabase project's region and plan are **unverified**. If it isn't in or near Mumbai, every request pays that distance.
- *Options (your decision, see §6):*
  - (a) Keep `getUser()` and add a 3–5 s timeout. Safe, but doesn't reduce load.
  - (b) Verify the JWT locally with `getClaims()`/JWKS. Requires asymmetric signing keys on the Supabase project, to be checked in its dashboard. CuriousBees' own suspend/deactivate still applies immediately; a Supabase-side sign-out would take effect only when the access token expires.
  - (c) A short (≤ 60 s) per-instance cache keyed by token hash. Revocation is delayed by at most the TTL.

**R3. The documented AWS plan exceeds the budget.** `aws-production.md` §3 totals ≈ **$125/month before tax**, without WAF, Supabase, n8n or Gemini.
- At an assumed ₹88/USD plus 18% GST, that is **≈ ₹12,980/month**, about 30% over ₹10,000.
- The rate is an assumption; current prices are verified in Phase 6.
- The biggest fixed items are:
  - the ALB (~$23)
  - public IPv4 addresses (~$22)
  - 4 Fargate tasks (~$42)
  - RDS `db.t4g.small` (~$33)
- See §5 for leaner topologies.

**R4. The existing load test is unsafe and doesn't measure the application.** (`scripts/testing/*`)
- It has no target allowlist, and `run-load-test.sh` accepts any URL.
- Its stages jump straight to 500 virtual users and continue to 7,500.
- `POST /api/files/presigned-upload` does not exist.
- It uses a mock token. Pointed at an API configured with real Supabase credentials, every virtual-user request would trigger a real Supabase Auth call, which would amount to load-testing a third-party service.
- *Fix:* replace it (Phase 7). Do not run it.

**R5. Vulnerable production dependencies.** (`npm audit --omit=dev`: 2 critical, 18 high, 5 moderate)
- Fixes available without a major version bump:
  - `next` 15.5.19 (critical: Server Actions DoS/SSRF, cache confusion)
  - `proxy-addr` 2.0.7 (critical: IP spoofing via IPv4-mapped IPv6; relevant because `trust proxy` feeds rate limiting)
  - `compression` 1.8.1 (high: memory-leak DoS)
  - `multer`, through `@nestjs/platform-express`
  - `sharp`, `postcss`, `nanoid`, `source-map-js`
- `xlsx@0.18.5` has **no npm fix** (prototype pollution, ReDoS). It's used for admin bulk import; replace it, or parse only on validated admin uploads with size limits.
- Others need major upgrades (`prisma@7`, `tailwindcss@4`, `@nestjs/swagger@12`). Out of scope for launch unless exploitable.

**R6. Unguarded destructive root scripts.** `npm run db:reset`, `db:setup` and `team:reset` run `prisma migrate reset --force` against whatever `DATABASE_URL` the shell or root `.env` provides.
- This is the same class of accident as the 2026-10-01 development-database incident.
- The integration-suite guard does not cover these scripts.
- *Fix:* route them through the same "local disposable database only" check, or remove them.

### P1: correctness and privacy bugs found along the way

| # | Finding | Evidence | Fix |
|---|---|---|---|
| B1 | Search returns **moderation-hidden publications**: neither the PostgreSQL nor the OpenSearch path filters `hidden`. | `search/search.service.ts:137,200`, `feed/feed.service.ts:51` | Add `hidden: false` |
| B2 | Admins are excluded from people lists by `NOT name contains 'admin'`. This also hides real people whose names contain those letters, such as "P**admin**i". | 5 places: `search`, `feed`, `users.service` ×3 | Filter on `role` instead |
| B3 | Researcher discovery (`GET /api/users/collaborators`) returns whole `User` rows to any signed-in user. That includes email, `supabaseAuthId`, `employeeId`, `supervisorEmail` and approval fields. | `users.service.ts:240` uses `include` with no `select` | Explicit `select`, after checking which fields the frontend uses |
| B4 | The public attachment download serves any well-formed `threads/…` key without checking that it belongs to a visible post. Keys contain a random UUID, so they can't be guessed; but files of moderated posts stay downloadable from old links. | `threads.service.ts:552` | Look up the attachment, require `thread.hidden = false` |
| B5 | `GET /api/events?limit=` has no upper bound, and a negative `skip` causes a 500. | `events.service.ts:35`, `events.controller.ts:23` | Clamp the limit to 1–100 and `skip` to ≥ 0 |
| B6 | Feed cursor pagination orders by `createdAt` only, so equal timestamps can duplicate or drop posts at page boundaries. `/threads/counts` includes hidden posts. | `threads.service.ts:94,103` | Add an `id` tiebreaker; filter `hidden: false` |
| B7 | Search `q` has no length limit, and every term runs `ILIKE '%term%'` on 3 tables. | `search.service.ts` | Cap at about 100 characters |
| B8 | Outbound calls have no timeouts: Supabase, Brevo (`mail.service.ts:55`), Google (`google-workspace.service.ts`), Zoom (`zoom-workplace.service.ts`). | — | `AbortSignal.timeout()` |
| B9 | Access logs record full URLs, including search terms and file keys in query strings. A client-supplied `x-request-id` is trusted with no length or format check. | `logging.middleware.ts` | Log the path only; validate the ID or generate a new one |
| B10 | The daily digest cron builds a message and only logs it; nothing is sent. "Today" is computed in the container's timezone (UTC), not IST. | `digest.scheduler.ts:46` | Document it (known limitation); fix the timezone if the digest is implemented |

### P2: potential bottlenecks that need measurement (not yet confirmed)

| # | Path | Why it might matter | Measure with |
|---|---|---|---|
| M1 | Feed `sort=top` | Orders by relation counts, so it aggregates all likes and comments on every request; cursor paging over a computed order is unstable. | k6 + `EXPLAIN (ANALYZE, BUFFERS)` on synthetic data |
| M2 | Search (3 tables, `ILIKE '%…%'`) | Sequential scans grow with the number of threads, publications and users. | Same; `pg_trgm` GIN indexes only if slow |
| M3 | Portal startup fan-out | `fetchData()` loads `/api/opportunities` with **no limit**, plus 100 events and 20 threads. Each request costs a Supabase call plus 2+ auth queries. | Count requests per page load; time each |
| M4 | Thread detail / comments | All top-level comments with all replies, unbounded. | Payload size with synthetic large threads |
| M5 | Prisma pool of 5 per task | 500 users × several sequential queries per request; default `pool_timeout` is 10 s. | Pool-wait metrics during k6 runs |
| M6 | Auth guard overhead | User + interests loaded on every request; the avatar comparison may write. | Query counts per request |

---

## 3. Database and index review

What is already present and correct:
- `Thread(hidden, createdAt)`
- `Publication(hidden, createdAt)` and `(userId, createdAt)`
- `Notification(userId, createdAt)`
- `Comment(threadId, createdAt)`
- unique `sourceMessageId`
- relation indexes on foreign keys

Lists are capped at 50 for feed, publications and notifications, and at 20 for discovery.

| Candidate | Rationale | Status |
|---|---|---|
| `Event(status, date)` | The events list filters by `status` and sorts by `date`; only `departmentId` is indexed. | Add only if the plan shows a sort or scan cost on realistic data. Events is likely a small table. |
| `Notification(userId) WHERE readAt IS NULL` (partial) | Supports the unread count. The existing `(userId, createdAt)` index is probably enough at hundreds of notifications per user. | Measure first |
| `pg_trgm` GIN on `Thread.title/content`, `User.name`, `Publication.title` | Supports `ILIKE '%…%'` search. Extension available on RDS (**to confirm** for the chosen database). | Only if M2 is slow |
| `ThreadAttachment(url)` | Needed only if B4 is fixed by lookup. | With B4 |
| Redundant `User(role)` (covered by `(role, status)`) | Minor write overhead. | Leave: the additive-only migration rule; tiny table |

**Connection budget.** 2 API tasks × `connection_limit=5` plus one migration task is far below what a `db.t4g.small` allows. The allowance comes from AWS's memory-based default formula, roughly 190–220; **unverified** for the chosen instance. Whether to raise it to about 10 per task depends on M5.

---

## 4. Frontend notes (to measure in Phase 4)

- No production build or bundle report yet. That's the first Phase 4 step.
- `api-client.ts` logs every request (method, URL, token length) to the browser console in production.
- 29 `<img>` warnings. Moving to `next/image` needs `remotePatterns` for Google avatars. Image optimisation costs CPU when self-hosted, or usage-based fees on Vercel, so do it only for measured gains.
- Data is fetched per page with `useEffect`, with no request de-duplication beyond the auth call. React Query is available, but migrating to it is a larger change. Propose only if measurement shows duplicate fetches.
- No secrets in `NEXT_PUBLIC_*`. Only the Supabase URL and anon key, the API URL and the site URL are public; the Dockerfile and CI pass only these.

---

## 5. Deployment and budget implications

Verified pricing comes in Phase 6; the figures below are the repository's own estimates or rough estimates.

| Topology | Fit with ₹10k incl. GST | Notes |
|---|---|---|
| **Documented AWS plan** (CloudFront → ALB → 2 API + 2 web Fargate → RDS small) | ✗ ≈ ₹13k | Highly available, but the ALB, 6 public IPv4 addresses and 4 tasks dominate the cost. |
| Trimmed ECS (1 API + 1 web task) | borderline ≈ ₹10–11k | Still pays for the ALB. One task per service means no redundancy during deploys. |
| **Lean AWS Mumbai**: CloudFront → 1 EC2 (Graviton) running API + web containers, RDS micro/small, S3 | ✓ likely ₹5–8k | Cheapest single-region option. Single instance = single point of failure; deploys need care. |
| Vercel (web) + API on AWS Mumbai + RDS | ✓ likely, if Vercel Pro (~$20) fits | Vercel's Hobby plan is for non-commercial use (check whether institutional use qualifies). |
| Vercel + Railway (API) + RDS Mumbai | ✗ not recommended | Railway has no India region (to re-check). Every database query would cross regions (Singapore ↔ Mumbai adds tens of ms per query, several queries per request), and RDS would have to be publicly reachable. |

Costs **not** in the repository's estimate:
- Supabase plan: the free tier has no SLA and pauses inactive projects; Pro is a paid USD plan.
- n8n hosting: self-hosted needs compute; n8n Cloud is a paid plan.
- Gemini API usage: very small at email volumes.
- Brevo above 300 emails/day.
- Backups beyond the free allowance, CloudWatch growth, and data transfer.

---

## 6. Decisions and approvals needed

1. **Tooling for safe testing**
   - Install k6 (`brew install k6`).
   - For the disposable test database, choose one:
     - (a) reinstall Docker Desktop, which also restores LocalStack for upload tests, or
     - (b) start a throwaway PostgreSQL cluster from the Homebrew binaries already installed: new data directory in the scratchpad, `127.0.0.1:55432`, user `cbtest`, database `curiousbees`, entirely separate from the development server on 5432.
   - Without Docker, upload tests have no S3 emulator.
2. **Rate-limit policy (R1).** Proposed:
   - 300/min per signed-in user
   - 1,200/min per IP ceiling
   - search 60/min per user
   - upload URLs 30/min per user (unchanged)
   - writes 60/min per user
   - Do you know how many public IPs SRM campus traffic uses?
3. **Supabase token verification (R2):** option (a), (b) or (c).
   - The Supabase project's region and whether it uses asymmetric JWT signing keys also need checking. I can't do that, since Supabase access is off-limits.
4. **Dependency patch upgrades (R5):** run `npm audit fix` limited to non-major versions, then re-run every check. Also choose a replacement approach for `xlsx`.
5. **Behaviour fixes B1–B3.** These change what users see: hidden publications disappear from search, people with "admin" in their name reappear, and discovery returns fewer fields.
6. **Guard or remove the root `db:reset` / `db:setup` / `team:reset` scripts (R6).**
7. **Topology inputs:**
   - Who will deploy and operate it (ITKM?)
   - Whose AWS account
   - Is high availability required at launch, or is a single instance acceptable?
   - Supabase plan
   - Where n8n will run

---

## 7. Proposed implementation order (after approval)

1. **Safety first:** guard the destructive scripts (R6); build the new load-test harness (R4), meaning a local-only target allowlist, a test-only API entry point that stubs Supabase with locally signed tokens and refuses production, and a synthetic seed.
2. **Quick, behaviour-preserving wins:** B5, B6, B7, B8, B9, readiness-check timeout, non-major dependency patches. Run all checks after each.
3. **Rate limiting (R1) and the token-verification choice (R2).**
4. **Approved behaviour fixes:** B1–B4.
5. **Measure:** k6 stages 25 → 50 → 100 → 250 → 500 virtual users, with the API container limited to the target task size. Then `EXPLAIN` the slowest queries, and add indexes only where a plan justifies them.
6. **Frontend build and bundle measurement,** then targeted fixes.
7. **Phase 6 costing** with verified prices, and the final topology recommendation.

Files expected to change:
- `apps/api/src/app.module.ts`
- `auth/supabase.service.ts`
- `search/search.service.ts`
- `feed/feed.service.ts`
- `users/users.service.ts`
- `threads/threads.service.ts`
- `events/events.controller.ts`
- `events/events.service.ts`
- `common/middleware/logging.middleware.ts`
- `app.controller.ts`
- `users/mail.service.ts`
- `integrations/services/*.service.ts`
- root `package.json`, `package-lock.json`
- `docker-compose.dev.yml`
- new `scripts/load/*` and an API load-test entry point under `apps/api/test/`
- docs

---

## 8. Stale documents to mark as superseded

These make claims the code no longer supports:
- `docs/load-testing.md` and `docs/production-readiness.md`: a 5,000-user target; "19 tests"
- `docs/architecture/PRODUCTION_CAPACITY_COST_ANALYSIS.md`: PgBouncer, tier capacities never measured
- `docs/audits/RAILWAY_DEPLOYMENT_AUDIT.md`: Clerk, a Supabase pooler, warn-only environment validation
- `apps/api/vercel.json`: a serverless NestJS build pointing at `dist/src/main.js`

Minor infrastructure notes:
- `docker-compose.dev.yml` publishes Redis (which the code no longer uses) and other ports on all interfaces.
- `docker-compose.yml` uses PostgreSQL 15, while production and tests use 17.

---

## 9. Phase 2 status (2026-10-22)

### Done

| Item | Status |
|---|---|
| R1 rate limits | Per session (token hash) per endpoint, per IP for anonymous traffic, and a per-IP total. All configurable; see `docs/operations/rate-limiting.md`. |
| R2 Supabase verification | 5 s timeout (`SUPABASE_AUTH_TIMEOUT_MS`). Fails closed. Outages return 503 `AUTH_SERVICE_UNAVAILABLE` instead of 401, because the frontend signs people out on 401. Verification method unchanged (see below). |
| R4 load test | Old script removed. The new harness is in `scripts/load/` and `apps/api/test/load/`; see `docs/load-testing.md`. |
| R5 dependencies | Critical findings cleared: `next` 15.5.28, `proxy-addr` 2.0.8. Also patched: `compression`, `multer`, `sharp`, `body-parser`, `qs`. |
| R6 reset scripts | Guarded: they accept only an explicit `RESET_DATABASE_URL` matching the disposable test database. `scripts/db-setup.js` delegates to the same guard. |
| B1–B3 | Fixed, with unit and real-database regression tests. B3 also closes `GET /users/researchers?role=INSTITUTE_ADMIN`, which listed administrators. |

### Local JWT verification: not switched

`supabase-js` 2.112.3 provides `auth.getClaims()`:
- It verifies locally only when the access token is signed with an asymmetric key (ES256/RS256 with a `kid`), using the project's JWKS, cached for 10 minutes.
- For legacy HS256 projects it silently calls `getUser()` over the network, as today.
- It checks the signature and expiry, but not issuer or audience; CuriousBees would have to add those checks.
- The claims carry no `email_confirmed_at`, so the one-time linking of an admin-provisioned account would still need `getUser()`.

**Not verified:** whether the Supabase project uses asymmetric signing keys (Supabase access is off-limits from here). To check, any one of:
- Dashboard → Project Settings → JWT Keys
- `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` lists EC or RSA keys
- a real access token's header shows `"alg":"ES256"` with a `kid`

**Security trade-off if adopted:**
- A sign-out or ban in Supabase takes effect only when the access token expires (default 1 hour, configurable in Supabase).
- CuriousBees' own suspend/deactivate still applies immediately, because the user's status is read from the database on every request.
- Gains:
  - no Supabase round trip per request
  - no dependence on Supabase being reachable for every request
  - no Supabase calls caused by made-up tokens

### `xlsx` (SheetJS 0.18.5): remaining high-severity advisories, no npm fix

The advisories are prototype pollution (GHSA-4r6h-8v6p-xvw6, fixed in 0.19.3) and ReDoS (GHSA-5pgg-2g8v-p4x9, fixed in 0.20.2).

Exposure: only admin bulk import (`admin`, `scholars`, `supervisors`, `admins`, `users` controllers). It requires an authenticated institute administrator, one file, and the `IMPORT_MAX_BYTES` limit.

Options, in order of preference:
1. Install the vendor's fixed build from SheetJS's own CDN (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`), pinned in `package.json`. This is the same API, but a tarball dependency from outside npm.
2. Replace `xlsx` with `exceljs` (maintained on npm) for `.xlsx` files and parse CSV directly. That means a small rewrite of 4 import functions, with tests.
3. Accept CSV only and remove `.xlsx` import. This changes behaviour for administrators.

Until one of these is done: keep imports admin-only, consider running them in a worker with a time limit, and don't open the file types up to other roles.

### Remaining production findings (`npm audit --omit=dev`: 15 = 12 high, 3 moderate; was 25 with 2 critical)

All of these need major upgrades or have no fix:
- `xlsx` (above)
- `prisma` CLI → `deepmerge-ts` (CLI configuration loading only)
- `@nestjs/swagger` 8 → `js-yaml`, `lodash` (Swagger is off in production)
- `tailwindcss` 3 build chain (`braces`, `micromatch`, `fast-glob`; build time only)
- `next` → its bundled `postcss` 8.4.31 (build-time CSS processing)
