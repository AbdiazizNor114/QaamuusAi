# Prototype verification

Verified locally on Windows with Node 24 and Python 3.11:

- TypeScript checking and ESLint without warnings.
- Next.js optimized production build.
- Eight Vitest workflow tests: role boundaries, complete correction lifecycle, exports, independent scholar decisions, immutable article/release history, reviewer assignments and schema-validated legacy-save restoration.
- Ten Playwright scenarios: dataset contribution/review/publication, mobile search, disputes, all original routes, onboarding/scholar decisions, article publication, release downloads, Somali preference/narrow layouts, accessibility/API origin protection, and reviewer discussions/save recovery.
- Axe WCAG 2 A/AA and 2.1 AA checks on the library and all five new workflow pages. Keyboard dialog dismissal/focus restoration and response security headers are checked. Automated scans supplement manual review and do not establish complete accessibility compliance.
- Five embedded PostgreSQL scenarios plus migration setup: private editable drafts and history, elevation/self-review/admin denial, independent approval/publication, preserved corrections/disputes, and permission-pending publication denial.
- Fourteen Python validator tests; the four-record demonstration release validates without errors.
- Desktop/mobile screenshots visually inspected. Public page console checked for runtime errors.

The PostgreSQL tests run both unmodified migrations with PGlite's pgcrypto extension and a mock of Supabase's auth identity contract. They do not test PostgREST, Supabase mail delivery, SSR session refresh, deployment or concurrent server connections. Docker's daemon was unavailable, so no full Supabase instance was started.

No GitHub push, public deployment, external account creation, personal-data collection or AI training was performed.

Supabase configuration and connection work remain paused. New community workflows are browser-local prototype features; real authentication, server enforcement for those new workflows and multi-user persistence are pending integration.
