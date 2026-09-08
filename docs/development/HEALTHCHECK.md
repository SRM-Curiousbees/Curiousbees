# CuriousBees V2 — Health Checks & Diagnostics Specification

This document details the production-ready application health endpoints, telemetry diagnostics, and system version APIs implemented inside the CuriousBees V2 API service.

---

## 🧭 Endpoints Overview

| Route | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | Public | Standard readiness/liveness probe checking Postgres database and Redis connection state. |
| `/api/system` | `GET` | Public | System-level health reporting operating system metrics, node runtime telemetry, and physical memory footprint. |
| `/api/version` | `GET` | Public | Quick diagnostic checking active application versions, node versions, and hosting environments. |

---

## 1. Health Endpoint (`/api/health`)

Checks if backend microservices (Postgres & Redis) are responsive and returning pings.

### Response Payload (Healthy)

```json
{
  "status": "healthy",
  "database": "healthy",
  "redis": "healthy",
  "uptime": "12.45s",
  "memory": "94.25 MB",
  "environment": "development"
}
```

### Response Payload (Degraded / Unhealthy)

If either service experiences timeout or connectivity failure:

```json
{
  "status": "unhealthy",
  "database": "unhealthy",
  "redis": "healthy",
  "uptime": "12.45s",
  "memory": "94.25 MB",
  "environment": "development"
}
```

---

## 2. System Endpoint (`/api/system`)

Collects host machine resources and running processes details.

### Response Payload

```json
{
  "status": "ok",
  "os": {
    "platform": "darwin",
    "release": "23.5.0",
    "arch": "arm64",
    "uptime": 234892,
    "loadavg": [2.32, 1.85, 1.54],
    "cpus": 8
  },
  "process": {
    "uptime": 124.602,
    "memoryUsage": {
      "rss": "85.24 MB",
      "heapTotal": "45.12 MB",
      "heapUsed": "32.89 MB",
      "external": "2.41 MB"
    },
    "pid": 84920
  },
  "timestamp": "2026-06-05T08:39:30.452Z"
}
```

---

## 3. Version Endpoint (`/api/version`)

Exposes code tags and Node compilation target info.

### Response Payload

```json
{
  "version": "1.0.0",
  "environment": "production",
  "nodeVersion": "v22.14.0",
  "timestamp": "2026-06-05T08:39:35.912Z"
}
```

---

## 🛠️ Automated Health Check Tooling

You can query this information locally or via scripting using the cross-platform Node client tool:

```bash
npm run health
```

This runs the script [`scripts/health-check.js`](../../scripts/health-check.js), checking that status codes return `200` and formatting console telemetry output.
