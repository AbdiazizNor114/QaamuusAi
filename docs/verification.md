# Prototype verification

Verified locally on Windows with Node 24 and Python 3.11:

- TypeScript checking and ESLint without warnings.
- Next.js optimized production build.
- Three Vitest workflow tests: role boundaries, complete correction lifecycle and export/rationale rules.
- Four Playwright scenarios: correction through publication, mobile search, dispute evidence and resolution, and all eleven pages at 320px / 1440px widths with JSONL download.
- Five embedded PostgreSQL scenarios plus migration setup: private editable drafts and history, elevation/self-review/admin denial, independent approval/publication, preserved corrections/disputes, and permission-pending publication denial.
- Fourteen Python validator tests; the four-record demonstration release validates without errors.
- Desktop/mobile screenshots visually inspected. Public page console checked for runtime errors.

The PostgreSQL tests run both unmodified migrations with PGlite's pgcrypto extension and a mock of Supabase's auth identity contract. They do not test PostgREST, Supabase mail delivery, SSR session refresh, deployment or concurrent server connections. Docker's daemon was unavailable, so no full Supabase instance was started.

No GitHub push, public deployment, external account creation, personal-data collection or AI training was performed.
