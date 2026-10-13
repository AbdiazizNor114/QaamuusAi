# Prototype verification

Verified locally on Windows with Node 24 and Python 3.11:

- TypeScript checking and ESLint without warnings.
- Next.js optimized production build.
- Twenty-nine Vitest tests cover workflow rules, shared API origin/identity validation, callback handling, community RPC allowlisting/rejection, stored release JSONL/manifest responses and PostgreSQL timestamp compatibility.
- Nineteen Playwright scenarios retain the ten demo cases and add shared dataset/profile flows, email-code errors, scholar decisions, distinct role controls, article publication/corrections, release selection/links and accessibility across mobile/desktop. Authenticated browser cases use mocked server responses, not privileged real accounts.
- Axe WCAG 2 A/AA and 2.1 AA checks on the library and all five new workflow pages. Keyboard dialog dismissal/focus restoration and response security headers are checked. Automated scans supplement manual review and do not establish complete accessibility compliance.
- Ten embedded PostgreSQL scenarios plus migration setup: the original dataset cases plus scholar decisions/audits, role boundaries, private article review/corrections, article disputes/license gates and frozen releases.
- Fourteen Python validator tests; the four-record demonstration release validates without errors.
- Desktop/mobile screenshots visually inspected. Public page console checked for runtime errors.

The PostgreSQL tests run all three migrations with PGlite's pgcrypto extension and a mock of Supabase's auth identity contract. They do not prove hosted session refresh/revocation, deployment or concurrency. Docker's daemon was unavailable for a separate local Supabase stack.

With user authorization, the hosted Supabase database migrations were applied transactionally using the signed-in SQL Editor. Verified 13 tables with RLS enabled, nine functions and two audit triggers. All expected tables returned HTTP 200 through PostgREST. The local shared-workspace endpoint returned configured=true and the actual empty published dataset. The exact local authentication callback was added after explicit user approval.

No GitHub push, public app deployment, external account creation, test-email transmission, demo import or AI training was performed. No editorial roles were granted. Credentials were not printed or committed. A pre-existing edited `.env.local.example` containing project credentials was excluded from staging.

The third migration was applied transactionally after explicit approval of its policy-changing warning. Verified 14 RLS-enabled tables and seven new community functions; user_roles remained empty. The actual public community endpoint returned empty published articles/releases successfully. The user separately confirmed email sign-in and profile/draft persistence across refresh. No privileged account was bootstrapped, no new records were published, and no application roles were granted.

Community workflows are connected; full hosted editorial testing awaits approved independent accounts. Cookie refresh/revocation, concurrency and dataset assignment/evidence/history UI remain pending. Mocked-browser release tests check selection and download links; endpoint unit tests verify frozen response contents/filenames. They do not establish a hosted release download until a real authorized release exists.
