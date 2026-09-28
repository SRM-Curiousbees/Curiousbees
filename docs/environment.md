# CuriousBees V2 — Environment & Secrets Strategy

## 1. Secrets Management Principles
* **Never commit secrets:** Passwords, API keys, and database connection strings must never appear in Git.
* **Separation of Concerns:** Public frontend variables are prefixed with `NEXT_PUBLIC_` and contain no secrets.
* **Production Secret Sourcing:** On AWS, secrets must be fetched at runtime or deployment time from **AWS Secrets Manager** or **AWS Systems Manager Parameter Store**.

---

## 2. Environment Matrix

### 2.1 Backend Secrets (NestJS Only)
| Variable | Description | Production Source |
| :--- | :--- | :--- |
| `DATABASE_URL` | RDS PostgreSQL connection string with pool settings | AWS Secrets Manager |
| `DIRECT_URL` | Direct RDS connection string (for migrations) | AWS Secrets Manager |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin secret key for JWT verification | AWS Secrets Manager |
| `BREVO_API_KEY` | Brevo email delivery API key | AWS Secrets Manager |
| `AWS_S3_BUCKET` | Name of the private S3 bucket | Parameter Store |
| `AWS_REGION` | AWS Region (e.g. `ap-south-1`) | Parameter Store |
| `ENABLE_CRON` | Flag to enable cron on worker nodes (`true`/`false`) | Environment config |
| `ADMIN_EMAILS` | Comma-separated admin whitelist | Parameter Store |

### 2.2 Frontend Public Variables (Next.js)
| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL of the API gateway / ALB origin (e.g. `https://curiousbees.srmist.edu.in`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon client key |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` | Allowed institutional email domains (e.g. `srmist.edu.in`) |
| `NEXT_PUBLIC_AUTH_MODE` | Auth mode (`GOOGLE_ADMIN_MANAGED`) |

---

## 3. Template Reference
See [.env.example](file:///Users/maddy/Current%20Project/CuriousBees/.env.example) for the full configuration template with sanitized placeholder values.
