# Rate limiting

Implemented in `apps/api/src/common/throttling/rate-limits.ts` with `@nestjs/throttler`. Every request passes two throttlers:

| Throttler | Counts | Default (per 60 s) | Variable |
|---|---|---:|---|
| `default` | Each signed-in session (hash of the bearer token), **per endpoint**: reads | 300 | `RATE_LIMIT_USER_READ` |
| | …writes (POST/PUT/PATCH/DELETE) | 60 | `RATE_LIMIT_USER_WRITE` |
| | …search (`GET /api/feed/search`) | 60 | `RATE_LIMIT_SEARCH` |
| | Requests without a bearer token, per client IP, per endpoint | 120 | `RATE_LIMIT_ANONYMOUS` |
| `ip` | Every request from one client IP, **all endpoints together** | 6,000 | `RATE_LIMIT_IP_TOTAL` |

- **Window:** `RATE_LIMIT_WINDOW_SECONDS`, default 60.
- **Route overrides** (`@Throttle({ default: … })`) replace the `default` limit for that route. Examples: upload URLs at 30, downloads at 60, the n8n ingestion endpoints at 300 per token.
- **When a limit is hit:** the response is `429`, with a `Retry-After` (or `Retry-After-ip`) header.

## Why sessions and not IPs

On a campus network, many people can share one public IP address. With per-IP limits they would share one budget.

A session is keyed by a SHA-256 hash of its access token: the token itself is never stored. The unverified `sub` claim in the token is deliberately *not* used, because anyone could put someone else's `sub` in a made-up token and use up their budget.

A new access token (Supabase refreshes them about hourly) starts a new budget. That is acceptable for windows of a minute.

## Sizing `RATE_LIMIT_IP_TOTAL` (secondary safeguard)

This limit exists to stop one source flooding the API. For example, made-up tokens each get a fresh session budget and each cost a Supabase verification call.

It must still be high enough for the largest group of real users who share one public IP:

```
RATE_LIMIT_IP_TOTAL ≥ (concurrent users behind one IP) × (API requests per user per minute) × 1.5
```

The default of 6,000 per minute allows the worst case: about 500 concurrent users behind a single IP at around 8 requests a minute each. SRM's actual number of egress IPs is **not known**.
- If the institution confirms traffic is spread over several IPs, lower it proportionally.
- If 429s with `Retry-After-ip` appear in logs during normal use, raise it.

## Client IP and proxies

`req.ip` comes from Express's `trust proxy`, set from `TRUST_PROXY_HOPS`:

| Topology | `TRUST_PROXY_HOPS` |
|---|---|
| CloudFront → ALB → API | `2` |
| Single proxy or load balancer | `1` |
| No proxy | `0` |

- With a hop count, Express trusts exactly that many addresses at the right-hand end of `X-Forwarded-For`. Entries a client adds to the left are ignored.
- With `0`, `X-Forwarded-For` is ignored entirely.
- Setting the value higher than the real number of proxies lets clients choose their own IP. Don't.
- A numeric hop count does not use `proxy-addr`'s subnet matching, which is where GHSA-jqcg-44mw-7w3h applies; `proxy-addr` is nevertheless at the fixed 2.0.8.

## Limitations

- Counters live in each API instance's memory. With N instances behind a load balancer, a client can get up to N× the limit. That is acceptable at 1–2 instances; a shared store would be needed for strict global limits.
- Restarting an instance resets its counters.
