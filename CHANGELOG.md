# Changelog

All notable changes to the **CuriousBees V2** monorepo project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] — 2026-06-05

### Added
- **Cross-Platform Health CLI**: Added [`scripts/health-check.js`](./scripts/health-check.js) to query and format backend/database connections on Windows, macOS, and Linux.
- **GitHub Workflow Templates**: Added pull request template and issue template forms for bugs and feature requests under `.github/`.
- **Development Mode Override Guide**: Created [`docs/development/development_mode.md`](./docs/development/development_mode.md) detailing authentication bypass logic and role switches.
- **Deployment Guide**: Created [`docs/deployment/DEPLOYMENT_GUIDE.md`](./docs/deployment/DEPLOYMENT_GUIDE.md) outlining environment configurations and cloud release runbooks.

### Changed
- **Enforced Strict TypeScript**: Activated `"strict": true` and configured NestJS API in [`apps/api/tsconfig.json`](./apps/api/tsconfig.json), ensuring zero type compiler warnings.
- **Enhanced `/api/health` Endpoint**: Configured App Controller to return connection status checks for database and Redis services, alongside version tags.
- **Standardized Monorepo scripts**: Harmonized root-level scripts (`dev:web`, `dev:api`, `build:web`, `build:api`, `lint`, `typecheck`, `health`, etc.) for seamless onboarding.
- **Adjusted Lint Rules**: Added `.eslintrc.json` config in frontend Next.js workspace to ignore blocking non-interactive HTML/escape character warnings during CI/CD.

### Fixed
- Resolved CORS verification blocks for non-default ports in `DEVELOPMENT_MODE` by adding dynamic localhost patterns.
- Patched TypeScript parameters in NestJS main setup and Firebase Admin SDK helper functions.

---

## [0.2.0] — 2026-05-15

### Added
- **Firebase Guard Integration**: Integrated `FirebaseGuard` for JWT signature verification and role-based protection.
- **User Portals & Dashboards**: Built out core UI layouts and routes for Scholars, Supervisors, and Admin.
- **Approval Workflows**: Implemented approval checks (`ApprovedGuard`) preventing unverified users from accessing features.
- **Onboarding Flow**: Created wizard UI sequence to guide newly signed-up users through details configuration.
- **Database Seeding**: Created seed script populated with departments, mock scholars, and supervisor records.

### Changed
- Refactored user schemas in Prisma to track approval states and metadata roles.

---

## [0.1.0] — 2026-04-01

### Added
- **Monorepo Scaffolding**: Setup workspaces structure using npm workspaces mapping `apps/` and `packages/`.
- **NestJS Gateway**: Established backend API microservice framework with Prisma ORM connectivity.
- **Next.js Interface**: Formulated frontend shell with UI tokens.
- **Docker Integration**: Configured PostgreSQL database and Redis server services in `docker-compose.yml`.

---

## 🛠️ Release Workflow

To publish a new version of CuriousBees V2, follow the release workflow:

1. **Feature/Bug Branching**: Develop changes in a feature branch (`feature/feature-name`) or bugfix branch (`bugfix/issue-name`).
2. **Version Bump**: Bump version in package.json files:
   - Root [`package.json`](./package.json)
   - Workspace apps as appropriate
3. **Run Checks**: Ensure all validations pass before merging:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```
4. **Log Changes**: Document all changes in the `CHANGELOG.md` file under the respective version header.
5. **PR and Tag**: Create a Pull Request. Once approved and merged, tag the release commit:
   ```bash
   git tag -a v0.3.0 -m "Release version 0.3.0"
   git push origin v0.3.0
   ```
