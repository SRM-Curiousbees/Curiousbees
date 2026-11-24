# CuriousBees — Management Presentation: Slide Content & Speaker Notes

**Deck:** `CuriousBees_Management_Presentation.pptx` (18 Slides, 16:9 Widescreen)

---

### Slide 1 — Cover
- **Key Message:** CuriousBees is an institutional research collaboration ecosystem built specifically for SRMIST.
- **Speaker Notes:** *"Good morning. Today I'm presenting CuriousBees—an institutional academic research social network designed for the SRM ecosystem. It connects Research Scholars, Research Supervisors, and Institutional Leadership in one unified, governed platform."*
- **Transition:** *"Let's begin with the institutional opportunity CuriousBees is built to address."*

### Slide 2 — The Institutional Opportunity
- **Key Message:** Research collaboration often suffers from fragmented communication; CuriousBees provides a unified institutional response.
- **Speaker Notes:** *"Across large universities, early research updates, cross-department peer discovery, and doctoral milestone tracking often happen across disconnected emails and spreadsheets—while public social networks lack institutional privacy and domain control. CuriousBees addresses this target problem space with an invite-only, governed research ecosystem."*
- **Caveat:** Frame these as the platform's intended problem space rather than claiming specific measured institutional failures.

### Slide 3 — The Vision
- **Key Message:** One connected ecosystem uniting Scholars, Supervisors, and Research Leadership.
- **Speaker Notes:** *"Our vision brings three groups together without blurring responsibilities: Scholars share and collaborate; Supervisors mentor and co-create alongside participating in the network; and Leadership governs access, hierarchy, and compliance."*

### Slide 4 — What Is CuriousBees?
- **Key Message:** Three integrated pillars—Researcher Network, Academic Workspace, and Institutional Governance.
- **Speaker Notes:** *"CuriousBees is neither a generic social app nor a traditional ERP. Its primary experience is the Researcher Network, which flows naturally into Academic Workspaces for formal supervision and project execution, all backed by a separate Institutional Governance layer."*

### Slide 5 — Researcher Network
- **Key Message:** Social discovery tailored to academic dialogue.
- **Speaker Notes:** *"The Researcher Network at `/feed` supports 8 academic post types, nested comment threads, likes, bookmarks, domain/topic follows, peer suggestions, and Curious Nexus for consented 1:1 collaboration."*

### Slide 6 — Academic Workspace
- **Key Message:** Social connections transition seamlessly into formal research workflows.
- **Speaker Notes:** *"When researchers connect on the feed, they can move directly into `My Research` for thesis milestones, `/my-scholars` for supervision reviews, private S3-backed `Workspaces`, `Publications`, `Opportunities`, and `Events`."*

### Slide 7 — Institutional Governance
- **Key Message:** Administrative oversight is strictly separated from researcher participation.
- **Speaker Notes:** *"Institute Admins manage provisioning, campus/faculty/department hierarchy, content moderation, announcements, event approvals, and immutable `AuditLog`s. At the API layer, `ResearchParticipantGuard` ensures admins cannot post, react, or join workspaces."*

### Slide 8 — Three Role Experiences
- **Key Message:** Each role has a tailored workflow and explicit guard-enforced boundaries.
- **Speaker Notes:** *"Scholars focus on sharing and doctoral progress; Supervisors participate socially while managing scholar capacity and progress reports; Admins govern the platform neutrally."*

### Slide 9 — A Research Collaboration Journey *(Illustrative)*
- **Key Message:** End-to-end flow from an idea on the feed to a published outcome.
- **Speaker Notes:** *"To illustrate how the pieces fit together: a scholar shares an idea on `/feed`, a peer discovers it, they connect via Nexus, escalate into a private Workspace with S3 files, receive supervisor feedback, and catalogue the publication. Note that this is an illustrative workflow, not a claimed completed research outcome."*

### Slide 10 — Product Experience *(Interface Blueprints)*
- **Key Message:** Overview of the five core application surfaces.
- **Speaker Notes:** *"Here are interface blueprints of our five core routes—Feed, Researcher Profile, Workspace, Supervision Panel, and Admin Command Center. Because live database connectivity is currently pending, these are shown as clean structural blueprints rather than live DB screenshots."*

### Slide 11 — System Architecture
- **Key Message:** Decoupled TypeScript monorepo separating verified application code from planned cloud infrastructure.
- **Speaker Notes:** *"The Next.js 15 frontend proxies `/api/*` to a NestJS 11 REST API backed by Prisma ORM. Supabase Auth, PostgreSQL, Amazon S3, Brevo email, and n8n ingestion are integrated in code and ready for live cloud configuration."*

### Slide 12 — Security & Institutional Control
- **Key Message:** Defense-in-depth enforced at the API and database layers.
- **Speaker Notes:** *"Following our Phase 1A and 1B security hardening, public profiles and feeds strip sensitive PII (`email`, `employeeId`), `hidden` posts are blocked across all secondary endpoints, Events and Publications enforce strict role/ownership checks, and feed reports route into `ModerationReport`."*

### Slide 13 — Technology Foundation
- **Key Message:** Built for long-term maintainability and extensibility.
- **Speaker Notes:** *"Shared monorepo packages keep frontend and backend contracts synchronized, NestJS provides modular DI and Swagger docs, Prisma enforces relational integrity across 54 models, and multi-stage Dockerfiles support containerized deployment."*

### Slide 14 — Current Implementation Status
- **Key Message:** Verified build and unit test passes, with honest disclosure of pending live DB checks.
- **Speaker Notes:** *"Both production builds pass, all 23 API unit test suites (227 passed, 2 skipped) and 3 Web tests pass, TypeScript and ESLint have zero errors, and Prisma validates cleanly. However, database E2E tests were not run locally and live Supabase/AWS deployment is pending—so we present this as staging-ready code pending cloud verification."*

### Slide 15 — Phased Roadmap
- **Key Message:** Clear progression from environment readiness to full X-inspired social depth.
- **Speaker Notes:** *"With Phase 1A/1B complete, our immediate next step is live DB/S3 setup and E2E testing, followed by unified supervisor navigation, server-driven `For You`/`Following` feeds, reposts/quote-posts, `@mentions`, and a controlled department pilot."*

### Slide 16 — Institutional Value *(Intended Benefits)*
- **Key Message:** Strategic benefits targeted for SRMIST upon rollout.
- **Speaker Notes:** *"Once deployed and adopted, CuriousBees is intended to improve research discoverability, cross-campus connections, scholar-supervisor interaction, and institutional visibility—establishing a structured foundation for research intelligence."*

### Slide 17 — Deployment & Rollout Considerations
- **Key Message:** Disciplined 7-step pre-production rollout plan.
- **Speaker Notes:** *"Before opening to all researchers, we recommend completing production env configuration, Supabase migrations, private S3 bucket policies, security policy sign-off on public links, full E2E testing, and a single-department pilot."*

### Slide 18 — Closing
- **Key Message:** Connecting Research. Empowering Collaboration. Building an Institutional Research Ecosystem.
- **Speaker Notes:** *"Thank you for your time. We welcome management's feedback on the rollout plan and pilot cohort selection."*
