# CuriousBees — Performance Validation & Load-Testing Plan

**Current Status:** **Unverified Capacity.** The repository includes a k6 load-testing harness ([scripts/load/curiousbees.k6.js](file:///Users/matheshwaran/Projects/CuriousBees/scripts/load/curiousbees.k6.js) and [scripts/load/run.js](file:///Users/matheshwaran/Projects/CuriousBees/scripts/load/run.js)), **but** no load test has been executed against live staging infrastructure for 500, 2,500, or 5,000 concurrent users.

---

## 1. Recommended Tooling & Existing Harness
- **Primary Tool:** **k6** (already integrated in `scripts/load/curiousbees.k6.js` with `target-guard.js` preventing accidental runs against production).
- **Environment:** Dedicated staging environment mirroring the target tier (never run against production).

## 2. Load Test Scenarios (Per Tier)
1. **Scenario A — Read-Heavy Feed & Discovery (70% traffic):** `GET /api/threads`, `GET /api/threads/counts`, `GET /api/collaborations/statuses`, `GET /api/feed/trending`, `GET /api/feed/peers`, `GET /api/users/researchers`.
2. **Scenario B — Social Writes & Moderation (15% traffic):** `POST /api/threads`, `POST /api/comments`, `POST /api/threads/:id/like`, `POST /api/threads/:id/save`.
3. **Scenario C — Auth, Profile & Supervision (10% traffic):** `GET /api/auth/me`, `GET /api/users/:id/profile`, `GET /api/supervisor-requests`, `GET /api/notifications`.
4. **Scenario D — S3 Presigned File Flows (5% traffic):** `POST /api/threads/files/upload-url` + `GET /api/workspaces/:id/files/:fileId/download`.

## 3. Execution Profile
- **Ramp-up:** 5 minutes linear ramp to sustained concurrency.
- **Sustained Concurrency:** 30 minutes at target concurrent VUs (`500` / `2,500` / `5,000`).
- **Burst Test:** 5-minute spike at 1.5×–2× peak RPS.

## 4. Proposed Performance Acceptance Matrix *(Targets Requiring SRM Approval)*

| Metric | Base Target (500 Conc.) | Growth Target (2,500 Conc.) | Institutional Target (5,000 Conc.) |
| :--- | :---: | :---: | :---: |
| **Target Sustained RPS** | 45 RPS | 225 RPS | 450 RPS |
| **HTTP Error Rate (5xx / timeouts)** | `< 0.5%` | `< 0.5%` | `< 0.2%` |
| **API p50 Latency** | `< 120 ms` | `< 120 ms` | `< 100 ms` |
| **API p95 Latency** | `< 400 ms` | `< 450 ms` | `< 450 ms` |
| **API p99 Latency** | `< 900 ms` | `< 1,000 ms` | `< 1,000 ms` |
| **ECS Task CPU / RAM Ceiling** | `< 70%` sustained | `< 70%` sustained | `< 70%` sustained |
| **PostgreSQL Pool Utilization** | `< 75%` of PgBouncer/DB max | `< 75%` | `< 75%` (reads offloaded to replica) |
| **Rate-Limit Validation** | Confirm `RATE_LIMIT_USER_READ` / `WRITE` thresholds | Verify shared Redis/Valkey throttler consistency across tasks | Verify zero cross-instance rate-limit drift |
