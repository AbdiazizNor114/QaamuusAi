# Prototype verification

## Session and recovery audit (October 16, 2026)

Controlled tests verify Proxy cookie refresh forwarding, rejected-refresh cookie removal, expiry classification versus provider outages, and rejection before private workspace queries. Browser coverage checks that a 401 during a write or background refresh clears privileged navigation and password fields and offers sign-in. Recovery callback exceptions redirect safely rather than returning HTTP 500; callbacks are not cacheable. Existing tests cover recovery fragments, expired links, origin checks, account-existence-neutral responses and provider email limits.

This audit sent no recovery emails, changed no passwords, and modified no hosted session settings. Actual SMTP delivery, single-use recovery links and server-side revocation across independent hosted sessions still require a user-controlled integration test. Synthetic cookie/token fixtures do not establish those hosted behaviors.

Verified locally on Windows with Node 24 and Python 3.11:

- TypeScript checking and ESLint without warnings.
- Next.js optimized production build.
- Forty-three Vitest tests cover workflow rules, shared API validation, community RPC boundaries, evidence authorship, reviewer-assignment API authority, release responses/timestamps, password sign-in/setup, recovery callback routing and access-token validation before session establishment.
- Twenty-seven browser scenarios cover shared workflows, evidence/history, reviewer selection, draft preservation during background refresh, outdated-response rejection, password setup/recovery, email-rate-limit feedback, responsive accessibility and a real HTTP auth-callback regression against native Next.js requests. Authenticated cases use mocked responses; no real recovery tokens or passwords were used.
- Axe WCAG 2 A/AA and 2.1 AA checks on the library and all five new workflow pages. Keyboard dialog dismissal/focus restoration and response security headers are checked. Automated scans supplement manual review and do not establish complete accessibility compliance.
- Eleven embedded PostgreSQL scenarios plus migration setup: the original dataset cases plus independent reviewer assignment/audit, scholar decisions/audits, role boundaries, private article review/corrections, article disputes/license gates and frozen releases.
- Fourteen Python validator tests; the four-record demonstration release validates without errors.
- Desktop/mobile screenshots visually inspected. Public page console checked for runtime errors.

The PostgreSQL tests run all four migrations with PGlite's pgcrypto extension and a mock of Supabase's auth identity contract. All four migrations are applied to the hosted project. The fourth was applied transactionally after explicit approval on October 15, 2026; verification confirmed the security-definer function exists, anonymous execution is denied and authenticated execution is granted subject to its editor/independence checks. No real submission was assigned by this verification. Tests do not prove hosted session refresh/revocation, deployment or database concurrency. Docker's daemon was unavailable for a separate local Supabase stack.

With user authorization, the hosted Supabase database migrations were applied transactionally using the signed-in SQL Editor. Verified 13 tables with RLS enabled, nine functions and two audit triggers. All expected tables returned HTTP 200 through PostgREST. The local shared-workspace endpoint returned configured=true and the actual empty published dataset. The exact local authentication callback was added after explicit user approval.

No GitHub push, public app deployment, external account creation, test-email transmission, demo import or AI training was performed. No editorial roles were granted. Credentials were not printed or committed. A pre-existing edited `.env.local.example` containing project credentials was excluded from staging.

The third migration was applied transactionally after explicit approval of its policy-changing warning. Verified 14 RLS-enabled tables and seven new community functions; user_roles remained empty. The actual public community endpoint returned empty published articles/releases successfully. The user separately confirmed email sign-in and profile/draft persistence across refresh. No privileged account was bootstrapped, no new records were published, and no application roles were granted.

Subsequently, the owner explicitly approved founding editor and technical-admin roles for their verified account; both grants and bootstrap audit records were verified. No unrelated accounts were elevated. Auth logs later confirmed HTTP 429 email-rate-limit errors. At the user's request, the default sign-in UI switched to email/password without lowering email limits or sending new test messages. Password setup is user-entered only; no real password was set by the agent. Hosted password login awaits the user's own password setup/test.

Community workflows are connected; full hosted editorial testing awaits approved independent accounts. Evidence, review decisions and read-only revision snapshots are connected; assignment awaits the approved fourth migration. Browser tests verify preserved historical wording and citations. Cookie refresh/revocation and database concurrency remain pending. Mocked-browser release tests check selection and download links; endpoint unit tests verify frozen response contents/filenames. They do not establish a hosted release download until a real authorized release exists.
# Term Claims Hosted Verification, 17 October 2026

After explicit user approval, applied `202610170001_terminology_claims.sql` in a transaction using the Supabase SQL editor for project `snuvwxygrawpjwommeve`. The UI reported success. Read-only verification confirmed 1,000 starter IDs, zero active claims, RLS enabled, anonymous list/claim execution denied, authenticated claim execution enabled, direct authenticated table writes denied, and all three claim functions security-definer. Role checks and owner-only/stale-release behavior were verified in the local database suite (13 tests), not by creating hosted test claims. No roles, review decisions or existing data were changed.

