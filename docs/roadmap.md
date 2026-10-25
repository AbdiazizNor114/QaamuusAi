# qaamuusAi prototype phases

1. Foundation: pnpm monorepo, shared validation, Next.js and development scripts.
2. Data and authority: PostgreSQL migrations, RLS, revision history and controlled roles.
3. Workflows: authenticated submissions, independent reviews, disputes and publication.
4. Interface: datasets, articles, contribution workspace, review queue and administration.
5. Data quality: Python validator, isolated test fixtures and approved export rules.
6. Verification: TypeScript, lint, unit tests, browser workflows and production build.

All six original phases have been implemented. The public catalog and authenticated workspace use Supabase; the old browser-local sandbox and its sample language data have been removed.

No app deployment, agent-created external accounts or AI training are part of this prototype. Users can sign in and store their own profiles/proposals in the authorized Supabase project.
Production readiness requires applying and testing migrations in a local Supabase instance, scholar approval of governance, accessibility review and real integration tests.

## Follow-on phases

1. Supabase shared persistence and authentication: **core integration implemented**. Three migrations were applied after authorization. The user confirmed sign-in and profile/draft persistence. Privileged hosted workflows, session revocation and concurrent authenticated users still need verification; no sample data or roles were imported.
2. Onboarding and roles: **shared implementation complete**. Profiles, scholar applications, independent acceptance/decline, combined roles and audited grants/revocations use server RPCs and RLS. The owner approved founding editor/admin appointments; unrelated accounts were not elevated.
3. Editorial workflows: **shared evidence and decision history implemented**. Source-backed dispute evidence and review decisions are connected to existing database policies. Independent reviewer assignment has a locally tested fourth migration and UI/API; approved hosted application is pending the browser connection. Background refresh preserves active form input and ignores outdated responses.
4. Articles and releases: **shared implementation complete**. Private article proposals, independent review/publication/correction, dispute decision history and frozen dataset releases with JSONL/license-manifest downloads use server authority. Authenticated browser tests use synthetic mocked responses, supplemented by database permission tests.
5. Readiness checks: **local prototype complete**. Persistent Somali/English interface, automated accessibility checks, keyboard dialogs, security headers, origin rejection tests and invalid-save recovery. Real authentication/security integration and scholar language review remain pending.

## Developer speech foundation preparation

The [contributor preparation pack](contributors/README.md) defines onboarding, ten starter tasks, proposed text/speech standards, audio consent and collection procedures, researched model baselines and a three-month pilot budget. This prepares work; it does not mark collection, training, funding or public speech releases complete.
