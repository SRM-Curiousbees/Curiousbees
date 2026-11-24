# CuriousBees — Target Social Experience (X-Inspired Academic Model)

**Phase:** Phase 0 — Product Architecture & Experience Blueprint  
**Scope:** Researcher Network interaction design tailored to SRM scholars & supervisors.

---

## 1. Home Feed & Timelines (`/feed`)
* **Three Server-Driven Tabs:**
  * **For you:** Ranked by institutional relevance (direct supervision relationship, shared workspace co-membership, followed authors/domains/topics, same department, engagement & recency).
  * **Following:** Strictly posts/reposts from followed researchers (`UserFollow`) and followed domains/topics (`DomainFollow`, `TopicFollow`). If the user follows none yet, display an actionable empty state with inline "Suggested researchers to follow" cards (instead of silently falling back to global posts).
  * **Discover:** All visible institutional posts (`hidden: false`, active non-suspended authors), filterable by post type (`Updates`, `Papers`, `Questions`, `Collabs`, `Achievements`, `Notices`, `Saved`) and sortable by `Latest` / `Top`.
* **Pagination & Freshness:**
  * Backend returns `{ items, nextCursor, hasMore }` with keyset pagination and a "Load more" control.
  * Lightweight `GET /api/threads/latest-count?since=<iso>` check surfaces a subtle *"N new posts"* pill at the top of the feed without jarring layout shifts.
* **Batch Collaboration Status:** Resolve `collabStatuses` in one batch call per page (`GET /api/collaborations/statuses?userIds=...`) instead of 20 per-card requests.

---

## 2. Composer & Academic Post Types
* **Inline `CompactComposer`:** Fast top-of-feed posting (like X's compose box) supporting:
  * **Academic Post Types:** `Research Update`, `Publication` (optional journal/DOI metadata), `Question`, `Discussion`, `Collaboration Request`, `Achievement`, `Announcement`.
  * **Attachments:** Up to 10 MB images (`.jpg`, `.png`, `.webp`) and research documents (`.pdf`, `.doc`, `.docx`) via presigned S3 upload.
  * **Tags & `@mentions`:** Typing `@` opens a privacy-safe researcher suggestion popover (`id`, `name`, `role`, `department` — never `email` or `INSTITUTE_ADMIN`).

---

## 3. Reposts & Quote-Posts
* **Repost:** One-click amplification of a colleague's or scholar's post onto your followers' timelines without duplicating post content (self-referential `Thread.repostOfId`, partial unique index preventing duplicate pure reposts).
* **Quote-Post:** Opens a compact modal to add scholarly commentary above the embedded original post card.
* **Moderation & Deletion Safety:** If the original post is hidden (`hidden: true`) or deleted, pure reposts disappear from feeds and quote-posts display a neutral *"Original post is unavailable"* placeholder while preserving the quoter's commentary.

---

## 4. Profiles & Social Graph (`/profile`, `/researchers/[id]`)
* **Academic + Social Profile:** Retain the existing academic header, research lifecycle, supervisor/scholar links, publications, and ORCID/Scholar links, and add:
  * **Posts / Replies / Bookmarks (self)** tabs so viewing a researcher's profile shows their feed contributions (like an X profile).
  * **Followers & Following** counts opening a modal/drawer backed by the existing `GET /api/users/:id/followers` and `/following` endpoints.
* **Strict Privacy:** Non-owner profiles use `getPublicProfile` (no `email`, `employeeId`, `supabaseAuthId`, or hidden publications).

---

## 5. Mentions, Search & Trending
* **`@mentions`:** Canonical token storage + `ThreadMention`/`CommentMention` join tables; rendered via pure React tokenization (`<MentionText />`, zero `dangerouslySetInnerHTML`) linking active researchers to `/researchers/[id]` and rendering deleted/suspended users as plain `@Name`.
* **Global Search (`⌘K` `SpotlightSearch` + `/feed?q=`):** Upgrade `SpotlightSearch` to debounce-query `/api/feed/search` (server-side) in addition to instant local matches, covering posts, researchers, publications, opportunities, and events.
* **Trending Research:** Keep `ResearchDiscoverySidebar` showing `Trending Research` tags and `Suggested Peers` with explainable reasons (*"Because you follow Knowledge Graphs"*, *"Same department"*).

---

## 6. Notifications & Collaboration-Aware Messaging (`/notifications`, `/nexus`)
* **Real Notifications (Retiring Mock Simulator):** Remove `PushNotificationPrompt.tsx`'s 15-second fake timer. Use visibility-aware polling (`45s`) of `/api/notifications` for real unread counts, deep-linking to `/feed/:id`, `/researchers/:id`, `/nexus?collab=:id`, or `/my-scholars?tab=requests`.
* **Collaboration-Aware Messaging (`/nexus`):** Keep intentional `ResearchCollabRequest` consent (preventing unsolicited spam), add 8s visibility-aware polling while a conversation is open, and keep seamless escalation into a shared `/workspace/[id]`.

---

## 7. Mobile Experience
* Extend `MobileFeedNav` into a consistent **global mobile bottom bar** across Researcher Network routes (`Home`, `Explore`, `Compose`, `Nexus`, `Alerts`) while keeping Academic Workspace links in the slide-in drawer.
