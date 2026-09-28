# CuriousBees V2 — Disaster Recovery & Business Continuity Plan

## 1. Objectives

* **Recovery Point Objective (RPO):** `< 1 hour` (Maximum acceptable data loss in disaster scenario).
* **Recovery Time Objective (RTO):** `< 2 hours` (Maximum acceptable downtime until platform is restored).

---

## 2. Backup & Retention Strategy

### 2.1 RDS PostgreSQL
* **Automated Daily Backups:** Retained for 30 days.
* **Continuous Point-in-Time Recovery (PITR):** 5-minute transaction log archiving enabled.
* **Cross-Region Replication:** Automated weekly snapshot copy to a secondary AWS region (`ap-southeast-1`).

### 2.2 AWS S3 Research Documents
* **S3 Versioning:** Enabled to guard against accidental deletion or overwrite.
* **Cross-Region Replication (CRR):** S3 bucket replication to secondary region for high-value research papers.
* **Lifecycle Policy:** Non-current object versions transitioned to S3 Glacier after 90 days.

---

## 3. Disaster Scenarios & Recovery Runbooks

### Scenario A: Target Instance Failure (Single Node Crash)
* **Detection:** ALB health check to `/health/ready` fails for 3 consecutive checks.
* **Automated Action:** ALB stops routing traffic to the failed instance; Auto Scaling Group terminates unhealthy node and launches a fresh replacement.
* **Operator Action:** None required (self-healing). Inspect CloudWatch logs for the failed instance ID.

### Scenario B: Database Primary Instance Failure
* **Detection:** AWS RDS Multi-AZ health check triggers failover.
* **Automated Action:** RDS automatically promotes standby replica in AZ2 to primary; DNS CNAME automatically updates within 60-120 seconds.
* **Application Behavior:** NestJS `/health/ready` temporarily returns 503 during failover, then reconnects automatically without requiring container restarts.

### Scenario C: Corrupted Database or Catastrophic Table Drop
* **Operator Runbook:**
  1. Access AWS RDS Management Console.
  2. Select the database instance `srm_curiousbees_prod`.
  3. Click **Actions** -> **Restore to point in time**.
  4. Select a timestamp 5 minutes prior to the corruption incident.
  5. Launch restored instance into the private database subnet.
  6. Update database connection string in AWS Secrets Manager and initiate rolling restart.
