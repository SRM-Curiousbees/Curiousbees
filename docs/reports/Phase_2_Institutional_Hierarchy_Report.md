# CuriousBees V2 — Phase 2 Institutional Organization Migration Report

**Date:** September 28, 2026  
**Status:** Completed & Production-Verified  
**Repository:** `CuriousBees_V2`  

---

## 1. Executive Summary

Phase 2 of the CuriousBees_V2 architecture roadmap established a strictly governed, single source of truth for SRM Institute's academic hierarchy. Prior to this migration, the platform operated on a fragile hybrid model combining relational faculties and departments with unlinked campuses, free-text department input fields, hardcoded constant arrays (`SRM_DEPARTMENTS`), and unvalidated strings in user profiles, opportunities, and events.

This migration successfully establishes the canonical hierarchy:
$$\text{Campus (KTR)} \longrightarrow \text{Faculty (11 Verified)} \longrightarrow \text{Department (29 Verified)} \longrightarrow \text{Researcher (User.departmentId)}$$

### Core Tenet: Strict Separation of Concerns
- **Institutional Identity ("Where does the researcher belong?"):**
  Governed by relational entities: `Campus` $\to$ `Faculty` $\to$ `Department` $\to$ `User.departmentId`.
- **Research Identity ("What does the researcher work on?"):**
  Governed independently by `ResearchDomain`, `ResearchTopic`, `ResearchInterest`, `Publication`, `Workspace`, and `WorkspaceProject`.

Institutional governance does not restrict research freedom; research collaboration crosses departments and faculties freely while institutional reporting and supervision integrity remain strictly auditable.

---

## 2. Target Architecture vs. Legacy Hybrid State

| Architectural Dimension | Legacy Hybrid State | Phase 2 Canonical Target |
| :--- | :--- | :--- |
| **Source of Truth** | Disconnected: DB tables, raw strings, and static `SRM_DEPARTMENTS` array | PostgreSQL database via Prisma ORM (`Campus`, `Faculty`, `Department`) |
| **Campus Integration** | `Campus` model isolated with no foreign keys to faculties or departments | `Campus` (Kattankulathur - `KTR`) has relational `hasMany` connection to `Faculty` (`Faculty.campusId`) |
| **Faculty & Department Binding** | Loose mapping; users could choose mismatched Faculty/Department | Relational foreign key `Department.facultyId` with `ON DELETE RESTRICT`; backend rejects mismatched pairs |
| **User Affiliation** | Dual raw strings (`User.department`, `User.faculty`) with partial `User.departmentId` | Authoritative `User.departmentId` foreign key to `Department`; denormalized strings maintained automatically for backwards compatibility |
| **Profile Redundancy** | Duplicate IDs in `SupervisorProfile` and `ScholarProfile` | Synchronized via database transactions from authoritative `User.departmentId` |
| **Frontend Form Controls** | Free-text `<input>` or hardcoded 12-item dropdown | Cascading dynamic selectors (`FacultySelect` $\to$ `DepartmentSelect`) querying `/api/faculties` and `/api/departments` |
| **Hardcoded Constants** | `SRM_DEPARTMENTS` in `packages/shared-utils` referenced across UI | Deprecated; UI components dynamically fetch verified institutional records |
| **Scope Guardrails** | Risk of unnecessary educational entities (`Programme`, `Course`, `Degree`) | Explicitly excluded: no `Programme`, `Degree`, `Course`, or `School` entities introduced |

---

## 3. Database Migration & Schema Design

### Migration SQL (`20260928000000_institutional_hierarchy`)
The migration was applied non-destructively without `prisma migrate reset`. Existing production and test data remained 100% intact:

```sql
-- 1. Alter Faculty to link to Campus
ALTER TABLE "Faculty" ADD COLUMN IF NOT EXISTS "campusId" TEXT;
CREATE INDEX IF NOT EXISTS "Faculty_campusId_idx" ON "Faculty"("campusId");
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_campusId_fkey" 
  FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Restrict Department to Faculty binding
ALTER TABLE "Department" DROP CONSTRAINT IF EXISTS "Department_facultyId_fkey";
ALTER TABLE "Department" ADD CONSTRAINT "Department_facultyId_fkey" 
  FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Link Opportunity, Event, and UserPreference to Department
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
CREATE INDEX IF NOT EXISTS "Opportunity_departmentId_idx" ON "Opportunity"("departmentId");
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_departmentId_fkey" 
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
CREATE INDEX IF NOT EXISTS "Event_departmentId_idx" ON "Event"("departmentId");
ALTER TABLE "Event" ADD CONSTRAINT "Event_departmentId_fkey" 
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
CREATE INDEX IF NOT EXISTS "UserPreference_departmentId_idx" ON "UserPreference"("departmentId");
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_departmentId_fkey" 
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### Institutional Hierarchy Seed & Backfill
- **Campus:** Kattankulathur (`KTR`)
- **11 Verified SRM Faculties:**
  1. Faculty of Engineering & Technology (FET) — 12 departments
  2. Faculty of Science & Humanities (FSH) — 5 departments
  3. Faculty of Management (FOM) — 1 department
  4. Faculty of Law (FOL) — 2 departments
  5. Faculty of Medicine & Health Sciences (FMHS) — 2 departments
  6. Faculty of Pharmacy (FOP) — 2 departments
  7. Faculty of Nursing (FON) — 1 department
  8. Faculty of Physiotherapy (FPT) — 1 department
  9. Faculty of Occupational Therapy (FOT) — 1 department
  10. Faculty of Public Health (FPH) — 1 department
  11. Faculty of Hotel Management (FHM) — 1 department
- **Total Departments:** 29 canonical departments.
- **Researcher Backfill Rate:** **100%**. Every supervisor and scholar account in the database was matched and migrated to a canonical relational `Department` with `departmentRef.faculty.campus` fully hydrated. The only users with `departmentId: null` are the university-level Institute Admins (`curiousbees@srmist.edu.in` and `r.matheshwaran.io@gmail.com`).

---

## 4. Backend Implementation & Hardening

### `OnboardingService` (`apps/api/src/onboarding/onboarding.service.ts`)
- Replaced free-text department inputs with mandatory `departmentId`.
- Validates that the submitted `departmentId` exists and belongs directly to the selected `facultyId`.
- Rejects cross-faculty department fraud with HTTP 400 (`Invalid department/faculty selection`).
- Dual-write pattern: populates `user.departmentId` as primary, while keeping `user.department` and `user.faculty` strings in sync.
- Synchronizes `supervisorProfile` and `scholarProfile` `departmentId` and `facultyId`.
- Logs structured institutional audit records (`SUPERVISOR_ONBOARDING_COMPLETED`, `SCHOLAR_REGISTRATION_SUBMITTED`).

### `UsersService` & `UsersController` (`apps/api/src/users/`)
- `getProfile`: Injects full canonical `departmentRef` with nested `faculty` and `campus`.
- `updateProfile`: Validates `departmentId` when modifying affiliation, checks cross-faculty integrity, updates denormalized fields, and logs `USER_AFFILIATION_UPDATED` in the audit log.
- `getResearchers`: Supports relational filtering by `departmentId`, `facultyId`, and `campusId`. Computes institutional alignment scores using relational `departmentId` rather than loose string matching.

### `SupervisorsService` (`apps/api/src/supervisors/supervisors.service.ts`)
- Replaced legacy string filtering with relational `departmentId` and `facultyId` filters on `supervisorProfile` and `user`.

### `OpportunitiesService` & `EventsService`
- Opportunities and Events store `departmentId` relationally.
- Relational access checks (`validateDepartmentAccess`) match user's `departmentId` directly against target departments.

### Admin Governance (`apps/api/src/admin/institution.service.ts`)
- `deleteDepartment` & `deleteFaculty`: Enforce cascade protection by verifying whether active users, opportunities, or events are associated before allowing deletion.
- `updateDepartment`: Safely propagates department name updates across dependent user records.

---

## 5. Frontend Modernization & Component Architecture

### Elimination of Hardcoded Lists
- Deprecated `SRM_DEPARTMENTS` across packages.
- All selection menus dynamically fetch from `/api/departments` and `/api/faculties`.

### `EditResearcherProfileDrawer.tsx` (`apps/web/src/components/profile/`)
- Completely removed free-text `<input>` for department.
- Implemented cascading reactive selectors:
  1. Displays primary campus badge (**SRM Institute of Science and Technology — Kattankulathur (KTR)**).
  2. Faculty dropdown populated from `/api/faculties`.
  3. Department dropdown populated from `/api/departments`, automatically filtered to only show departments belonging to the selected faculty.
- Submits authoritative `departmentId` to `/api/users/profile`.

### Directory & Discovery Pages
- `apps/web/src/app/(portal)/researchers/page.tsx`: Dynamically fetches departments from API and passes `departmentId` filter to `useResearchers`.
- `apps/web/src/app/(portal)/scholar/connections/page.tsx`: Replaced static list with dynamic department retrieval.
- `apps/web/src/app/(portal)/settings/page.tsx`: Dynamic department selection for notification and feed preferences.

---

## 6. Verification & Test Suite

| Test Suite / Build Step | Target | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Jest Unit Tests** | `apps/api` | **PASS (7/7 suites, 22/22 tests)** | Tested institutional hierarchy validation, mismatch rejection, profile synchronization, and audit logging |
| **TypeScript Typecheck** | Monorepo (`web` + `api`) | **PASS (0 errors)** | Strict types verified across packages, API, and Next.js frontend |
| **Packages Build** | `@curiousbees/*` | **PASS** | Types, constants, and shared-utils cleanly compiled |
| **API Build** | `apps/api` (NestJS) | **PASS** | Prisma Client generated, NestJS dist bundle created |
| **Web Build** | `apps/web` (Next.js) | **PASS (88/88 routes)** | All 88 static and dynamic Next.js routes generated and optimized |
| **Database Hierarchy Integrity** | PostgreSQL | **PASS** | 1 Campus $\to$ 11 Faculties $\to$ 29 Departments $\to$ 100% Researchers |

---

## 7. Operational Guidelines for Future Development

1. **Never write raw department strings:**
   Always assign `departmentId` as the primary key reference. The backend services automatically handle denormalized string synchronization.
2. **Never introduce unapproved organizational levels:**
   Do not introduce `Programme`, `Degree`, `Course`, or `School` entities. Institutional hierarchy is strictly `Campus -> Faculty -> Department`.
3. **Keep Research Identity separate from Institutional Affiliation:**
   Research domains, topics, tags, and workspaces must remain independent of faculty and department IDs.
4. **Cascade Deletes:**
   Never delete a `Department` or `Faculty` directly without reassigning or checking dependent researchers and resources. Use the administrative API which enforces deletion guards.
