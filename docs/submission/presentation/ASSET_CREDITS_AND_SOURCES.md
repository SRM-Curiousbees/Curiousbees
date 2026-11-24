# CuriousBees — Presentation Asset Credits & Sources

## 1. Visual Assets Used
| Asset | Source Path in Repository | Usage in Presentation |
| :--- | :--- | :--- |
| **CuriousBees Icon Mark** | `apps/web/public/logo_icon.png` | Cover badge (Slide 1), top-right header mark (Slides 2–17), closing badge (Slide 18). |
| **SRM White Transparent Logo** | `apps/web/public/srm_logo_white_transparent.png` | Institutional attribution on dark navy Cover (Slide 1) and Closing (Slide 18). |
| **Native Editable Diagrams & UI Blueprints** | Generated natively via `python-pptx` shapes | Slides 2–17 (architecture diagrams, workflow journeys, role comparisons, and Slide 10 interface blueprints). |

## 2. Screenshot Disclosure
- Live authenticated UI screenshots were **not** embedded because the local Supabase PostgreSQL host (`ndtaxeqsefusocwgqppx.supabase.co`) is currently unreachable and legacy root screenshots were removed during repository cleanup.
- Per presentation guidelines, Slide 10 uses **clearly labelled native interface blueprints** reflecting the verified Next.js routes (`/feed`, `/researchers/[id]`, `/workspace/[id]`, `/my-scholars`, `/admin/dashboard`) rather than fabricated screenshots.

## 3. Factual & Verification Sources
- **Build & Test Statistics (Slide 14):** `docs/product-architecture/FINAL_DELIVERY_READINESS_REPORT.md`
- **Security & Hardening Controls (Slide 12):** `docs/product-architecture/PHASE_1B_COMPLETION_REPORT.md`, `apps/api/src/auth/`, `apps/api/src/users/discovery.ts`
- **Product Vision, Roles & Roadmap (Slides 3, 4, 8, 15):** `docs/product-architecture/PRODUCT_VISION.md`, `ROLE_EXPERIENCE_BLUEPRINT.md`, `IMPLEMENTATION_ROADMAP.md`
- **Architecture & Database Counts (Slides 11, 13):** `docs/submission/SYSTEM_ARCHITECTURE.md`, `DATABASE_DOCUMENTATION.md`, `apps/api/prisma/schema.prisma`
