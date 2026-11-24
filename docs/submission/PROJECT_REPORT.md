# CuriousBees — MCA Final Project Report

---

## 1. Title
**CuriousBees: An Institutional Academic Research Social Network, Doctoral Supervision, and Governance Platform**

* **Submitted by:** `[STUDENT NAME — PLACEHOLDER]` (`[REGISTER NUMBER — PLACEHOLDER]`)
* **Degree:** Master of Computer Applications (MCA)
* **Department / Institution:** `[DEPARTMENT NAME — PLACEHOLDER]`, SRM Institute of Science and Technology
* **Project Guide:** `[GUIDE NAME & DESIGNATION — PLACEHOLDER]`
* **Academic Year:** `[ACADEMIC YEAR — PLACEHOLDER]`

---

## 2. Abstract
Academic research within large university ecosystems relies on continuous communication between research scholars, faculty supervisors, and institutional leadership. Existing workflows are commonly fragmented across ad-hoc emails, manual spreadsheets, and general-purpose messaging tools that lack academic context, supervision accountability, and institutional access governance. **CuriousBees** is a full-stack TypeScript monorepo web application built with Next.js 15, NestJS 11, PostgreSQL, and Prisma ORM to unify three complementary layers: (1) an institution-restricted **Researcher Network** for sharing research updates, publications, discussions, and collaboration requests; (2) an **Academic Workspace** supporting doctoral lifecycle tracking, supervisor matching, progress report reviews, and S3-backed project workspaces; and (3) a strictly isolated **Institutional Governance** console for account provisioning, hierarchy management, content moderation, and audit logging. Static verification, production builds, and 26 unit test suites (23 API, 3 Web) pass cleanly; live database end-to-end execution remains pending active PostgreSQL/Supabase connectivity.

---

## 3. Introduction
Doctoral and postgraduate research requires both informal peer discovery (sharing early findings, papers, and technical questions) and formal institutional tracking (supervisor capacity, milestone reviews, and academic hierarchy). CuriousBees bridges these needs by combining familiar social feed interaction patterns with institutional role-based governance tailored to SRM Institute of Science and Technology (SRMIST).

---

## 4. Problem Statement
1. **Fragmented Research Discovery:** Scholars lack a dedicated institutional feed to discover active research topics, papers, and peers across departments.
2. **Unstructured Supervision Workflows:** Supervisor selection, capacity limits, thesis stage tracking, and progress report feedback often occur over disconnected email threads.
3. **Lack of Controlled Collaboration Channels:** Researchers need a consented transition from public feed discussions to private 1:1 messaging and shared file workspaces.
4. **Governance & Privacy Gaps:** Public social platforms expose institutional activity externally and lack administrative provisioning, domain restrictions, moderation queues, and audit trails.

---

## 5. Existing System
Traditional university research management relies on:
- Static ERP portals focused solely on administrative forms rather than daily scholarly interaction.
- Email and generic chat groups without structured research domains, topic tagging, or milestone tracking.
- Manual document sharing without short-lived, membership-checked storage links.

---

## 6. Proposed System
CuriousBees provides an integrated, invite-only institutional platform comprising:
- **Researcher Network:** Feed (`/feed`) with post types (`Research Update`, `Publication`, `Question`, `Discussion`, `Collaboration Request`, `Achievement`, `Announcement`), nested replies, likes, bookmarks, researcher/domain/topic follows, and peer recommendations.
- **Academic Workspace:** Scholar thesis tracking (`My Research`), supervisor matching & progress review (`Supervision Panel`), `Curious Nexus` collaboration DMs, shared `Workspaces` (S3 files, milestones, Google Meet links), `Publications`, `Opportunities`, and `Events`.
- **Institutional Governance:** Admin-provisioned Google OAuth accounts (`GOOGLE_ADMIN_MANAGED`), campus/faculty/department management, moderation queue, and immutable `AuditLog`.

---

## 7. Project Objectives
1. Implement an authenticated, domain-restricted institutional research platform for SRMIST.
2. Enable scholars and supervisors to publish research updates, papers, and questions with nested discussions and file attachments.
3. Provide end-to-end supervision workflows (request, capacity check, approval, thesis milestones, and progress report reviews).
4. Provide private, membership-checked workspaces for research teams using presigned Amazon S3 URLs.
5. Enforce strict role isolation between research participants (`RESEARCH_SCHOLAR`, `RESEARCH_SUPERVISOR`) and governance administrators (`INSTITUTE_ADMIN`).

---

## 8. Scope
* **In Scope:** Authenticated web portal (`apps/web`), REST API (`apps/api`), PostgreSQL/Prisma schema (54 models, 21 enums), Google OAuth via Supabase, S3 presigned file handling, Brevo email integration, and automated unit/static verification.
* **Out of Scope (Current Delivery):** Live AWS/Supabase production deployment, real-time WebSocket/push notification delivery, in-app reposts/quote-posts, and `@mentions` (documented as planned enhancements).

---

## 9. Functional Requirements
- **FR1 — Authentication & Provisioning:** Google OAuth login gated by allowed email domains and administrator-created user records.
- **FR2 — Onboarding:** Role-specific onboarding for research domains, department assignment, and scholar-to-supervisor requests.
- **FR3 — Research Feed:** Create, edit, delete, like, bookmark, comment/reply, share link, and report research posts.
- **FR4 — Discovery & Social Graph:** Search posts/publications/researchers; follow researchers, domains, and topics.
- **FR5 — Supervision & My Research:** Maintain doctoral stages/milestones; submit and review progress reports.
- **FR6 — Nexus & Workspaces:** Consented collaboration requests, 1:1 messages, shared files, milestones, and meeting links.
- **FR7 — Institutional Governance:** Manage users, campuses/faculties/departments, moderation reports, announcements, event ingestion, and audit logs.

---

## 10. Non-Functional Requirements
- **Security:** Dual-layer route protection (Next.js middleware + NestJS `SupabaseAuthGuard`, `ApprovedGuard`, `RolesGuard`, `ResearchParticipantGuard`), DTO validation (`class-validator`, `Zod`), Helmet headers, and strict non-PII projections on public endpoints.
- **Performance & Reliability:** Per-session and per-IP rate limiting (`@nestjs/throttler`), batched collaboration status queries (`GET /api/collaborations/statuses`), and graceful demo fallback in `PrismaService` if DB is unreachable.
- **Maintainability:** TypeScript strict mode across shared monorepo packages (`@curiousbees/types`, `constants`, `shared-utils`, `ui`).

---

## 11. Feasibility Overview
- **Technical Feasibility:** Built entirely on mature TypeScript ecosystems (Next.js 15, NestJS 11, Prisma 6, PostgreSQL) with verifiable builds and modular separation.
- **Operational Feasibility:** Uses managed cloud primitives (Supabase Auth/Postgres, Amazon S3, Brevo) and containerized multi-stage Docker builds (`Dockerfile.web`, `Dockerfile.api`).
- **Economic Feasibility:** `[INSTITUTIONAL HOSTING BUDGET / APPROVAL — PLACEHOLDER]`.

---

## 12. System Architecture
Decoupled client-server monorepo: Next.js 15 frontend (`:3000`) proxies `/api/*` to the NestJS 11 REST API (`:4000`), which authenticates Bearer tokens via Supabase Auth, queries PostgreSQL via Prisma ORM, signs S3 object URLs, and dispatches transactional emails via Brevo. *(See [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) for detailed Mermaid diagrams.)*

---

## 13. Technology Stack
- **Frontend:** Next.js 15.5, React 19, TypeScript 5.4, Tailwind CSS 3.4, Zustand 4.5, TanStack React Query 5, Framer Motion 11, Lucide React.
- **Backend:** NestJS 11, Prisma 6.19.3, PostgreSQL, Supabase JS v2, AWS SDK v3 (`@aws-sdk/client-s3`, `s3-request-presigner`), Winston, Zod, Swagger.
- **Testing & Tooling:** Jest, Supertest, Node `--test`, ESLint, Docker.

---

## 14. Module Description
Detailed module-by-module specifications (routes, controllers, services, models, permissions, and limitations) are documented in [MODULE_DOCUMENTATION.md](./MODULE_DOCUMENTATION.md).

---

## 15. User Roles
1. **Research Scholar (`RESEARCH_SCHOLAR`):** Participates in feed, discovery, Nexus, workspaces, publications, opportunities, events, and manages `My Research` + progress reports.
2. **Research Supervisor (`RESEARCH_SUPERVISOR`):** Participates in all social/workspace features, creates/edits own events, posts opportunities, approves scholar requests, and reviews scholar progress reports.
3. **Institute Admin (`INSTITUTE_ADMIN`):** Governs `/admin/*` (provisioning, hierarchy, moderation, announcements, analytics, audit logs, system settings) and is blocked from research participation.

---

## 16. Database Design
54 Prisma models and 21 enums covering institutional hierarchy (`Campus`, `Faculty`, `Department`), user profiles, social feed (`Thread`, `Comment`, `ThreadLike`, `SavedThread`, `UserFollow`), collaborations/workspaces (`ResearchCollaboration`, `Workspace*`), supervision (`ScholarSupervisorRequest`, `ResearchProfile`, `Report`), and governance (`ModerationReport`, `AuditLog`). *(See [DATABASE_DOCUMENTATION.md](./DATABASE_DOCUMENTATION.md) for the verified ER diagram.)*

---

## 17. Implementation Overview
Organized as an npm workspace monorepo (`apps/web`, `apps/api`, `packages/*`). Backend controllers enforce `@UseGuards(SupabaseAuthGuard, ApprovedGuard)` with role/participant guards on mutations. Frontend state is coordinated via `useStore.ts` (`Zustand`) and `apiFetch` (`apps/web/src/lib/api-client.ts`).

---

## 18. Security and Access Control
- **Authentication:** `SupabaseAuthGuard` verifies JWTs and checks `ALLOWED_EMAIL_DOMAINS` + pre-provisioned active DB status.
- **Authorization:** `ResearchParticipantGuard` prevents `INSTITUTE_ADMIN` from participating in research; `RolesGuard` restricts admin and event/supervision endpoints.
- **Privacy Hardening (Phases 1A & 1B):** `PUBLIC_AUTHOR_SELECT` omits `email`, `employeeId`, and auth IDs from feeds, comments, publications, and non-owner profiles; `hidden: false` is enforced across secondary endpoints.

---

## 19. Testing and Verification
- **Executed & Passing:** `npm run build:api`, `npm run build:web`, `npm run typecheck`, `npm run lint`, `prisma validate`, API Jest unit tests (**23 suites, 227 passed, 2 skipped**), and Web unit tests (**3/3 passed**).
- **Not Executed (Blocked):** E2E database integration tests (`test:e2e`) could not run due to the absence of local Docker/PostgreSQL and an unreachable `.env` Supabase host. *(See [TESTING_AND_VERIFICATION.md](./TESTING_AND_VERIFICATION.md).)*

---

## 20. Results
The complete CuriousBees monorepo compiles cleanly for production (`apps/web` + `apps/api`), passes all 26 unit test suites and static checks, enforces verified role and privacy boundaries, and eliminates simulated mock notifications and per-card collaboration-status waterfalls.

---

## 21. Limitations
- Live PostgreSQL/Supabase connectivity is currently unavailable in the local `.env`.
- Browser push notifications are disabled (no push provider configured).
- Feed personalization (`For you` / `Following`) runs client-side over the latest fetched page; reposts/quote-posts and `@mentions` are deferred. *(See [LIMITATIONS_AND_FUTURE_SCOPE.md](./LIMITATIONS_AND_FUTURE_SCOPE.md).)*

---

## 22. Future Enhancements
Server-side `For you`/`Following` ranking with keyset pagination, in-app reposts & quote-posts, `@mentions` with autocomplete, live visibility-aware polling, and consolidation of legacy redirect routes.

---

## 23. Conclusion
CuriousBees demonstrates a secure, modular architecture for institutional academic collaboration at SRMIST, uniting social research discovery with doctoral supervision and administrative governance while maintaining strict separation of concerns and verifiable code quality.

---

## 24. References
1. Next.js 15 Documentation — https://nextjs.org/docs
2. NestJS 11 Documentation — https://docs.nestjs.com
3. Prisma ORM Documentation — https://www.prisma.io/docs
4. Supabase Auth & PostgreSQL Documentation — https://supabase.com/docs
5. AWS SDK for JavaScript v3 (S3 Presigner) — https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/
