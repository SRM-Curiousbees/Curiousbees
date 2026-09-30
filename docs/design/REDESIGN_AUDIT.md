# CuriousBees redesign audit

Status of the product experience before and during the redesign. This is the working
inventory: every route, who uses it, and whether it is on the design system. Update the status column as screens move over.

Last reviewed: 30 September 2026.

## 1. Verified stack

| Layer | What is actually in the repository |
|---|---|
| Web | Next.js 15.5 (App Router), React 19, TypeScript, Tailwind CSS 3.4, `tailwindcss-animate` |
| State | Zustand store (`src/store/useStore.ts`), TanStack Query in two places |
| Motion | `framer-motion` 11 (used in ~40 files). No GSAP, no Lenis |
| Icons | `lucide-react` only |
| Charts | No charting library. The admin analytics chart is plain CSS bars with an accessible table |
| Auth | Supabase Auth, Google OAuth only. Sessions via `@supabase/ssr` cookies |
| API | NestJS 11 (`apps/api`), Prisma 6, PostgreSQL. The API is the authority for every permission |
| Files | Private S3 bucket, presigned upload/download URLs |
| Email | Brevo |
| Hosting target | AWS (ECS Fargate, ALB, CloudFront, RDS). See `docs/deployment/aws-production.md` |
| Analytics | None installed |

Not present, despite appearing in early briefs: Drizzle, Firebase Auth, Cloudflare R2, Vercel
hosting, PostHog, GSAP, Lenis. The redesign does not add them.

Removed during the redesign because nothing imported them: `three`, `@react-three/fiber`,
`@react-three/drei`, `canvas-confetti`, `@tanstack/react-table`, all `@fullcalendar/*`
packages, `recharts`, `react-is`, `@types/three`, `@types/canvas-confetti`.

## 2. Roles and access

| Role | Home | Scope |
|---|---|---|
| Research scholar | `/feed` | Own research record, milestones, supervisor, feed, researchers, events, opportunities, workspaces, Nexus |
| Research supervisor | `/feed` | Supervision Panel (scholars, requests, progress reports), feed, researchers, events, opportunities, workspaces, Nexus |
| Institute admin | `/admin/dashboard` | Governance only: accounts, institution structure, moderation, announcements, audit, settings. No research participation (enforced by `ResearchParticipantGuard` in the API and the route matrix in `lib/auth/permissions.ts`) |

Sign-in requires an admin-provisioned account on an allowed email domain
(`ALLOWED_EMAIL_DOMAINS`). Access-denial states: not provisioned, domain not allowed,
unverified email, suspended, deactivated, pending supervisor approval.

## 3. Route inventory

Legend: **Done** = rebuilt on the design system. **Header** = shared page header and
tokens, body still the earlier layout. **Redirect** = kept only so old links work.

### Public

| Route | Purpose | Status |
|---|---|---|
| `/` | Landing | Done |
| `/research`, `/education`, `/institution`, `/about`, `/contact` | For scholars, supervisors, institutions; about; contact | Done |
| `/ethics-framework`, `/privacy-policy`, `/terms-of-service` | Expectations and legal | Done (legal text needs the institution's review) |
| `/features` | Old feature page | Redirect → `/#platform` |
| `/login` | Google sign-in | Done |
| `/onboarding` | First sign-in: research areas, department, supervisor | Done |
| `/verification-pending`, `/approval-pending`, `/awaiting-supervisor-approval` | Approval states | Done |
| `/not-provisioned`, `/access-denied`, `/account-suspended`, `/account-rejected`, `/auth/*`, `/unauthorized`, `/error` | Access states | Done |
| `/feed/post/[id]` | Old share links | Redirect → `/feed/[id]` |
| `/sys-admin-login`, `/sys-admin/*` | Retired PIN console | Redirect → `/admin/dashboard` |

### Research scholar and supervisor

| Route | Purpose | Status |
|---|---|---|
| `/feed`, `/feed/[id]` | Research feed and post page | Done |
| `/feed/create` | Old standalone composer | Redirect → `/feed?compose=1` |
| `/my-research` | Thesis, stage, milestones, progress reports | Done |
| `/my-scholars`, `/supervisor` | Supervision Panel and supervisor overview | Done |
| `/supervisor/requests/[id]` | Supervision request review | Done |
| `/researchers`, `/researchers/[id]`, `/profile` | Directory and profiles | Done |
| `/events` | Events calendar | Done |
| `/opportunities` | Opportunities and join requests | Done |
| `/nexus`, `/workspace`, `/chat` | Curious Nexus hub | Done |
| `/workspace/[id]` | Shared workspace | Done |
| `/publications` | Publications | Done |
| `/notifications` | Notification centre | Done |
| `/settings` (tabs), `/settings/integrations/callback` | Account settings, OAuth return | Done |
| `/help` | How the platform works, per role | Done |
| `/settings/integrations` | Old integrations page | Redirect → `/settings?tab=integrations` |
| `/scholar/*` | Old scholar aliases | Redirect to the matching route |

### Institute admin

| Route | Purpose | Status |
|---|---|---|
| `/admin/dashboard`, `/admin/users` (tabs) | Overview, accounts | Done |
| `/admin/scholar-requests` | Supervision requests across the institution (read-only) | Done |
| `/admin/analytics`, `/admin/settings`, `/admin/email-delivery` | Analytics, effective configuration, email outcomes | Done |
| `/admin/faculties-departments`, `/admin/campuses`, `/admin/roles-permissions` | Institution structure, permission matrix | Header |
| `/admin/posts`, `/admin/publications`, `/admin/moderation`, `/admin/announcements` | Moderation and announcements | Header |
| `/admin/research-activity`, `/admin/research-workspaces`, `/admin/audit` | Research oversight, audit log | Header |
| `/admin/directory`, `/admin/compliance`, `/admin/security`, `/admin/notifications`, `/admin/publication-moderation`, `/admin/supervisors` | Former aliases (duplicate sidebar entries removed) | Redirect to the canonical screen |
| `/admin/approval-requests`, `/approval-requests`, `/reports` | Client redirects | Redirect |

## 4. Shared building blocks (already on the system)

`components/ui`: `Button`/`IconButton`, `Badge`/`StatusBadge`, `Card`/`CardHeader`/`CardBody`,
`PageHeader`, `EmptyState`, `Skeleton`, `Dialog` (portal, stacking, focus trap, side panel),
`ActionMenu`, `Field`/`DetailItem`, `StatusScreen`.
Shell: `Sidebar`, `Navbar`, `ProfileDropdown`, `NotificationDropdown`, `SpotlightSearch` (legacy
styling), portal `layout.tsx` with route guard and branded loader.

## 5. Remaining visual work

- The admin screens marked **Header** still use their earlier body layout (cards with small
  uppercase labels). They work on phones and in dark mode but are not yet on the table and
  figure patterns used by `/admin/users` and `/admin/analytics`.
- Most avatars are plain `<img>` elements (lint warns on them); moving them to `next/image`
  needs the image hosts configured.

## 6. Accessibility

Fixed across the rebuilt screens: dialogs are labelled, trap focus and close on Escape;
tabs use `role="tab"`/`aria-selected`; icon buttons have names; `select-none` is gone from
page roots; toasts are announced (errors assertively); global search is a proper combobox;
charts have a table alternative. Remaining: the **Header** admin screens still use some
11–12px grey text.

## 7. Responsive

Checked at 1440, 1280, 1024, 768, 430, 390 and 375 wide with no horizontal page scroll on the
rebuilt screens. Fixed: `/admin/settings` (was 326px too wide), `/my-scholars`, admin tables,
toasts at phone width, dialogs covered by the browser-notification prompt.

## 8. Security and correctness findings

Fixed during the redesign (API tests added where noted):

- `/sys-admin` PIN console retired.
- Thread edit/delete checked the author's role instead of the caller; opportunity request
  route was shadowed; admins could take part in research (`ResearchParticipantGuard`).
- The post-attachment download routes, including an unauthenticated one, would presign any
  storage key, including private workspace files. Now limited to `threads/` keys (test).
- Posts hidden by moderation were still readable by ID and on the public share route. Now
  only their author can open them (test).
- `GET /api/announcements` was public and returned author emails. Now signed-in only,
  without emails (test).
- Progress reports could be addressed to any supervisor. Now always the scholar's assigned
  supervisor (test).
- Onboarding let a scholar pick a different department from the one an administrator
  assigned (unit test). The onboarding page could also trap supervisors whose department name
  didn't match a record.
- The workspace created on an accepted opportunity request put the supervisor's internal ID
  in its description.
- Fabricated data removed from the UI and API: email statistics padded to minimum values with
  invented logs, settings reported as "connected", random file sizes, a fake plagiarism
  integration, "semantic discovery", "Nature Quantum" journal fallback, fake post attachments,
  a support email address and a working-looking contact form that sent nothing.

Open, not changed:

- OAuth `state` for Google/Zoom is unsigned and never checked on callback (account-linking
  CSRF). Sign it server-side and verify it in the callback.
- OAuth access/refresh tokens are stored without application-level encryption.
- `notifications.updatePreferences` spreads the request body into Prisma (mass assignment).
- `updateProfile` lets a user change their own department.
- Onboarding doesn't check that the chosen supervisor is in the scholar's department.
- Two NestJS controllers register `admin/users`; the paginated one wins.
- Reported posts only raise a count on `/admin/posts`; they never reach the moderation queue.
- Rate limit is per IP (120/min); a campus NAT can hit it.

## 9. Motion opportunities

- Landing: a composed opening sequence, a research-network motif, scroll-linked scenes
  that explain the product in order (people, supervision, collaboration, events,
  leadership visibility).
- Product: consistent enter transitions for page content, dialogs, menus and filter
  changes; branded loader; no decorative loops inside the application.

## 10. Performance risks

- Portal layout and most screens are client components (Zustand store drives them).
  Keep new marketing sections as server components with small client islands for motion.
- Google Fonts: Next's font loader (15.5 and canary) crashes on the extension-less
  `fonts.gstatic.com/l/font?kit=` URLs Google now returns, which fails production builds.
  Fix: self-host the three families with `next/font/local`.
- API rate limit of 120 requests per minute per IP can be reached by users behind one
  campus NAT; each portal page issues several requests.

## 11. Constraints

- API contracts, database schema, permissions and routes are preserved.
- No fabricated data or capabilities in UI copy.
- Light and dark themes must both work (token-driven; see `DESIGN_SYSTEM.md`).
