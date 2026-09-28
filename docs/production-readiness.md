# CuriousBees V2 — Production Readiness Assessment

## Current Status: `Production Deployment Candidate`
> **Important:** The system is designated as a **Production Deployment Candidate**. Claims regarding 5,000 peak concurrent user capacity must be validated on staging via the load-testing suite before making any production warranty.

---

## 1. Production Readiness Checklist

| Domain | Criteria | Status | Notes |
| :--- | :--- | :---: | :--- |
| **ALB Routing** | `/health/live` & `/health/ready` implemented | ✅ Passed | Returns 503 if RDS is unreachable. |
| **ALB Routing** | `/api/*` routed to Backend :4000, `/*` to Web :3000 | ✅ Passed | Prefix exclusions configured in NestJS. |
| **Database** | Compound indexes for high-frequency queries | ✅ Passed | `User`, `Thread`, `Publication`, `Notification`. |
| **Database** | Controlled connection pooling | ✅ Passed | Configured via connection string parameters. |
| **API Scalability** | Capped pagination on all major list endpoints | ✅ Passed | Feed, publications, users (`limit <= 50`). |
| **API Resilience** | Rate limiting protection | ✅ Passed | `@nestjs/throttler` activated globally. |
| **File Storage** | Direct browser-to-S3 presigned uploads | ✅ Passed | Backend does not stream multi-megabyte payloads. |
| **Logging** | Structured JSON streaming to stdout/stderr | ✅ Passed | CloudWatch compatible; container disk logging removed. |
| **Tracing** | Correlation ID (`x-request-id`) propagation | ✅ Passed | Logging middleware + HTTP exception filter. |
| **Docker** | Multi-stage, standalone, non-root runner | ✅ Passed | Images run as `nextjs` (3000) and `nestjs` (4000). |
| **Multi-Instance**| Stateless web/api containers behind ALB | ✅ Passed | No local memory sessions or file dependencies. |
| **Scheduled Jobs**| In-process cron multi-instance protection | ✅ Passed | Guarded by `ENABLE_CRON` environment flag. |
| **CI/CD** | Automated pipeline with tests & build validation | ✅ Passed | GitHub Actions `.github/workflows/ci-cd.yml`. |
| **Test Coverage**| Unit & integration tests for core modules | ✅ Passed | 6 test suites, 19 automated tests passing. |

---

## 2. Governance Rules Verified
1. **Institute Admin** is an institutional governance/administrative role, not an academic researcher by default.
2. **Research Supervisors** join the platform directly and do not require Institute Admin approval.
3. **Research Scholars** require a confirmed supervision relationship with an active supervisor.
4. **Backend Authorization Guards** enforce permissions server-side on every route; frontend route guards are UI affordances only.
