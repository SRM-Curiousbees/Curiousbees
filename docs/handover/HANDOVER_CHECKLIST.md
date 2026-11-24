# CuriousBees — SRM ITKM Formal Handover & Acceptance Checklist

**Related:** [README.md](./README.md) | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | [SECURITY_AND_ACCESS_CONTROL.md](./SECURITY_AND_ACCESS_CONTROL.md)

Use this checklist for formal institutional acceptance and sign-off between the delivery team and **SRM Institute of Science and Technology (ITKM)**.

---

## 1. Handover Verification Checklist

| Category | Deliverable / Verification Item | Responsible Person | Status | Remarks |
| :--- | :--- | :--- | :---: | :--- |
| **Source Code Handover** | Complete monorepo (`apps/web`, `apps/api`, `packages/*`, `infra/aws/`, `scripts/`) reviewed and committed to SRM-owned Git repository | Delivery Lead / SRM Dev | Pending | Phase 1A/1B local changes to be committed |
| **Repository Access** | Admin/Owner access granted to SRM ITKM Git organization; original developer access downgraded/revoked post-handover | SRM ITKM Lead | Pending | |
| **Documentation** | All 15 documents in `docs/handover/` reviewed and accepted | SRM ITKM & Delivery Lead | In Review | Created in `docs/handover/` |
| **Infrastructure Ownership** | Hosting environment (AWS ECS Fargate / SRM VM / PaaS) provisioned under SRM-owned cloud account | SRM ITKM Infra | Pending | See `deployment-proposal/` |
| **Domain & DNS** | Institutional domain (`curiousbees.srmist.edu.in` or approved domain), TLS certificates, and reverse proxy routing configured | SRM Network / DNS Team | Pending | |
| **Supabase Ownership** | Staging & Production Supabase projects (`ap-south-1`) created under SRM organization; Google OAuth configured | SRM ITKM Infra | Pending | |
| **AWS Ownership** | Production S3 bucket (`ap-south-1`) with Block Public Access, CORS, SSE-S3, and least-privilege IAM roles provisioned | SRM Cloud Admin | Pending | Reference policies in `infra/aws/` |
| **Email Service Ownership** | SRM Brevo account created, institutional sending domain SPF/DKIM verified, API key generated | SRM ITKM / Comms | Pending | |
| **Environment Configuration** | All required API & Web environment variables populated in secret manager (no secrets in Git) | SRM DevOps | Pending | See `ENVIRONMENT_CONFIGURATION.md` |
| **Database Backup & Restore** | `prisma migrate deploy` executed; automated backups/PITR enabled; initial restore drill verified | SRM DBA / ITKM | Pending | See `DATABASE_AND_BACKUP_GUIDE.md` |
| **Security Review** | `ENABLE_SWAGGER=false`, `ALLOWED_EMAIL_DOMAINS` locked, `ThreadsPublicController` policy approved | SRM InfoSec / ITKM | Pending | See `SECURITY_AND_ACCESS_CONTROL.md` |
| **Deployment Verification** | `/healthz` and `/api/health/ready` return `200 OK`; E2E & k6 smoke/load tests passed on Staging | SRM QA / DevOps | Pending | See `PERFORMANCE_VALIDATION_PLAN.md` |
| **User Acceptance Testing (UAT)** | Scholar, Supervisor, and Institute Admin workflows tested end-to-end by SRM stakeholders | SRM Academic Stakeholders | Pending | |
| **Administrator Training** | Institute Admins trained on `/admin/*` (user provisioning, hierarchy, moderation, event inbox, audit) | Delivery Lead | Pending | |
| **Developer Knowledge Transfer** | Walkthrough of codebase, Prisma migrations, CI/CD, and local setup completed with SRM devs | Delivery Lead | Pending | |
| **Support Ownership** | L1/L2/L3 escalation contacts, maintenance windows, and SLA/RPO/RTO targets formally approved | SRM ITKM Management | Pending | |

---

## 2. Formal Sign-Off

| Role | Name | Signature | Date |
| :--- | :--- | :--- | :--- |
| **SRM ITKM Representative** | | | |
| **SRM Academic / Product Owner** | | | |
| **Delivery / Engineering Lead** | | | |
