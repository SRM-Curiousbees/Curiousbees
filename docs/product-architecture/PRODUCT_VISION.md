# CuriousBees — Product Vision & Positioning

**Phase:** Phase 0 — Product Architecture & Experience Blueprint  
**Status:** Proposed Blueprint (Read-Only Design; Awaiting Approval)

---

## 1. Product Positioning

**CuriousBees is an academic research social network for the SRM ecosystem, with institutional research and supervision workflows integrated naturally into the platform.**

Rather than treating social networking as a side-tab inside an administrative ERP, CuriousBees places the **Researcher Network** at the center of daily scholar and supervisor engagement—combining X's fast, scannable, conversation-driven interaction model with SRM's doctoral supervision, shared research workspaces, and institutional governance.

---

## 2. Three Primary Product Areas

| Product Area | Purpose | Primary Users |
| :--- | :--- | :--- |
| **A. Researcher Network (Primary Experience)** | Public-within-institution academic microblogging, paper sharing, Q&A, reposts/quote-posts, `@mentions`, follows, discovery, and collaboration-aware messaging. | Research Scholars, Research Supervisors |
| **B. Academic Workspace** | Structured doctoral lifecycle (`My Research`), scholar-supervisor matching & progress reviews (`Supervision`), shared project sandboxes (`Workspaces` + S3 files + Google Meet), `Publications`, `Opportunities`, and `Events`. | Research Scholars, Research Supervisors |
| **C. Institutional Governance** | Separate, restricted command center for account provisioning, campus/faculty/department hierarchy, content moderation, announcements, event ingestion, analytics, and immutable audit logs. | Institute Admins (non-participants in research) |

---

## 3. Core Architectural Principles

1. **Researcher Network First:** Both **Research Scholars** and **Research Supervisors** land on `/feed` by default so supervisors participate naturally in the academic conversation rather than being isolated in a KPI dashboard.
2. **Backend-Enforced Authorization:** Route hiding in `navigation.ts` is UX only; `SupabaseAuthGuard`, `ApprovedGuard`, `RolesGuard`, and `ResearchParticipantGuard` remain the authoritative boundary.
3. **Strict Public-Profile Privacy:** Public researcher profiles, feed cards, and comment threads never expose `email`, `employeeId`, `supabaseAuthId`, `clerkId`, or internal approval metadata.
4. **Consolidate UX Without Destructive Schema Churn:** Relocating or hiding duplicate frontend routes does not require deleting underlying Prisma models that still serve active workflows (e.g., `CollaborationRequest` still serves `OpportunitiesService`).
5. **Real Data Only:** Remove simulated client-side mock features (such as `PushNotificationPrompt.tsx`'s 15-second fake notification timer) and disconnect-prone workarounds.

---

## 4. What CuriousBees Is and Is Not

| CuriousBees **IS** | CuriousBees **IS NOT** |
| :--- | :--- |
| An **institutional academic social network** for SRM scholars and supervisors to share research updates, papers, questions, and ideas. | An anonymous or open public internet microblog (access is gated to verified institutional accounts). |
| A **collaboration-aware** platform where feed discussions smoothly escalate into 1:1 Nexus conversations and shared S3/Meet workspaces. | An open spam-prone DM inbox (collaboration requests preserve intentional academic consent). |
| A **governance-backed** ecosystem with audit trails, moderation queues, and supervision accountability. | A social playground for administrators (`INSTITUTE_ADMIN` governs and moderates, never posts or reacts). |
