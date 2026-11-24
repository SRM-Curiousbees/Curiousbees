# CuriousBees — Institutional Demonstration Script (5–10 Minutes)

**Pre-Demo Note:** Ensure both servers are running (`npm run dev` -> Web `:3000`, API `:4000`) and verify whether you are running in demo fallback mode or connected to a live Supabase/PostgreSQL database. Only demonstrate routes and actions supported by the live environment.

---

### 1. Introduction & Problem Statement (~1 min)
* **Route:** `/` (Landing Page)
* **Narration:** *"Welcome to CuriousBees, an institutional research collaboration and governance platform built for SRMIST. Currently, doctoral research updates, supervisor approvals, and file sharing are scattered across emails and spreadsheets. CuriousBees brings these together into an authenticated Researcher Network, an Academic Workspace, and an isolated Governance Console."*

### 2. Authentication & Role Separation (~1 min)
* **Route:** `/login`
* **Narration:** *"Access is invite-only and domain-restricted via Supabase Google OAuth. Every request passes through Next.js Edge Middleware and four NestJS guards: `SupabaseAuthGuard`, `ApprovedGuard`, `RolesGuard`, and `ResearchParticipantGuard`."*

### 3. Research Scholar Workflow (~2.5 min)
* **Routes:** `/feed` -> `/researchers` -> `/my-research`
* **Narration:**
  - **At `/feed`:** *"Scholars land on the Research Feed. They can filter by post type—Updates, Papers, Questions, Collabs—publish a post with PDF/image attachments via presigned S3 URLs, reply in nested comment threads, bookmark posts, or report inappropriate content directly to the admin moderation queue."*
  - **At `/researchers`:** *"Here scholars discover peers and supervisors across SRM campuses, faculties, and departments, with explainable alignment scores and supervisor capacity."*
  - **At `/my-research`:** *"Scholars track their doctoral lifecycle stage, manage milestones, and submit progress reports to their assigned supervisor."*

### 4. Research Supervisor & Collaboration Workflow (~2.5 min)
* **Routes:** `/supervisor` -> `/my-scholars` -> `/nexus` -> `/workspace/[id]`
* **Narration:**
  - **At `/supervisor` & `/my-scholars`:** *"Supervisors view their scholar capacity, approve or decline supervision requests, and review scholar progress reports."*
  - **At `/nexus` & `/workspace/[id]`:** *"Accepted collaboration requests open a 1:1 Curious Nexus conversation that can escalate into a shared Research Workspace with private S3 file sharing, milestones, and Google Meet links."*

### 5. Institute Admin & Security Boundaries (~2 min)
* **Routes:** `/admin/dashboard` -> `/admin/users` -> `/admin/moderation` -> `/admin/audit`
* **Narration:** *"Institute Admins operate in a strictly separated Governance Command Center. They provision accounts, manage SRM campuses/faculties/departments, review reported posts in `/admin/moderation`, and audit every sensitive action in `/admin/audit`. Importantly, `ResearchParticipantGuard` enforces at the API layer that admins can govern but never participate in research."*

### 6. Conclusion (~30 sec)
* **Narration:** *"CuriousBees unites X-inspired academic networking with institutional supervision and strict role-based security. Thank you—I'm happy to take questions."*
