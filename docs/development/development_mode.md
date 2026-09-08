# CuriousBees V2 — Development Mode Bypass Documentation

This document explains the **Development Mode Bypass** mechanism (`DEVELOPMENT_MODE=true` / `NEXT_PUBLIC_DEVELOPMENT_MODE=true`) built into CuriousBees V2. This mode allows developers to build, test, and audit the application locally without requiring external services like Firebase Authentication or cloud-based database syncs.

---

## 🚀 Purpose & Overview

During active development, UI modeling, module designing, and backend API prototyping, forcing team members to register real Firebase accounts, verify emails, or go through onboarding and administrator approval workflows creates high friction.

To solve this, enabling development mode completely overrides:

- Google Sign-in requirements and Firebase JWT verification.
- Onboarding redirect sequences.
- Scholar, Supervisor, and Administrator approval/verification checks.
- Route guards and middleware protection blocks.

---

## 🛠️ Configuration & Activation

To activate Development Mode, modify or create the respective environment configuration files in your local workspace:

### 1. NestJS API Backend Configuration

In `apps/api/.env` (or root `.env`):

```env
DEVELOPMENT_MODE=true
```

### 2. Next.js Frontend Configuration

In `apps/web/.env.local` (or root `.env`):

```env
NEXT_PUBLIC_DEVELOPMENT_MODE=true
```

> [!WARNING]
> Both environment files must match. If you set `DEVELOPMENT_MODE=true` on the backend but `NEXT_PUBLIC_DEVELOPMENT_MODE=false` on the frontend, the frontend will attempt to pass real Firebase JWTs, which the backend will fail to parse, leading to unauthorized (401) API errors.

---

## ⚡ Bypasses and Overrides

When active, the following behaviors are enforced monorepo-wide:

### 1. Authentication Guards

- **`FirebaseGuard`**: Bypasses token decoding. Instead of extracting and verifying a Firebase authorization header against the Firebase Admin SDK, it intercepts the call and injects a mock user context.
- **`ApprovedGuard`**: Automatically resolves as `true`.

### 2. Router & UI Redirection (Frontend)

The application will **never**:

- Auto-logout the session.
- Redirect users to `/login`.
- Redirect users to `/onboarding`.
- Redirect users to the verification pending page.
- Show auth-loading spinners blocking navigation.

### 3. Wildcard CORS Origins

In development mode, if NestJS runs on port `4000` and Next.js starts on an alternative local port (e.g., `3001` instead of `3000`), the backend CORS handler permits all requests originating from `localhost` or `127.0.0.1` regardless of the port number, resolving port conflict blockages.

---

## 👤 The Mock Local Developer User

Instead of pulling user data from PostgreSQL or Firebase, a mock developer user object is initialized on the fly.

```json
{
  "id": "dev-user",
  "name": "Developer",
  "email": "developer@local.dev",
  "role": "<selectedRole>",
  "approved": true,
  "status": "APPROVED"
}
```

### Role Management

The mock user's role is stored in client-side **`localStorage`** under the key `dev-role` and synchronized across the frontend stores.
The active developer role can be switched dynamically to any of the following values:

- `RESEARCH_SCHOLAR` (loads the Research Scholar Portal)
- `RESEARCH_SUPERVISOR` (loads the Faculty Supervisor Portal)
- `INSTITUTION_ADMIN` (loads the Admin Portal at `/admin/dashboard`)

---

## 🔄 How the Role Switcher Widget Works

When `NEXT_PUBLIC_DEVELOPMENT_MODE=true`, a floating **Dev Override Active** control widget is rendered at the bottom-right corner of the web interface.

1. **Changing Roles**: Clicking the dropdown selector and choosing a role immediately updates the client-side state.
2. **Dynamic Headers**: When the frontend client sends HTTP requests, it embeds the active role in the headers:
   `Authorization: Bearer dev-role:<ROLE_NAME>`
3. **Backend Parsing**: The NestJS auth guard parses `dev-role:<ROLE_NAME>` directly, resolves the mock user, and satisfies route access permissions.
4. **Instant View Switching**: Portals and sidebars adjust in real-time without requiring a page refresh or sign-out action.

---

## 🔒 Disabling Development Mode for Production Testing

To run the application under production security assumptions locally or in a staging environment:

1. Change environment variables:
   - Backend `DEVELOPMENT_MODE=false`
   - Frontend `NEXT_PUBLIC_DEVELOPMENT_MODE=false`
2. Populate the real Firebase Admin keys in the backend `.env`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
3. Populate Next.js Firebase Client keys in `apps/web/.env.local`.
4. Spin up your local databases or target a staging Supabase database via `DATABASE_URL`.
5. Run `npm run build` to verify production builds succeed.
