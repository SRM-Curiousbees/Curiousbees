# CuriousBees V2 — CI/CD Pipeline Documentation

This manual outlines the continuous integration and deployment standards configured for the CuriousBees V2 monorepo.

---

## 🚀 GitHub Actions CI Pipeline

The pipeline is defined in [`.github/workflows/pr-check.yml`](../../.github/workflows/pr-check.yml) and executes on:

- **Push events** to branches: `main`, `master`, `staging`, `dev`
- **Pull Request events** targeting branches: `main`, `master`, `staging`, `dev`

### Pipeline Architecture

```mermaid
graph TD
    A[Code Push / PR] --> B[Checkout Code]
    B --> C[Setup Node.js v22]
    C --> D[Install Deps --legacy-peer-deps]
    D --> E[Prisma Client Generate]
    E --> F[Run Lint check]
    F --> G[Run Typecheck tsc]
    G --> H[Run Production Build]
    H --> I[Build Successful]
```

### Key Stages Explained

1. **Monorepo Dependency Cache**: Uses GitHub Actions built-in cache provider targeting `package-lock.json` to keep build steps fast.
2. **Installation Guard**: Uses `--legacy-peer-deps` to ensure that NestJS v11 and Swagger/Throttler packages compile successfully without peer dependency tree collision blocks.
3. **Database Client Generation**: Pushes schema types to `@prisma/client` using `npx prisma generate` before validating type safety.
4. **Linting Verification**: Enforces code styling and standard rules defined in Next.js/NestJS workspaces.
5. **Strict Compilation Checks**: Runs `tsc --noEmit` on all projects to check for potential type mismatches.
6. **Production Compilation**: Executes `npm run build` with mocked build-time environment flags to bypass Zod schema verification and confirm bundling readiness.

---

## 🛠️ Mock Environment Configurations for CI

Because CuriousBees enforces environment variable integrity using Zod at compile-time/runtime, the GitHub Actions workspace injects the following dummy parameters during compilation:

- `NODE_ENV`: `production`
- `DEVELOPMENT_MODE`: `"true"` (Bypasses Firebase key validation requirements)
- `DATABASE_URL`: `postgresql://cbtest:cbtest_local_only@127.0.0.1:55432/curiousbees?schema=public` (the disposable CI service database; the integration suite refuses to reset any other)
- `DIRECT_URL`: same as `DATABASE_URL`
- `REDIS_HOST`: `localhost`
- `REDIS_PORT`: `6379`
- `FRONTEND_URL`: `http://localhost:3000`
- `NEXT_PUBLIC_API_URL`: `http://localhost:4000`
- `NEXT_PUBLIC_DEVELOPMENT_MODE`: `"true"`

---

## 📦 Local CI Verification

To run these checks locally before pushing to git, developers should run:

```bash
# 1. Typecheck the entire project
npm run typecheck

# 2. Run Linting
npm run lint

# 3. Build Web & API workspaces
npm run build
```
