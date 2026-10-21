# Load testing

Capacity claims must come from measured runs. Nothing here may target production, a shared development database, Supabase or any other external service.

The previous `scripts/testing/load-test.js` was removed. It had no target allow-list, jumped straight to 500 and then 7,500 virtual users, called an endpoint that does not exist, and could have sent every request's token check to real Supabase.

## Safety controls

| Control | Where |
|---|---|
| Loopback targets only. Other hosts must be listed exactly in `LOAD_TEST_ALLOWED_HOSTS`. The production domain and third-party services are refused even if listed. | `scripts/load/target-guard.js`, repeated in the k6 script |
| The target must answer with `X-CuriousBees-Load-Test: 1`, which only the load-test server sends. | `run.js` and the k6 `setup()` |
| The local server only connects to the disposable test database (`cbtest@127.0.0.1:55432/curiousbees`). | `apps/api/test/load/load-env.ts` |
| No outbound network at all from the server. Supabase is replaced by locally signed test tokens; mail, Gemini, n8n, Google, Zoom and S3 can't be reached. Upload-URL signing is a local computation. | `network-guard.ts`, `load-server.ts` |
| Real credentials are removed from the server's environment. | `scrubServiceEnvironment` |
| Stages run in order (25 → 50 → 100 → 250 → 500). Each needs the previous stage to have passed on the same target and data set. 500 also needs `LOAD_TEST_CONFIRM_500=yes`. | `run.js` |
| Bounded: 1 min ramp-up, 1–10 min steady (default 5), 30 s ramp-down, hard cap of 12 min. | k6 `options` |
| Stop conditions: abort if more than 5% of requests fail, or fewer than 95% of checks pass, after the first 30 s. | k6 thresholds (`abortOnFail`) |
| Synthetic data only. Emails use the reserved `.invalid` domain; written comments are prefixed `[loadtest]`. The seed resets only the disposable database. | `seed-load-data.ts` |

## Workload

Each virtual user is one synthetic, signed-in researcher. It opens the portal with the same 4 requests the web app makes on start. It then repeats one weighted action, pausing 2–8 s between actions:

| Action | Share | Requests |
|---|---:|---|
| Feed | 28% | `GET /api/threads?limit=20`; 30% also load the next page |
| Post + comments | 12% | `GET /api/threads/:id`, `GET /api/comments/thread/:id` |
| Notifications | 10% | `GET /api/notifications` |
| Events | 7% | `GET /api/events` |
| Search | 7% | `GET /api/feed/search?q=…` |
| Researcher directory | 7% | `GET /api/users/researchers` |
| Publications | 6% | `GET /api/publications` |
| Workspaces | 6% | `GET /api/workspaces`, then one the user belongs to |
| Profile | 4% | `GET /api/users/profile` |
| Page load session check | 4% | `GET /api/auth/me` |
| Comment | 4% | `POST /api/comments` |
| Like / unlike | 3% | `POST /api/threads/:id/like` ×2 |
| Upload URL | 2% | `POST /api/threads/files/upload-url` (presigned URL only, no upload) |

That is roughly one request every 4–5 s per virtual user: a very active person. 500 virtual users at that pace is a heavier load than 500 people who are merely signed in. Real users typically pause longer between actions.

**Proposed acceptance criteria:**
- read p95 < 500 ms
- write p95 < 800 ms
- failed requests < 1%
- no steady growth in memory, and no exhaustion of the database connection pool

**Recorded per stage** (in `scripts/load/results/`):
- requests per second; p50, p95 and p99 latency for reads and writes; error rate (k6 summary)
- API process CPU, RSS memory and event-loop delay (every 5 s)
- PostgreSQL connections by state, sessions waiting on locks, and queries running longer than 200 ms (every 5 s)

## What the numbers do and don't represent

- **Supabase isn't called.** Each real request also pays one Supabase Auth round trip. Set `LOAD_TEST_AUTH_LATENCY_MS` (for example to the measured latency from the hosting region) to include it.
- **The machine is different.** The API, PostgreSQL and k6 share one machine, and one Node process uses at most one core. A 0.5 vCPU cloud task has about half that. Treat local results as an upper bound per instance, and repeat on an approved staging environment of the production size before launch.
- **Rate limits.** Every virtual user comes from 127.0.0.1, so the server raises `RATE_LIMIT_IP_TOTAL` (the per-IP total) to avoid limiting the generator. Per-session limits stay as configured.

## Running

```bash
# 1. Disposable test database on 127.0.0.1:55432 (Docker: docker compose -f docker-compose.test.yml up -d)
export LOAD_DATABASE_URL='postgresql://cbtest:cbtest_local_only@127.0.0.1:55432/curiousbees?schema=public'

# 2. Synthetic data: 1,500 users, 6,000 posts, 20,000 comments, 30,000 likes, 3,000 publications, …
npm run load:seed

# 3. Check the harness, one request at a time (no load generator needed)
npm run load:run -- --smoke

# 4. Stages, in order
npm run load:run -- --stage 25
npm run load:run -- --stage 50   # …100, 250, then 500 with LOAD_TEST_CONFIRM_500=yes
```

### Tooling

k6 is not installed automatically. To install it on macOS: `brew install k6` (Grafana's k6 binary from Homebrew). The `--smoke` mode works without it.
