# CuriousBees — User Guide

---

## 1. Research Scholar Guide
1. **Login & Onboarding:** Visit `/login` and sign in with your provisioned institutional Google account (`@srmist.edu.in` or allowed domain). On first login, `/onboarding` guides you to select your research areas, department (if unset), and a Research Supervisor. While awaiting approval, `/verification-pending` checks status automatically.
2. **Navigation:** Left sidebar provides `Research Feed` (`/feed`), `My Research` (`/my-research`), `Research Workspaces` (`/workspace`), `Publications` (`/publications`), `Researchers` (`/researchers`), `Events` (`/events`), `Opportunities` (`/opportunities`), `Curious Nexus` (`/nexus`), and `Settings` (`/settings`).
3. **Daily Actions:**
   - **Feed (`/feed`):** Use the top composer (`CompactComposer`) to post updates, papers, questions, or collaboration requests (with optional `.pdf`, `.doc/.docx`, or image attachments up to 10 MB). Like, comment/reply, bookmark (`Saved`), share links, or report posts.
   - **Discovery & Following (`/researchers`):** Filter peers by department, faculty, campus, or interest; follow researchers and domains.
   - **My Research (`/my-research`):** Update thesis title, stage, and milestones, and submit progress reports to your supervisor.
   - **Nexus & Workspaces (`/nexus`, `/workspace/[id]`):** Send collaboration requests, message accepted collaborators, upload/download workspace files (up to 50 MB), and manage milestones.
4. **Restrictions:** Scholars cannot approve requests, publish/edit institutional events, or access `/admin/*`.

---

## 2. Research Supervisor Guide
1. **Login & Onboarding:** Sign in at `/login` with your provisioned account and complete `/onboarding` (research areas and department if unset). Supervisors land on `/supervisor` (`SupervisorOverview`).
2. **Supervision Panel (`/my-scholars`):**
   - **Scholars Tab:** View assigned scholars and capacity (`maxScholars`).
   - **Requests Tab:** Approve or decline incoming `ScholarSupervisorRequest`s.
   - **Reports Tab:** Review scholar progress reports (`APPROVED`, `REJECTED`, `NEEDS_INFO`) with written feedback.
3. **Research & Collaboration:** Full access to `/feed`, `/researchers`, `/nexus`, `/workspace`, `/publications`, `/events` (can create and edit own events), and `/opportunities` (can post and manage openings).
4. **Restrictions:** Cannot submit scholar progress reports, review/delete events globally, or access `/admin/*`.

---

## 3. Institute Admin Guide
1. **Login:** Sign in at `/login` to access `/admin/dashboard`.
2. **Governance Workflows:**
   - **People & Access (`/admin/users`, `/admin/roles-permissions`):** Provision scholars, supervisors, and admins (individually or via CSV), suspend/reactivate accounts, and reassign supervisors.
   - **Institution (`/admin/campuses`, `/admin/faculties-departments`):** Manage SRM campuses, faculties, and departments.
   - **Moderation (`/admin/posts`, `/admin/moderation`):** Hide/restore/delete posts with mandatory reasons; resolve or dismiss `ModerationReport`s.
   - **Communication & Oversight (`/admin/announcements`, `/admin/event-inbox`, `/admin/analytics`, `/admin/audit`, `/admin/settings`):** Broadcast announcements, review ingested events, inspect `AuditLog`, and configure `SystemSetting`s.
3. **Restrictions:** By design (`ResearchParticipantGuard`), Institute Admins cannot post, comment, react, follow, collaborate, or author publications/opportunities/workspaces.
