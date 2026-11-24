# CuriousBees — Cloud Pricing Sources & Assumptions

**Pricing Verification Date:** 2026-11-25  
**Exchange Rate Used:** **1 USD = ₹92.92 INR** (Market reference for Nov 24, 2026; subject to RBI/bank FX rates at billing).  
**Disclaimer:** All figures are **indicative estimates** derived from public provider list pricing and usage assumptions. They do **not** constitute an official AWS, Supabase, or Brevo quotation.

---

## 1. Official Provider List Pricing (`ap-south-1` Mumbai Preferred)

| Provider | Service / SKU | Region | Official List Rate (USD) | Source URL | Date Checked |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AWS** | Fargate vCPU (Linux x86) | `ap-south-1` (Mumbai) | ~$0.04256 / vCPU-hr (~$31.07/mo @ 730h) | https://aws.amazon.com/fargate/pricing/ | 2026-11-25 |
| **AWS** | Fargate Memory (Linux x86) | `ap-south-1` (Mumbai) | ~$0.004655 / GB-hr (~$3.40/mo @ 730h) | https://aws.amazon.com/fargate/pricing/ | 2026-11-25 |
| **AWS** | Application Load Balancer | `ap-south-1` (Mumbai) | ~$0.024 / hr (~$17.52/mo) + ~$0.008 / LCU-hr | https://aws.amazon.com/elasticloadbalancing/pricing/ | 2026-11-25 |
| **AWS** | S3 Standard Storage | `ap-south-1` (Mumbai) | ~$0.025 / GB-mo (first 50 TB) | https://aws.amazon.com/s3/pricing/ | 2026-11-25 |
| **AWS** | CloudFront Egress | India / APAC Edge | ~$0.09–$0.11 / GB after 100 GB free tier (modeled @ $0.10/GB) | https://aws.amazon.com/cloudfront/pricing/ | 2026-11-25 |
| **AWS** | ElastiCache (Valkey/Redis) | `ap-south-1` (Mumbai) | Indicative: ~$25/mo (`t4g.small`), ~$180/mo (`m6g.large` Multi-AZ) | https://aws.amazon.com/elasticache/pricing/ | 2026-11-25 |
| **Supabase** | Pro Plan Base | `ap-south-1` (Mumbai) | $25/mo (includes $10 compute credit, 100k MAU, 8 GB DB, 250 GB egress) | https://supabase.com/pricing | 2026-11-25 |
| **Supabase** | Compute Add-ons | `ap-south-1` (Mumbai) | Micro $10 ($0 net), Small $15 (+$5 net), Large $110 (+$100 net), XL $210 (+$200 net) | https://supabase.com/pricing | 2026-11-25 |
| **Supabase** | PITR Add-on (7-day) | `ap-south-1` (Mumbai) | $100 / mo | https://supabase.com/pricing | 2026-11-25 |
| **Brevo** | Email Plans | Global SaaS | Free ($0, 300/day); Starter: $17/mo (10k), $46/mo (40k); Standard: $18–$69+/mo | https://www.brevo.com/pricing/ | 2026-11-25 |

---

## 2. Classification of Estimates
1. **Official List Pricing:** AWS Fargate, ALB, S3, CloudFront base rates, Supabase Pro & Compute add-ons, Brevo Starter/Standard tiers.
2. **Usage-Based Estimates (Indicative):** ALB LCU hours, CloudFront egress GB, CloudWatch log ingestion GB, ElastiCache node sizing, and Brevo tier volume.
3. **Contingency (15%):** Explicitly separated to absorb traffic spikes, S3/egress growth, and FX variance.
4. **Taxes (18% GST):** Applied to `(Cloud Subtotal + Contingency)`. Actual Indian GST treatment on AWS India (`AISPL`) vs. international USD SaaS (`Supabase`/`Brevo` reverse charge) should be confirmed by SRM finance.
5. **Institutional Discounts (Not Applied):** AWS EdStart / Education / 1-year Compute Savings Plans (~20–30% compute savings) are **excluded** from baseline estimates and represent potential upside upon formal AWS negotiation.
6. **One-Time Setup & Optional Support:** Priced separately in INR (`₹1.25L / ₹2.25L / ₹3.50L` setup; `₹25k / ₹45k / ₹75k` monthly support) and never mixed into cloud vendor bills.
