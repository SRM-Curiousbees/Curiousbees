# CuriousBees V2 — Load Testing & Capacity Guide

## 1. Load Testing Overview

> **CRITICAL RULE:** Do NOT run load tests against production. Execute tests exclusively against the staging environment.
> Target concurrency claims must be evidenced by measured test reports.

### Concurrency Stages
| Stage | Concurrency (VUs) | Target Duration | Objective |
| :---: | :---: | :---: | :--- |
| **Stage 1** | 500 users | 5 minutes | Baseline performance verification |
| **Stage 2** | 1,000 users | 7 minutes | Standard institutional peak |
| **Stage 3** | 2,500 users | 9 minutes | High-activity research conference / admission period |
| **Stage 4** | 5,000 users | 10 minutes | Target peak concurrency validation |
| **Stage 5** | 7,500 users | 2 minutes | Stress & graceful degradation analysis |

---

## 2. Key Performance Indicators (KPIs)

* **API p95 Latency:** `< 500 ms` for normal API read operations.
* **API p99 Latency:** `< 1,500 ms` under peak load.
* **API 5xx Error Rate:** `< 0.5%`.
* **API 4xx Error Rate:** `< 5.0%`.
* **Node.js CPU Utilization:** `< 70%` sustained.
* **Node.js Memory Utilization:** `< 75%` sustained.
* **RDS PostgreSQL CPU:** `< 70%` sustained.
* **RDS Connection Utilization:** `< 70%` of max connection pool capacity.

---

## 3. Executing Load Tests

### 3.1 Prerequisite
Install Grafana k6:
```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6
```

### 3.2 Running the Load Test Suite
```bash
# Test against staging API:
./scripts/testing/run-load-test.sh https://api-staging.curiousbees.srmist.edu.in "Bearer STAGING_AUTH_TOKEN"

# Or directly with k6:
TARGET_URL="https://api-staging.curiousbees.srmist.edu.in" AUTH_TOKEN="Bearer ..." k6 run scripts/testing/load-test.js
```

### 3.3 What the Test Simulates
1. ALB `/health/ready` probe pings.
2. Feed pagination (`/api/threads?limit=20&sort=latest`).
3. Academic multi-entity search (`/api/feed/search?q=...`).
4. Supervisor & Scholar discovery (`/api/users/supervisors`).
5. Publications browsing (`/api/publications?limit=20`).
6. Direct S3 presigned upload URL requests (`/api/files/presigned-upload`).
