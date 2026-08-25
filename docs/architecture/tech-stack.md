# CuriousBees Tech Stack Reference

This document maps all technologies, libraries, services, and protocols powering **CuriousBees V2**.

---

## 1. Architecture Topology Diagram

```mermaid
graph TD
    %% Frontend Subgraph
    subgraph Frontend [Frontend Application (apps/web)]
        Next[Next.js 15 App Router]
        React[React 19 + TypeScript]
        Tailwind[Tailwind CSS 3.4]
        Zustand[Zustand State Store]
        Query[TanStack React Query]
        ThreeJS[React Three Fiber / Three.js]
        Next --> React
        React --> Tailwind
        React --> Zustand
        React --> Query
        React --> ThreeJS
    end

    %% Backend Subgraph
    subgraph Backend [Backend API (apps/api)]
        Nest[NestJS 11 Gateway]
        Prisma[Prisma ORM 6.19]
        AuthGuard[SupabaseAuthGuard]
        Schedule[@nestjs/schedule Cron]
        MailService[Brevo MailService]
        IntegrationsService[Google & Zoom Integrations]
        Nest --> Prisma
        Nest --> AuthGuard
        Nest --> Schedule
        Nest --> MailService
        Nest --> IntegrationsService
    end

    %% Infrastructure Subgraph
    subgraph Infrastructure [Infrastructure, Data & Cloud Services]
        Postgres[(PostgreSQL Database)]
        PgBouncer[(PgBouncer Connection Pool)]
        S3Bucket[(Amazon S3 Object Storage)]
        CloudFront[AWS CloudFront CDN]
        SupabaseAuth[Supabase Auth / Google OAuth]
        BrevoAPI[Brevo REST API]
        GoogleZoom[Google Workspace & Zoom APIs]
        Vercel[Vercel / Node Container]
        Railway[Railway / VPS Compute]
    end

    %% Connections
    Frontend -- HTTP/REST (Port 4000) --> Backend
    Frontend -- OAuth Flow --> SupabaseAuth
    Backend -- Validates Bearer JWT --> SupabaseAuth
    Backend -- HTTPS POST --> BrevoAPI
    Backend -- OAuth / Links --> GoogleZoom
    Prisma -- TCP (Port 6543) --> PgBouncer --> Postgres
    Frontend -- Uploads / Downloads --> CloudFront --> S3Bucket
    Vercel -. Hosts .-> Frontend
    Railway -. Hosts .-> Backend

    %% Styling
    classDef frontend fill:#000,stroke:#fff,stroke-width:2px,color:#fff;
    classDef backend fill:#E0234E,stroke:#fff,stroke-width:2px,color:#fff;
    classDef data fill:#336791,stroke:#fff,stroke-width:2px,color:#fff;
    classDef cloud fill:#FFCA28,stroke:#fff,stroke-width:2px,color:#000;

    class Next,React,Tailwind,Zustand,Query,ThreeJS frontend;
    class Nest,Prisma,AuthGuard,Schedule,MailService,IntegrationsService backend;
    class Postgres,PgBouncer,S3Bucket data;
    class SupabaseAuth,BrevoAPI,GoogleZoom,CloudFront,Vercel,Railway cloud;
```

---

## 2. Technology Stack Breakdown

| Layer | Technology | Version | Purpose in CuriousBees |
|---|---|---|---|
| **Frontend Framework** | **Next.js** | `^15.3.0` | React server/client hybrid rendering, dynamic routing, edge middleware |
| **UI Library** | **React** | `^19.0.0-rc.0` | Core user interface components, hooks, concurrent rendering |
| **Styling System** | **Tailwind CSS** | `^3.4.3` | Utility-first CSS styling, dark/light theme switching |
| **State Management** | **Zustand** | `^4.5.2` | Global application store, session cache, role overrides |
| **Data Fetching** | **TanStack Query** | `^5.100.14` | Server-state synchronization, optimistic cache updates |
| **3D Rendering** | **Three.js / Drei** | `^0.184.0` | Interactive 3D hero models and animations |
| **Data Tables & Visuals** | **TanStack Table & Recharts** | `^8.21.3 / ^3.8.1` | Governance analytics tables and statistical charts |
| **Backend Framework** | **NestJS** | `^11.1.24` | Modular enterprise REST API, dependency injection, middleware |
| **Database ORM** | **Prisma ORM** | `^6.19.3` | Type-safe PostgreSQL client, schema migrations, query builder |
| **Relational Database** | **PostgreSQL** | `15+` | Primary persistent application database (36 models) |
| **Connection Pooler** | **PgBouncer** | Latest | Transaction-level connection pooling for PostgreSQL |
| **Object Storage** | **Amazon S3** | Standard Tier | Research PDFs, thesis papers, workspace files, attachments |
| **Content Delivery** | **AWS CloudFront** | Latest | Global edge CDN, asset caching, 1 TB free egress shielding |
| **Authentication** | **Supabase Auth** | `^2.112.3` | Google Workspace OAuth, JWT token issuance, institutional domain validation |
| **Email Gateway** | **Brevo REST API** | v3 SMTP API | Direct transactional emails for supervision alerts and approvals |
| **Meetings & Conferencing**| **Google Meet & Zoom** | REST Integrations | Direct meeting link generation and Google Chat Spaces |
| **Task Scheduling** | **@nestjs/schedule** | `^5.0.1` | Automated cron jobs (daily 8:00 AM event digest dispatch) |
| **Language & Tooling** | **TypeScript / Node.js** | `^5.4.5 / >= 22` | Strict typing across packages and applications |
