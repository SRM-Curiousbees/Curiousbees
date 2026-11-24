# CuriousBees — Executive Deployment & Budget Proposal: Speaker Notes

**Deck:** `CuriousBees_SRM_Deployment_and_Budget_Proposal.pptx` (20 Slides)

---

* **Slide 1 (Cover):** *"Good morning. Today we present the cloud deployment architecture, capacity assessment, and three-tier budget proposal for rolling out CuriousBees across SRMIST."*
* **Slide 2 (Executive Summary):** *"We evaluate three capacity tiers—Base (₹18,031/mo), Growth (₹74,458/mo), and Institutional (₹1,92,039/mo), all inclusive of 15% contingency and 18% GST. Importantly, our 500 / 2,500 / 5,000 concurrent user numbers are target capacities that must be validated by k6 load testing on staging."*
* **Slide 3 (Platform Overview):** *"CuriousBees integrates a Researcher Network, Academic Workspace, and isolated Institutional Governance."*
* **Slide 4 (Repository Architecture):** *"This table summarizes what is verified in the actual repository: Next.js 15, NestJS 11, 54 Prisma models, Supabase Auth, AWS S3, and Brevo."*
* **Slide 5 (Technical Capacity Assessment):** *"Before sizing hardware, we audited actual bottlenecks: client-side feed filtering, in-memory rate limiting that requires Valkey for multi-instance scaling, per-request JWT verification, and unresolved live DB connectivity."*
* **Slide 6 (Registered vs. Concurrent Users):** *"Registered headcount does not equal infrastructure cost—concurrent active sessions and RPS drive compute, connection pooling, and caching."*
* **Slide 7 (Workload Model):** *"We model Normal, Peak (3×), and Burst (9×) RPS assuming 20% of concurrent users actively request at once and an 85:15 read/write ratio."*
* **Slide 8 (Recommended Architecture):** *"We recommend Option A—Supabase Auth & PostgreSQL in Mumbai (`ap-south-1`) paired with AWS ECS Fargate, ALB, S3, and CloudFront—because it preserves 100% of verified application code."*
* **Slide 9 (Base Plan):** *"Base supports 1,500 registered / 500 target concurrent users at ₹18,031/mo total cloud spend, plus ₹1,25,000 one-time setup."*
* **Slide 10 (Growth Plan):** *"Growth supports 5,000 registered / 2,500 target concurrent users at ₹74,458/mo, adding ElastiCache Valkey for multi-task throttling and 7-day PITR backups."*
* **Slide 11 (Institutional Plan):** *"Institutional scales to 10,000 registered / 5,000 target concurrent users at ₹1,92,039/mo with a Supabase XL Read Replica and Multi-AZ Valkey."*
* **Slide 12 (Infrastructure Comparison):** *"Side-by-side view of compute, database, caching, and storage scaling across tiers."*
* **Slide 13 (Monthly & Annual Budget):** *"All figures match `THREE_TIER_BUDGET.xlsx` at 1 USD = ₹92.92. Note that Growth achieves the lowest cloud cost per concurrent user (₹29.78/mo)."*
* **Slide 14 (One-Time Setup & Maintenance):** *"One-time setup and optional monthly DevOps support are itemized separately from vendor cloud bills."*
* **Slide 15 (Security, Backup & DR):** *"Covers TLS, S3 private access, Secrets Manager, PITR, and indicative availability targets (`99.5%` / `99.9%` / `99.95%`)."*
* **Slide 16 (Performance Validation):** *"Using the existing `curiousbees.k6.js` harness, we propose strict p95/p99 latency and `<0.5%` error gates before signing off on any tier."*
* **Slide 17 (Implementation Roadmap):** *"Six phases separating cloud provisioning (4–6 weeks total) from SRM policy approvals."*
* **Slide 18 (Risks, Assumptions & Exclusions):** *"Transparent disclosure of workload assumptions, FX variance, and out-of-scope items."*
* **Slide 19 (Recommended Plan for SRM):** *"We recommend launching the pilot on Base (₹18,031/mo) and promoting to Growth (₹74,458/mo) for campus-wide rollout."*
* **Slide 20 (Institutional Decision & Next Steps):** *"Four concrete approvals needed from ITKM and management to begin staging."*
