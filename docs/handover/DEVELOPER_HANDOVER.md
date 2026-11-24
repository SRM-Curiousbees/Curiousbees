# CuriousBees — Developer Handover Guide

**Related:** [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) | [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | [DATABASE_AND_BACKUP_GUIDE.md](./DATABASE_AND_BACKUP_GUIDE.md)

---

## 1. Monorepo & Workspace Structure

- **`apps/web`**: Next.js 15 App Router frontend (`src/app/(marketing)`, `(auth)`, `(portal)`, `src/components`, `src/store/useStore.ts`, `src/lib/`).
- **`apps/api`**: NestJS 11 REST API (`src/*` feature modules, `prisma/schema.prisma`, `test/*.e2e-spec.ts`).
- **`packages/types`**, **`packages/constants`**, **`packages/shared-utils`**, **`packages/ui`**: Shared workspace packages. Always run `npm run build:packages` after modifying files under `packages/`.

---

## 2. Frontend Development Conventions

- **API Calls:** Use `apiFetch` in [`apps/web/src/lib/api-client.ts`](../../apps/web/src/lib/api-client.ts) so Supabase Bearer tokens and base URL resolution work consistently across SSR and browser.
- **Role Gating (UX):** Route-level navigation permissions are enforced in `(portal)/layout.tsx` and permission helpers; never rely solely on frontend hiding for security — enforce guards on the NestJS controller too.
- **Public Env Rule:** Only expose non-sensitive config via `NEXT_PUBLIC_*`. Never place service keys or secrets in `NEXT_PUBLIC_*`.

## 3. Backend Development Conventions

- **Module Layout:** Each domain feature lives in `apps/api/src/<feature>/` (`<feature>.module.ts`, `<feature>.controller.ts`, `<feature>.service.ts`, `<feature>.service.spec.ts`, `dto/`).
- **DTO Validation:** Use `class-validator` decorators on all request DTOs; global `ValidationPipe` strips unknown properties (`whitelist: true`, `forbidNonWhitelisted: true`).
- **Guard Order:** Standard protected endpoints inherit `SupabaseAuthGuard` + `ApprovedGuard`. Add `@UseGuards(RolesGuard) @Roles(...)` for role restriction and `@UseGuards(ResearchParticipantGuard)` on scholar/supervisor participation mutations to keep `INSTITUTE_ADMIN` separated from research participation.
- **PII Protection:** Never return `email`, `employeeId`, `supabaseAuthId`, or internal moderation/audit fields in public researcher/thread/comment payloads (`UsersService.getPublicProfile`, `ThreadsService`, `CommentsService`).

## 4. Database & Prisma Migration Rules

1. Edit [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma).
2. Generate migration on **local dev DB only**: `npm run db:migrate` (runs `scripts/db/local-only.js prisma migrate dev`).
3. Regenerate client: `npm run db:generate`.
4. Validate: `npx prisma validate --schema=apps/api/prisma/schema.prisma`.
5. Never hand-edit applied migration SQL files after they have been deployed to staging/production.

## 5. Testing & Build Commands (From Repo Root)

```bash
npm run build:packages   # Build shared workspace packages
npm run lint             # ESLint across workspaces
npm run typecheck        # tsc --noEmit on web & api
npm test                 # Jest unit tests (apps/api)
npm run test:web         # Web helper tests (apps/web)
npm run test:scripts     # DB & load-guard script tests
npm run build            # Full production build (packages + web + api)
```

## 6. Extending the Platform

### Adding a New NestJS Module
1. Create `apps/api/src/<module>/<module>.module.ts`, controller, service, and `.spec.ts`.
2. Register the module in `apps/api/src/app.module.ts`.
3. Apply appropriate guards (`SupabaseAuthGuard`, `RolesGuard`, `ResearchParticipantGuard`) and add unit tests with mocked `PrismaService`.

### Adding a New Role or Permission
1. Add the value to `enum Role` in `apps/api/prisma/schema.prisma` and create a Prisma migration.
2. Update `Role` in `apps/api/src/auth/roles/role.enum.ts` and shared `@curiousbees/types` / `@curiousbees/constants`.
3. Update `RESEARCH_PARTICIPANT_ROLES` (`apps/api/src/auth/guards/research-participant.guard.ts`) if the role participates in research, plus frontend navigation permissions in `apps/web`.
4. Run `npm run typecheck`, `npm test`, and `npm run build` to verify all switch/role checks.

## 7. Branching, PRs & Releases

- Work on short-lived feature branches (`feat/...`, `fix/...`); never commit directly to `main`.
- Pull requests trigger [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml) (`validate` job: lint, typecheck, unit tests, migration drift check, E2E against disposable Postgres+LocalStack, production builds).
- Merge to `main` only after CI passes and at least one peer review.
