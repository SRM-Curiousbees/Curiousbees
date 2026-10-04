# Institutional email → CuriousBees events (n8n)

This guide sets up the workflow that reads event announcements sent to
**curiousbees@srmist.edu.in** and puts them on the CuriousBees calendar. It is
written for someone doing this for the first time; follow the steps in order.

> **Status:** built and tested locally only. Nothing in production (AWS, the
> production database, Gmail, Gemini or n8n) has been configured. Production
> setup needs explicit approval first.

---

## Contents

1. [What it does](#1-what-it-does)
2. [What you need](#2-what-you-need)
3. [Step 1: Turn the integration on in CuriousBees](#3-step-1-turn-the-integration-on-in-curiousbees)
4. [Step 2: Create the Gmail credential in n8n](#4-step-2-create-the-gmail-credential-in-n8n)
5. [Step 3: Get a Gemini API key and add it to n8n](#5-step-3-get-a-gemini-api-key-and-add-it-to-n8n)
6. [Step 4: Add the CuriousBees token to n8n](#6-step-4-add-the-curiousbees-token-to-n8n)
7. [Step 5: Import the workflow](#7-step-5-import-the-workflow)
8. [Step 6: Set the CuriousBees API address](#8-step-6-set-the-curiousbees-api-address)
9. [Step 7: Test with one email](#9-step-7-test-with-one-email)
10. [Step 8: Activate the workflow](#10-step-8-activate-the-workflow)
11. [What gets published, and what waits for review](#11-what-gets-published-and-what-waits-for-review)
12. [How duplicate protection works](#12-how-duplicate-protection-works)
13. [How AI use is kept low](#13-how-ai-use-is-kept-low)
14. [Reviewing emails in the Event Inbox](#14-reviewing-emails-in-the-event-inbox)
15. [Troubleshooting](#15-troubleshooting)
16. [Security and privacy](#16-security-and-privacy)
17. [Rotating the token](#17-rotating-the-token)
18. [For developers](#18-for-developers)

---

## 1. What it does

```text
Gmail (curiousbees@srmist.edu.in)
   │  n8n polls every 5 minutes; attachments are never downloaded
   ▼
Normalize email ── plain text, links kept next to their labels, list of every link
   ▼
Already processed? ── asks CuriousBees; emails it has handled stop here (no AI cost)
   ▼
Candidate filter ── simple rules, no AI: does this look like an event announcement?
   │ no ─────────────────────────────► Record skipped email (counted, never re-processed)
   ▼ yes
Gemini 2.5 Flash ── strict JSON: title, date, time, venue, links, confidence…
   │ failed (quota, network) ─────────► Record skipped email as "AI failed" (retryable)
   ▼
Parse + validate ── malformed answers are rejected, never repaired by guessing
   ▼
CuriousBees API ── checks again, de-duplicates, decides, and either
                   publishes the event or puts it in Admin → Event Inbox
```

Important rules:

- **CuriousBees is the source of truth.** n8n only reports what it read. Every
  decision, duplicate check and database write happens inside CuriousBees, using
  the normal events service. There is no second calendar or event database.
- **n8n never touches the database.** It talks only to three CuriousBees HTTPS
  endpoints, authenticated with a dedicated machine token.
- **Nothing is invented.** A missing date, time, venue or link stays empty. An
  email without a reliable date and start time is never published automatically.
  Links are only kept if they really appear in the email.
- **Only likely events reach Gemini.** Most email never costs an AI call.
- **No Google Calendar sync.** The workflow does not create Google Calendar
  events; CuriousBees' own calendar shows the event to everyone with access.

## 2. What you need

| You need | Why |
| --- | --- |
| An n8n instance (n8n Cloud or self-hosted, version 1.x) that can reach the CuriousBees API over HTTPS | Runs the workflow |
| Sign-in access to the **curiousbees@srmist.edu.in** Google account | The workflow reads this mailbox |
| A Google Cloud project (for the Gmail sign-in, and for the Gemini key) | Google requires it |
| Access to the CuriousBees server configuration | To set the integration token |
| An Institute Admin account in CuriousBees | To review emails in the Event Inbox |

## 3. Step 1: Turn the integration on in CuriousBees

The integration is **off** until a token is configured: every request gets
`503 Event ingestion is not configured`.

1. Generate a long random token on your computer:

   ```bash
   openssl rand -hex 32
   ```

   Copy the 64-character result. Treat it like a password.

2. Put it in the **API server's** environment, never in the web app:

   | Where the API runs | Where the token goes |
   | --- | --- |
   | Local development | The repository's root `.env` file: `N8N_INTEGRATION_TOKEN=<token>` |
   | Production (AWS) | An encrypted parameter (SSM SecureString) referenced by the API task definition. **Not set up yet; needs approval.** |

   Never put it in a `NEXT_PUBLIC_*` variable, in git, in the workflow file or
   in a document.

3. Choose who may publish automatically. Add the institution's domain:

   ```text
   EVENT_INGESTION_TRUSTED_SENDERS=srmist.edu.in
   ```

   Entries are domains (subdomains such as `ktr.srmist.edu.in` are included) or
   exact addresses, separated by commas. If this is empty, **nothing is
   published automatically**: every event waits for an admin in the Event Inbox.
   That is a safe way to start.

4. Apply the database migration (`20261001000000_event_email_ingestion`). In
   production this is part of the normal release (`prisma migrate deploy`); it
   only adds columns and a table.

5. Restart the API, then check it answers (replace the address with yours):

   ```bash
   read -rs CB_TOKEN   # paste the token, press Enter (it won't be shown or saved in history)
   curl -s -X POST https://srmcuriousbees.in/api/integrations/n8n/events/check \
     -H "Authorization: Bearer $CB_TOKEN" -H "Content-Type: application/json" \
     -d '{"messageId":"connection-test"}'
   ```

   Expected answer: `{"processed":false}`. A `401` means the token doesn't
   match; a `503` means the server has no valid token (at least 32 characters).

## 4. Step 2: Create the Gmail credential in n8n

The **Client secret** from Google goes only into n8n's credential store.

**If you use n8n Cloud** and your credential dialog offers **Sign in with
Google** without asking for a client ID, you can use that and skip to step 6 of
this list.

Otherwise:

1. Open the [Google Cloud Console](https://console.cloud.google.com/) with an
   account that can create projects, and create or choose a project (for
   example "CuriousBees automations").
2. **APIs & Services → Library →** search **Gmail API → Enable**.
3. **APIs & Services → OAuth consent screen.**
   - If the project belongs to the srmist.edu.in Google Workspace organisation,
     choose **Internal**. This is the best option.
   - Otherwise choose **External** and add `curiousbees@srmist.edu.in` as a test
     user. Note that Google expires sign-ins of apps left in "Testing" after
     about a week, so the workflow would stop until you sign in again. Publish
     the app, or use an Internal project, for long-term use.
   - Your Workspace administrator may need to allow the app.
4. In n8n: **Credentials → Create credential → Gmail OAuth2 API.** Keep the
   dialog open and copy the **OAuth Redirect URL** it shows.
5. Back in Google: **APIs & Services → Credentials → Create credentials → OAuth
   client ID → Web application.** Paste the redirect URL under **Authorized
   redirect URIs**, then create. Copy the **Client ID** and **Client secret**.
6. In n8n's Gmail credential: paste the client ID and secret, click **Sign in
   with Google**, and sign in **as curiousbees@srmist.edu.in**. Approve access.
7. Name the credential **CuriousBees Gmail (curiousbees@srmist.edu.in)** and save.

n8n's Gmail credential asks Google for broad Gmail access. This workflow only
reads new messages; it never sends, labels or deletes mail.

## 5. Step 3: Get a Gemini API key and add it to n8n

1. Go to [Google AI Studio](https://aistudio.google.com/) → **Get API key →
   Create API key**, and pick a Google Cloud project.
2. Use a project **with billing enabled**. Google's terms allow prompts sent on
   the free (unpaid) tier to be used to improve its products, which isn't
   appropriate for institutional email. Check the current
   [Gemini API terms](https://ai.google.dev/gemini-api/terms) and
   [pricing](https://ai.google.dev/pricing) before going live.
3. Restrict the key: in the Cloud Console, **APIs & Services → Credentials →**
   your key → **API restrictions → Restrict key → Generative Language API**.
   Optionally set a budget alert on the project.
4. In n8n: **Credentials → Create credential → Header Auth**:
   - **Name:** `x-goog-api-key`
   - **Value:** the API key
   - Save it as **Gemini API key**.

The key never goes into CuriousBees, `.env`, git or the workflow file.

## 6. Step 4: Add the CuriousBees token to n8n

In n8n: **Credentials → Create credential → Header Auth**:

- **Name:** `Authorization`
- **Value:** `Bearer ` followed by the token from step 1 (the word `Bearer`, one
  space, then the token)
- Save it as **CuriousBees API token**.

## 7. Step 5: Import the workflow

1. In n8n: **Workflows → Add workflow → … menu → Import from File**, and choose
   `integrations/n8n/event-ingestion/workflow.json` from this repository.
2. The workflow is imported **inactive**. It contains no secrets and no real
   credential IDs; credential slots show placeholders until you choose yours.
3. Open each node that shows a credential warning and select:

   | Node | Credential |
   | --- | --- |
   | Gmail Trigger | CuriousBees Gmail (curiousbees@srmist.edu.in) |
   | Already processed? | CuriousBees API token |
   | Send to CuriousBees | CuriousBees API token |
   | Record skipped email | CuriousBees API token |
   | Gemini 2.5 Flash | Gemini API key |

4. Save the workflow.

## 8. Step 6: Set the CuriousBees API address

Open the **Workflow settings** node. It is the only place to edit:

```js
apiBaseUrl: 'https://YOUR-CURIOUSBEES-API-HOST/api',
```

Set it to your API address **including `/api` and without a trailing slash**:

| Environment | apiBaseUrl |
| --- | --- |
| Production (once approved) | `https://srmcuriousbees.in/api` |
| API on your computer, n8n in Docker on the same computer | `http://host.docker.internal:4000/api` |
| API on your computer, n8n installed directly | `http://localhost:4000/api` |

The same node has optional settings:

| Setting | Default | Meaning |
| --- | --- | --- |
| `geminiModel` | `gemini-2.5-flash` | The model used for candidate emails |
| `minCandidateScore` | `4` | Pre-filter threshold. Higher means fewer AI calls but more missed events |
| `maxBodyChars` | `12000` | Longest email text sent to Gemini; longer emails are shortened |
| `trustedSenderDomains` | `['srmist.edu.in']` | Raises the pre-filter score for these senders (publishing is decided by `EVENT_INGESTION_TRUSTED_SENDERS` on the API) |

Until `apiBaseUrl` is set, the workflow stops with "Open the Workflow settings
node and set apiBaseUrl…".

## 9. Step 7: Test with one email

1. From an `@srmist.edu.in` address, send this to curiousbees@srmist.edu.in
   (use a date a few weeks ahead):

   ```text
   Subject: Invitation: Seminar on Research Data Management

   Dear Scholars,
   The Directorate of Research invites you to a seminar on research data management.
   Date: 20 November 2026
   Time: 10:30 AM – 12:00 PM
   Venue: Mini Hall 2, TP Ganesan Auditorium
   Register: https://forms.gle/your-real-form
   ```

2. In n8n, open the **Gmail Trigger** node and click **Fetch test event**. It
   should show your email.
3. Click **Test workflow** (or **Execute workflow**). Click each node to see what
   it produced:
   - **Normalize email:** readable `text` and the `urls` list.
   - **Candidate filter:** `candidate: true`, a `score` and the `signals` that fired.
   - **Gemini 2.5 Flash:** the JSON answer.
   - **Send to CuriousBees:** `"status": "created"`, or `"review_required"` with the reasons.
4. In CuriousBees, sign in as an Institute Admin and open **Admin → Event
   Inbox**. The email is listed with its outcome. As a scholar or supervisor,
   open **Events** and find it on the calendar.
5. Click **Test workflow** again. The email now stops at **Already processed?**,
   and nothing is created twice.
6. Optional: forward a newsletter or a password-reset email. It should go to
   **Record skipped email** without reaching Gemini.

## 10. Step 8: Activate the workflow

Click the **Active** toggle. n8n then checks the mailbox every 5 minutes. Only
mail that arrives after activation is processed; older mail is ignored.

To pause, switch it off. Emails that arrive while it is off may not be picked
up afterwards. After a pause, check the Event Inbox, and forward any missed
announcements to the mailbox again. Forwarding is safe: duplicates are detected.

## 11. What gets published, and what waits for review

CuriousBees decides, never n8n:

| Outcome | When |
| --- | --- |
| **Published** to the calendar | Gemini is at least 90% confident it is an event, the title, date and start time are all stated, the sender is on `EVENT_INGESTION_TRUSTED_SENDERS`, every link appears in the email, the year was written, the date is today or later and within two years, and the end is after the start |
| **Needs review** (Event Inbox) | It is an event (confidence 70% or more) but any rule above fails |
| **Not an event** | Gemini says it isn't an event, or is less than 70% confident |
| **Duplicate** | The same email was already handled, or an event with the same title, date and start time already exists |
| **Filtered out** | The cheap pre-filter rejected it; Gemini was never called |
| **AI failed** | Gemini could not be reached, or answered in the wrong format. Retryable |

Published events appear for everyone who can see the calendar, exactly like
events posted from the form. The time is stored the same way
(`10:30 AM - 12:00 PM`), the timezone defaults to Asia/Kolkata when the email
doesn't name one, and the source is recorded (`source=email`,
`createdBy=n8n`, the Gmail message and thread IDs).

## 12. How duplicate protection works

- **Same email twice** (n8n retries, restarts, re-runs): every request carries
  the Gmail message ID, which is unique in CuriousBees. The **Already
  processed?** check stops handled emails before any AI call. If two copies
  still arrive together, the database's unique constraint lets only one create
  an event; the other is answered as a duplicate. Retrying any step is
  therefore safe.
- **Same event in different emails** (forwards, reminders, "Re:"): before
  creating an event, CuriousBees looks for one on the same date at the same
  start time with the same (or nearly the same) title and organiser. This
  includes events posted from the form. A match is recorded as a duplicate.
- **AI failures** are the one retryable state: once the problem is fixed,
  re-running the failed execution processes the email normally.

## 13. How AI use is kept low

1. **Already processed?** stops emails CuriousBees has seen, before anything else.
2. **Candidate filter** scores every email with simple rules and no AI:
   - **Points for:** event words in the subject or body, a date, a time, a
     venue, a Meet, Zoom or Teams link, a registration form, a calendar invite,
     and a trusted sender.
   - **Points against:** invoices, promotions, social notifications, bulk mail
     and no-reply senders.
   - **Always rejected:** password resets, OTPs, bounces, auto-replies and
     calendar responses.

   Only emails scoring at least `minCandidateScore` reach Gemini.
3. Gemini receives a shortened, plain-text version of the email: no headers, no
   recipients and no attachments, at most `maxBodyChars` characters.
4. The request uses temperature 0, a strict JSON schema, a 1,024-token answer
   limit and **no "thinking" tokens**.
5. The Event Inbox shows, for the last 30 days, how many emails arrived, how
   many the filter removed, how many Gemini read and the tokens used. That's
   enough to estimate cost from Google's pricing page.

To spend even less, raise `minCandidateScore` or lower `maxBodyChars`.

## 14. Reviewing emails in the Event Inbox

**Admin → Event Inbox** (Institute Admins only):

- The top row shows the last 30 days: emails received, filtered out, read by
  AI, published, awaiting review, and tokens.
- **Needs review** lists emails the workflow wasn't sure about, with the
  reasons. Click **Review**, check the details against the original email in
  Gmail, fill in only what the email states, and click **Publish event**.
  Publishing still requires a title, a date and a start time, and still refuses
  duplicates.
- **Dismiss** removes an email from the queue without creating an event.
- Every publish and dismiss is recorded in the Audit Center.

## 15. Troubleshooting

| What you see | Likely cause | What to do |
| --- | --- | --- |
| Workflow stops at **Normalize email**: "set apiBaseUrl" | The API address is still the placeholder | Step 6 |
| **Already processed?** fails with 401 | Token mismatch, or the credential value lacks `Bearer ` | Re-enter the credential value as `Bearer <token>`; check the server's `N8N_INTEGRATION_TOKEN` |
| 503 "Event ingestion is not configured" | The API has no token, or it is shorter than 32 characters | Step 1, then restart the API |
| 400 "Invalid request: source.urls" | An older workflow version | Re-import `workflow.json` |
| Connection refused or timeout to CuriousBees | Wrong `apiBaseUrl`, or n8n can't reach the API | Check the address; from Docker use `host.docker.internal` |
| **Gemini failed**; the Event Inbox shows "AI failed" | Invalid key, API not enabled, quota or rate limit | Fix the key or quota, then **Executions →** the failed run **→ Retry** |
| Every event goes to **Needs review** | `EVENT_INGESTION_TRUSTED_SENDERS` is empty, or the sender isn't listed | Check the reasons shown in the inbox; add the domain if appropriate |
| An event email was **Filtered out** | Its score was below `minCandidateScore` | Look at the `signals` in the execution; lower the threshold slightly, or ask senders to include the date, time and venue |
| Nothing happens at all | The workflow is inactive, or the Gmail sign-in expired | Activate it; open the Gmail credential and sign in again |
| "Duplicate" for a genuinely new event | Same title, date and start time as an existing event | Check the existing event; if both are needed, publish the second from the inbox with a distinguishing title |

Failed n8n executions are kept so they can be retried. Retrying is always safe
(see section 12).

## 16. Security and privacy

- **Credentials:** the Gmail OAuth secret, the Gemini key and the CuriousBees
  token live only in n8n's encrypted credential store, plus the token in the
  API's server environment. The workflow file contains none of them, and no
  `NEXT_PUBLIC_*` variable is involved.
- **Separation:** n8n can only call three integration endpoints. It cannot read
  or change anything else in CuriousBees and never connects to PostgreSQL. The
  token isn't a user session and can't be used to sign in.
- **What CuriousBees stores** per email:
  - sender address
  - subject
  - received time
  - outcome and reasons
  - the extracted event fields
  - AI model and token counts

  It does **not** store the email body or attachments.
- **Logs** contain metadata only (message ID, outcome, confidence, token counts),
  never the email text or credentials.
- **n8n execution data:** successful runs aren't saved. Failed runs are saved
  so they can be retried, and they contain the email text, so set n8n's
  execution pruning (for example, delete after 14 days).
- **Gemini** receives only candidate emails' text, sender and subject. The
  prompt tells it to treat the email as data and ignore instructions inside it.
  Whatever it answers is then checked by CuriousBees: links must appear in the
  email, dates and times must be explicit, and nothing publishes below 90%
  confidence or from untrusted senders.

## 17. Rotating the token

1. Generate a new token (`openssl rand -hex 32`).
2. On the API, set `N8N_INTEGRATION_TOKEN_PREVIOUS` to the **old** token and
   `N8N_INTEGRATION_TOKEN` to the **new** one; restart. Both now work.
3. Update the **CuriousBees API token** credential in n8n with the new value.
4. Remove `N8N_INTEGRATION_TOKEN_PREVIOUS` and restart.

## 18. For developers

| Path | What |
| --- | --- |
| `integrations/n8n/event-ingestion/src/` | The Code-node logic: `normalize-email.js`, `candidate-filter.js`, `gemini-request.js`, `parse-gemini.js`, `payloads.js` |
| `integrations/n8n/event-ingestion/build-workflow.js` | Generates `workflow.json` from `src/`. Run it after any change; CI fails if the file is stale |
| `integrations/n8n/event-ingestion/test/` | `node:test` suites with Gmail fixtures and mocked Gemini answers. They also run every Code node as n8n would. The network is blocked |
| `apps/api/src/event-ingestion/` | Endpoints, token guard, decision rules, duplicate checks, admin review |
| `apps/web/src/app/(portal)/admin/event-inbox/` | The Event Inbox page |

API endpoints:

| Method and path | Auth | Purpose |
| --- | --- | --- |
| `POST /api/integrations/n8n/events/check` | Integration token | Has this Gmail message been handled? |
| `POST /api/integrations/n8n/events` | Integration token | Submit one extracted email |
| `POST /api/integrations/n8n/events/skipped` | Integration token | Record a filtered-out email or an AI failure |
| `GET /api/admin/event-ingestion?status=&page=` | Institute Admin | List processed emails |
| `GET /api/admin/event-ingestion/stats?days=30` | Institute Admin | Counts and token usage |
| `POST /api/admin/event-ingestion/:id/approve` | Institute Admin | Complete and publish a reviewed email |
| `POST /api/admin/event-ingestion/:id/dismiss` | Institute Admin | Dismiss a reviewed email |

Tests (none of them call Gemini, Gmail or any other external service):

```bash
npm run test:n8n                       # workflow logic and workflow.json
npm test                               # API unit tests
docker compose -f docker-compose.test.yml up -d
cd apps/api && E2E_DATABASE_URL="postgresql://cbtest:cbtest_local_only@127.0.0.1:55432/curiousbees?schema=public" \
  E2E_S3_ENDPOINT=http://127.0.0.1:59000 npm run test:e2e   # includes a contract test using the workflow's own code
```

The integration suite resets its database, so it refuses to run against
anything except the disposable test database above.
