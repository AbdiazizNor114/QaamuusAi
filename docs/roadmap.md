# qaamuusAi prototype phases

1. Foundation: pnpm monorepo, shared validation, Next.js and development scripts.
2. Data and authority: PostgreSQL migrations, RLS, revision history and controlled roles.
3. Workflows: local demonstration submissions, reviews, disputes and publication; authenticated API for shared data.
4. Interface: datasets, articles, contribution workspace, review queue and administration.
5. Data quality: demonstration JSONL, Python validator and approved export rules.
6. Verification: TypeScript, lint, unit tests, browser workflows and production build.

All six phases have been implemented for the local prototype. Shared authentication and the server API are foundations for the next integration phase; the working interface uses synthetic browser-local data.

No external accounts, deployment, real personal data or AI training are part of this prototype.
Production readiness requires applying and testing migrations in a local Supabase instance, scholar approval of governance, accessibility review and real integration tests.

## Follow-on phases

1. Supabase shared persistence and authentication: **core dataset integration implemented**. The two migrations were applied to the authorized project; public dataset reads, verified cookie sessions, profile setup, draft/edit/correction, independent review/publication, comments and dispute resolution use the shared API. Real email sign-in and multiple authenticated users still need verification. No sample data or roles were imported. Additional scholar/role/article/release endpoints remain pending.
2. Onboarding and roles: **local prototype complete**. Synthetic profiles, scholar applications, independent acceptance/decline, combined roles and audited grants/revocations.
3. Editorial workflows: **local prototype complete**. Reviewer assignment, persistent discussion, evidence and resolution history. Native shared persistence remains part of phase 1.
4. Articles and releases: **local prototype complete**. Article draft/edit/review/publication/correction and immutable dataset releases with JSONL/license-manifest downloads.
5. Readiness checks: **local prototype complete**. Persistent Somali/English interface, automated accessibility checks, keyboard dialogs, security headers, origin rejection tests and invalid-save recovery. Real authentication/security integration and scholar language review remain pending.
