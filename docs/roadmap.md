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
