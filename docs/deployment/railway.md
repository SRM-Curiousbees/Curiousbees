# Railway Production Deployment Guide

This document describes how to prepare and deploy the CuriousBees NestJS backend (`apps/api`) to Railway.

## Environment Variables

Configure the following environment variables in your Railway service settings:

### Required Variables
These variables must be set for the application to boot successfully:

* `DATABASE_URL`: Connection string for the Supabase PostgreSQL database (with connection pooling enabled).
* `DIRECT_URL`: Direct connection string to Supabase PostgreSQL (used by Prisma for migrations).
* `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL.
* `SUPABASE_SERVICE_ROLE_KEY`: Service role API key for Supabase, used for backend service actions.
* `FRONTEND_URL`: Absolute URL of the frontend application (e.g. `https://curiousbees.vercel.app`).
* `ALLOWED_ORIGINS`: Comma-separated list of origins permitted to cross-origin resource share (e.g., `https://curiousbees.vercel.app,https://www.curiousbees.vercel.app`).
* `AUTH_MODE`: Set to `GOOGLE_ADMIN_MANAGED`.

### Optional Variables
These variables enable additional integrations:

* `BREVO_API_KEY`: API key for Brevo transactional email notifications.
* `MAIN_ADMIN_EMAIL`: Root administrative email (e.g. `admin@srmist.edu.in`).
* `MAIL_FROM_EMAIL`: Verified sender email address in Brevo.
* `MAIL_FROM_NAME`: Sender display name (e.g. `CuriousBees`).

---

## Build Settings

Specify the following settings in your Railway service:

### Build Command
Run these commands from the repository root:
```bash
npm install
npm run build
```

*(This compiles the monorepo workspace dependencies, generates the Prisma client, and builds the NestJS application into the `dist` directory).*

### Start Command
Run this command to launch the production server:
```bash
node apps/api/dist/main
```

---

## Service Monitoring

### Health Check URL
Configure Railway to check the application health using this path:
```http
/api/health
```

A healthy application responds with `200 OK` and the following payload structure:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-06-07T12:00:00.000Z",
  "environment": "production"
}
```
If the database connection is offline, the endpoint will report `"database": "disconnected"` and `"status": "unhealthy"`.
