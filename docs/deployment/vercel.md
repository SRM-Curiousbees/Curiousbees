# Frontend Deployment (Vercel)

The Next.js frontend (`apps/web`) is optimized for deployment on Vercel.

## Pre-requisites
1. A Vercel account.
2. Connected GitHub repository or Vercel CLI (`npm i -g vercel`).

## Environment Variables
In the Vercel Project Dashboard, ensure the following environment variables are set:
- `NEXT_PUBLIC_API_URL` (URL of your deployed NestJS API, e.g. `https://api.curiousbees.srmist.edu.in`)
- `NEXT_PUBLIC_SUPABASE_URL` (Supabase Project URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase Anonymous Client Key)
- `NEXT_PUBLIC_AUTH_MODE` (`GOOGLE_ADMIN_MANAGED`)
- `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` (`srmist.edu.in`)

## Deployment Steps
1. Navigate to the project root or import the repository in Vercel.
2. Set Framework Preset: **Next.js**.
3. Root Directory: `apps/web` (or root with workspace build command).
4. Build Command: `npm run build --workspace=apps/web` (or standard `next build`).
5. Output Directory: `.next`.
6. Supply all environment variables and click **Deploy**.
