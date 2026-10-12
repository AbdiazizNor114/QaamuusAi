# Prototype verification

Verified locally on Windows with Node 24 and Python 3.11:

- TypeScript checking and ESLint without warnings.
- Next.js optimized production build.
- Nineteen Vitest tests cover the original eight workflow cases plus shared API origin checks, verified-author enforcement, unauthenticated writes, malformed email codes, local-session sign-out, canonical/loopback origin handling and callback validation.
- Fifteen Playwright scenarios retain the ten synthetic-demo scenarios under `/demo/` and add shared anonymous reads/protected routes, mocked-server profile/draft/discussion persistence, independent reviewer controls, mobile/desktop accessibility/error recovery and email-code form errors. Mocked UI sessions are not real authenticated Supabase accounts.
- Axe WCAG 2 A/AA and 2.1 AA checks on the library and all five new workflow pages. Keyboard dialog dismissal/focus restoration and response security headers are checked. Automated scans supplement manual review and do not establish complete accessibility compliance.
- Five embedded PostgreSQL scenarios plus migration setup: private editable drafts and history, elevation/self-review/admin denial, independent approval/publication, preserved corrections/disputes, and permission-pending publication denial.
- Fourteen Python validator tests; the four-record demonstration release validates without errors.
- Desktop/mobile screenshots visually inspected. Public page console checked for runtime errors.

The PostgreSQL tests run both unmodified migrations with PGlite's pgcrypto extension and a mock of Supabase's auth identity contract. They do not test PostgREST, Supabase mail delivery, SSR session refresh, deployment or concurrent server connections. Docker's daemon was unavailable, so no full Supabase instance was started.

With user authorization, the hosted Supabase database migrations were applied transactionally using the signed-in SQL Editor. Verified 13 tables with RLS enabled, nine functions and two audit triggers. All expected tables returned HTTP 200 through PostgREST. The local shared-workspace endpoint returned configured=true and the actual empty published dataset. The exact local authentication callback was added after explicit user approval.

No GitHub push, public app deployment, external account creation, test-email transmission, demo import or AI training was performed. No editorial roles were granted. Credentials were not printed or committed. A pre-existing edited `.env.local.example` containing project credentials was excluded from staging.

Core dataset/profile workflows are connected. End-to-end email delivery, cookie refresh/revocation and authenticated hosted RLS/concurrency await user-assisted sign-in. Scholar/role administration, shared article/release workflows, reviewer assignment/evidence/history UI remain pending. Browser UI checks use mocked-server fixtures for the authenticated cases, while actual anonymous reads and origin/auth rejection checks target the configured project.
