# CuriousBees V2 — AWS Production Infrastructure Specification

## 1. AWS Architecture Overview

The CuriousBees production environment is provisioned across multiple availability zones in the **ap-south-1 (Mumbai)** region.

```
+-----------------------------------------------------------------------------------+
| AWS Cloud (Region: ap-south-1)                                                   |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | VPC (10.0.0.0/16)                                                           |  |
|  |                                                                             |  |
|  |  +-----------------------------------+   +-------------------------------+  |  |
|  |  | Public Subnets (AZ1, AZ2, AZ3)    |   | Private App Subnets (AZ1, AZ2)|  |  |
|  |  |                                   |   |                               |  |  |
|  |  |  [AWS Application Load Balancer]  |   |  [EC2 Auto Scaling Group]     |  |  |
|  |  |  ├── tg-curiousbees-api (:4000)  |-->|  - NestJS API instances       |  |  |
|  |  |  └── tg-curiousbees-web (:3000)  |-->|  - Next.js Web instances      |  |  |
|  |  +-----------------------------------+   +-------------------------------+  |  |
|  |                                                         |                   |  |
|  |                                                         v                   |  |
|  |                                          +-------------------------------+  |  |
|  |                                          | Private Data Subnets (AZ1,AZ2)|  |  |
|  |                                          |  [AWS RDS PostgreSQL Multi-AZ]|  |  |
|  |                                          +-------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  [AWS S3 Private Bucket] (Encrypted, Direct Presigned PUT/GET)                   |
|  [AWS CloudWatch] (Logs & Metric Alarms)                                          |
|  [AWS WAF] (Rate limits, SQLi, XSS attached to ALB)                               |
+-----------------------------------------------------------------------------------+
```

---

## 2. Infrastructure Components

### 2.1 AWS Application Load Balancer (ALB)
* **Scheme:** Internet-facing.
* **Subnets:** Distributed across minimum 2 Public Subnets.
* **Security Group:** Inbound 80 (HTTP) and 443 (HTTPS) from 0.0.0.0/0 (or Cloudflare IP ranges).
* **Target Groups:**
  - `tg-curiousbees-api`: Port 4000, Health check `/health/ready`.
  - `tg-curiousbees-web`: Port 3000, Health check `/`.

### 2.2 EC2 Auto Scaling / ECS Task Definition
* **Compute:** `t4g.xlarge` or `c6g.xlarge` instances running Amazon Linux 2023 with Docker.
* **Scaling Policies:**
  - Scale out when Average CPU > 70% or ALB Request Count > 1,500 req/target.
  - Scale in when Average CPU < 35%.

### 2.3 RDS PostgreSQL
* **Engine:** PostgreSQL 15.x Multi-AZ.
* **Instance Class:** `db.m6g.xlarge` (4 vCPU, 16 GB RAM) recommended for target peak concurrency.
* **Storage:** General Purpose SSD (gp3) with 100 GB allocated and auto-scaling enabled up to 500 GB.
* **Max Connections:** 500 (with connection pooling configured at 25 per application container).

### 2.4 AWS S3 Bucket
* **Bucket Policy:** Private (Block all public access = ON).
* **Encryption:** Server-side encryption with AWS KMS or AES-256.
* **CORS Policy:** Allowed origins: `https://curiousbees.srmist.edu.in`, Allowed methods: `GET, PUT`, Allowed headers: `*`.

### 2.5 AWS CloudWatch & Alarms
* **Log Groups:** `/aws/curiousbees/api` and `/aws/curiousbees/web`.
* **Metric Alarms:**
  - ALB 5xx Rate > 0.5% for 3 consecutive 1-minute periods.
  - RDS CPU Utilization > 80% for 5 minutes.
  - RDS Free Storage Space < 15 GB.
  - Target Response Time p95 > 1,000ms.
