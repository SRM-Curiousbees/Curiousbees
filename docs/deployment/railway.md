# Railway Production Deployment Guide

This document describes how to prepare and deploy the CuriousBees NestJS backend (`apps/api`) to Railway.

## Environment Variables

Configure the following environment variables in your Railway service settings:

### Required Variables
These variables must be set for the application to boot successfully:

* `DATABASE_URL`: Connection string for the AWS Managed PostgreSQL database (RDS / Aurora).
* `FRONTEND_URL`: Absolute URL of the frontend application (e.g. `https://srmcuriousbees.in` or Vercel URL).
* `ALLOWED_ORIGINS`: Comma-separated list of origins permitted to cross-origin resource share.
* `SUPABASE_URL`: Supabase Project URL (retained ONLY for Google OAuth / session token verification).
* `SUPABASE_SERVICE_ROLE_KEY`: Service role API key for Supabase, used solely for backend auth token verification.
* `AWS_REGION`: AWS Region for S3 and OpenSearch (e.g. `ap-south-1`).
* `AWS_S3_BUCKET`: AWS S3 bucket name for application object storage.
* `BREVO_API_KEY`: API key for Brevo transactional email delivery.
* `MAIL_FROM_EMAIL` (or `BREVO_SENDER_EMAIL`): Verified sender email address in Brevo.
* `MAIL_FROM_NAME` (or `BREVO_SENDER_NAME`): Sender display name (e.g. `CuriousBees`).

### Optional Variables
These variables enable cloud search and external integrations:

* `AWS_ACCESS_KEY_ID`: AWS IAM access key (if not using IAM role credential chain).
* `AWS_SECRET_ACCESS_KEY`: AWS IAM secret key (if not using IAM role credential chain).
* `OPENSEARCH_ENDPOINT`: AWS OpenSearch domain endpoint (e.g. `https://search-xxx.ap-south-1.es.amazonaws.com`).
* `OPENSEARCH_REGION`: AWS Region for OpenSearch.
* `OPENSEARCH_INDEX`: AWS OpenSearch search index name (defaults to `curiousbees`).
* `GOOGLE_CLIENT_ID`: Google OAuth client ID for Google Workspace integrations.
* `GOOGLE_CLIENT_SECRET`: Google OAuth client secret.
* `ZOOM_CLIENT_ID`: Zoom Workplace client ID for meeting scheduling.
* `ZOOM_CLIENT_SECRET`: Zoom Workplace client secret.
* `MAIN_ADMIN_EMAIL`: Root administrative alerts email (`srmcuriousbees@gmail.com`).

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
