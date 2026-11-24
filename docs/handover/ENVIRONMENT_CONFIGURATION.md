# CuriousBees — Environment Configuration Reference

**Related:** [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | [SECURITY_AND_ACCESS_CONTROL.md](./SECURITY_AND_ACCESS_CONTROL.md)

All variables below are verified against [`apps/api/src/config/env.validation.ts`](../../apps/api/src/config/env.validation.ts), [`apps/web/next.config.ts`](../../apps/web/next.config.ts), and application source files. **Never commit real credentials, service-role keys, or passwords to Git.**

---

## 1. Backend API Environment Variables (`apps/api`)

> **Important:** In `NODE_ENV=production`, `apps/api` validates configuration with `productionSchema` at boot and **refuses to start** if any required production variable is missing or invalid. Changing any backend variable requires restarting the API process/container.

| Variable | Req. (Prod) | Req. (Dev) | Purpose | Source / Where to Obtain | Example Placeholder | Restart Req. |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| `NODE_ENV` | Yes | Yes | Runtime mode (`development`, `production`, `test`) | Deployment config | `production` | Yes |
| `PORT` | Opt (4000) | Opt (4000) | HTTP listen port for NestJS | Infrastructure config | `4000` | Yes |
| `DATABASE_URL` | **Yes** | **Yes** | PostgreSQL connection URL (Supabase PgBouncer `:6543` in prod) | Supabase Dashboard → Database | `postgresql://postgres.<ref>:<PW>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Yes |
| `DIRECT_URL` | Rec. | Opt | Direct Postgres URL (`:5432`) for Prisma migrations (`prisma migrate deploy`) | Supabase Dashboard → Database | `postgresql://postgres:<PW>@db.<ref>.supabase.co:5432/postgres` | Yes |
| `FRONTEND_URL` | **Yes** (`https://`) | Opt | Canonical web origin; used for CORS & email links | SRM DNS / Hosting | `https://curiousbees.srmist.edu.in` | Yes |
| `ALLOWED_ORIGINS` | Rec. | Opt | Additional comma-separated CORS origins | SRM Hosting | `https://curiousbees.srmist.edu.in` | Yes |
| `ALLOWED_EMAIL_DOMAINS` | **Yes** | Opt | Comma-separated email domains permitted to sign in | SRM IT Policy | `srmist.edu.in` | Yes |
| `SUPABASE_URL` | **Yes** | Opt | Supabase project URL (`NEXT_PUBLIC_SUPABASE_URL` fallback in dev) | Supabase → Settings → API | `https://<project-ref>.supabase.co` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Rec. | Privileged Supabase Admin key for JWT verification & user lookups | Supabase → Settings → API (**Secret**) | `<SUPABASE_SERVICE_ROLE_KEY>` | Yes |
| `SUPABASE_AUTH_TIMEOUT_MS` | Opt | Opt | Auth verification timeout in ms (`500`–`30000`) | Ops tuning | `5000` | Yes |
| `AWS_REGION` | **Yes** | Opt | AWS region for S3 (`ap-south-1` default in code) | AWS Console | `ap-south-1` | Yes |
| `AWS_S3_BUCKET` | **Yes** | Opt | Private S3 bucket name for attachments & workspace files | AWS S3 Console | `srm-curiousbees-prod-files` | Yes |
| `AWS_ACCESS_KEY_ID` | IAM / Key | Opt | IAM user key (omit when using ECS IAM Task Role) | AWS IAM (**Secret**) | `<AWS_ACCESS_KEY_ID>` | Yes |
| `AWS_SECRET_ACCESS_KEY` | IAM / Key | Opt | IAM user secret (omit when using ECS IAM Task Role) | AWS IAM (**Secret**) | `<AWS_SECRET_ACCESS_KEY>` | Yes |
| `AWS_S3_ENDPOINT` | No (Dev only) | Opt | Custom S3 endpoint (e.g., LocalStack `http://localhost:4566`, ignored in prod) | Local Docker test | `http://localhost:4566` | Yes |
| `BREVO_API_KEY` | **Yes** | Opt | Brevo transactional email API v3 key | Brevo Dashboard → SMTP & API (**Secret**) | `<BREVO_API_KEY>` | Yes |
| `MAIL_FROM_EMAIL` *(or `BREVO_SENDER_EMAIL`)* | **Yes** | Opt | Verified sender email address | Brevo Verified Senders | `noreply@curiousbees.srmist.edu.in` | Yes |
| `MAIL_FROM_NAME` *(or `BREVO_SENDER_NAME`)* | Opt | Opt | Display name for outgoing emails (default: `CuriousBees`) | SRM Comms | `CuriousBees SRM` | Yes |
| `MAIN_ADMIN_EMAIL` | Rec. | Opt | Primary institutional admin email & root fallback | SRM ITKM | `itkm-admin@srmist.edu.in` | Yes |
| `BOOTSTRAP_ADMIN_EMAIL` | Seed only | Opt | Admin email created by `seed-production.js` & domain exemption | SRM ITKM | `itkm-admin@srmist.edu.in` | Yes |
| `BOOTSTRAP_ADMIN_NAME` | Seed only | Opt | Display name for bootstrapped admin (default: `Curiousbees`) | SRM ITKM | `SRM Institute Admin` | Yes |
| `TRUST_PROXY_HOPS` | Rec. | Opt (0) | Proxy hops to trust (`0`–`5`): `1` for ALB, `2` for CloudFront→ALB | Infra topology | `2` | Yes |
| `ENABLE_CRON` | Opt | Opt (`false`) | Set `true` on **1** prod API task to run daily 8 AM digest cron | ECS Task Def | `true` | Yes |
| `ENABLE_SWAGGER` | Opt (`false`) | Opt (`true`) | Exposes `/api/docs` in production when `true` (keep `false` in prod) | Security policy | `false` | Yes |
| `LOG_TO_FILE` | Opt | Opt | When `true`, Winston writes `logs/combined.log` & `logs/error.log` | Ops logging | `false` (use stdout in containers) | Yes |
| `GOOGLE_CLIENT_ID` | Opt | Opt | Google Workspace OAuth Client ID (Meet/Calendar/Chat integration) | Google Cloud Console | `<GOOGLE_CLIENT_ID>` | Yes |
| `GOOGLE_CLIENT_SECRET` | Opt | Opt | Google Workspace OAuth Client Secret | Google Cloud Console (**Secret**) | `<GOOGLE_CLIENT_SECRET>` | Yes |
| `OPENSEARCH_ENDPOINT` | Opt | Opt | Optional OpenSearch cluster URL (falls back to Prisma if unset) | AWS OpenSearch | `https://<domain>.ap-south-1.es.amazonaws.com` | Yes |
| `OPENSEARCH_REGION` | Opt | Opt | OpenSearch AWS region (defaults to `AWS_REGION`) | AWS OpenSearch | `ap-south-1` | Yes |
| `OPENSEARCH_INDEX` | Opt | Opt | OpenSearch index name (default: `curiousbees`) | AWS OpenSearch | `curiousbees` | Yes |
| `N8N_INTEGRATION_TOKEN` | Opt | Opt | Shared secret (`>= 32` chars) for `X-Integration-Token` on `/api/integrations/n8n/*` | Generated secret | `<32+_CHAR_RANDOM_TOKEN>` | Yes |
| `N8N_INTEGRATION_TOKEN_PREVIOUS` | Opt | Opt | Previous token accepted during zero-downtime secret rotation | Generated secret | `<PREVIOUS_32+_CHAR_TOKEN>` | Yes |
| `EVENT_INGESTION_TRUSTED_SENDERS` | Opt | Opt | Comma-separated trusted sender emails for n8n event ingestion | SRM Event Policy | `events@srmist.edu.in` | Yes |
| `RATE_LIMIT_WINDOW_SECONDS` | Opt (60) | Opt (60) | Throttling window length in seconds | Rate-limit tuning | `60` | No (read per req) |
| `RATE_LIMIT_USER_READ` | Opt (300) | Opt (300) | Signed-in GET/HEAD/OPTIONS limit per endpoint per window | Rate-limit tuning | `300` | No |
| `RATE_LIMIT_USER_WRITE` | Opt (60) | Opt (60) | Signed-in POST/PUT/PATCH/DELETE limit per endpoint per window | Rate-limit tuning | `60` | No |
| `RATE_LIMIT_ANONYMOUS` | Opt (120) | Opt (120) | Unauthenticated requests per IP per endpoint per window | Rate-limit tuning | `120` | No |
| `RATE_LIMIT_SEARCH` | Opt (60) | Opt (60) | Search requests per signed-in session per window | Rate-limit tuning | `60` | No |
| `RATE_LIMIT_IP_TOTAL` | Opt (6000) | Opt (6000) | Total requests per IP across all endpoints (size for campus NAT) | Rate-limit tuning | `6000` | No |

---

## 2. Frontend Web Environment Variables (`apps/web`)

> **Build-Time vs. Runtime Rule:** `NEXT_PUBLIC_*` variables are **inlined into the browser JavaScript bundle during `npm run build:web`**. Changing any `NEXT_PUBLIC_*` variable requires **rebuilding and redeploying** the web image. Server-only variables (`API_URL`, `APP_URL`, `ALLOWED_EMAIL_DOMAINS`) are read at runtime and require only a container restart.

| Variable | Scope | Req. (Prod) | Purpose | Example Placeholder | Change Effect |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | Build-time (Public) | **Yes** | Canonical public origin (`next.config.ts` fails prod build if missing) | `https://curiousbees.srmist.edu.in` | Rebuild + Restart |
| `NEXT_PUBLIC_API_URL` | Build-time (Public) | Rec. | Public API base origin for browser `apiFetch` calls | `https://curiousbees.srmist.edu.in` | Rebuild + Restart |
| `NEXT_PUBLIC_SUPABASE_URL` | Build-time (Public) | **Yes** | Supabase project URL for browser & SSR clients | `https://<project-ref>.supabase.co` | Rebuild + Restart |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build-time (Public) | **Yes** | Supabase public anon/publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` alias also supported) | `<SUPABASE_ANON_KEY>` | Rebuild + Restart |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` | Build-time (Public) | Opt | Optional client-side UX hint for allowed login domains | `srmist.edu.in` | Rebuild + Restart |
| `NEXT_PUBLIC_AUTH_MODE` | Build-time (Public) | Opt | Auth UX mode (`GOOGLE_ADMIN_MANAGED`) | `GOOGLE_ADMIN_MANAGED` | Rebuild + Restart |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Build-time (Public) | Opt | Contact email displayed on `/contact` marketing page | `curiousbees@srmist.edu.in` | Rebuild + Restart |
| `API_URL` | Runtime (Server-only) | Rec. | Internal/upstream API URL for Next.js `/api/:path*` rewrite proxy | `http://api.internal:4000` or `https://...` | Restart |
| `APP_URL` | Runtime (Server-only) | Rec. | Server-side canonical URL used by `middleware.ts` & `site-url.ts` | `https://curiousbees.srmist.edu.in` | Restart |
| `ALLOWED_EMAIL_DOMAINS` | Runtime (Server-only) | Rec. | Authoritative server-side middleware domain check | `srmist.edu.in` | Restart |
| `BOOTSTRAP_ADMIN_EMAIL` / `MAIN_ADMIN_EMAIL` | Runtime (Server-only) | Opt | Root admin email bypass in `email-domains.ts` | `itkm-admin@srmist.edu.in` | Restart |
| `NEXT_DIST_DIR` | Build/Dev only | Opt | Custom Next.js build output dir (default: `.next`) | `.next` | Rebuild |
