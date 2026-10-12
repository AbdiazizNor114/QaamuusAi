# qaamuusAi

A local prototype for a community-governed Somali language commons. It contains a Next.js App Router application, shared TypeScript schemas, Supabase migrations and a Python JSONL validator. Project branding is **qaamuusAi**; package identifiers use lowercase `qaamuusai`.

## Run locally

Requires Node.js 22+ (verified here with Node 24), pnpm 11 and Python 3.11+.

```powershell
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000. With Supabase configured, the main interface loads shared datasets and authenticated profiles, submissions, reviews, comments and disputes. Without configuration it defaults to the synthetic demo. The isolated demo is always available at `/demo/dashboard`; its proposals, decisions and role changes stay in browser local storage. Demo roles never authorize shared operations. Do not put real personal or unpublished contributor data into the demo.

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:db
pnpm build
pnpm --filter @qaamuusai/web exec playwright install chromium
pnpm test:e2e
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r tools/dataset-validator/requirements.txt
.venv\Scripts\python.exe -m pytest tools/dataset-validator -q
.venv\Scripts\python.exe tools/dataset-validator/validator.py datasets/demo/v0.1.jsonl --published-only
```

## Prototype features

- Dataset collection filters, word search, record details and JSONL exports.
- Draft proposals, corrections, editing, independent reviews, changes requested, rejection, disputes, evidence and editor-led publication.
- Preserved published versions and per-decision snapshots in demo history.
- Dashboard, submissions, review queue, disputes, operational administration, project articles, about, contribution and sign-in pages.
- Profiles, scholar applications, independent application decisions and audited grants/revocations with combined roles.
- Reviewer assignments, persistent discussions, evidence and editor resolution histories.
- Article drafts, revisions, independent review, publication and separately proposed corrections.
- Immutable versioned dataset releases, JSONL downloads and per-entry licensing/attribution manifests.
- English/Somali interface labels, editorial controls and project copy with a persistent language preference. Contributed content retains its original language; Somali copy needs scholar review.
- Keyboard focus handling, automated accessibility checks, security headers and recovery copies for invalid browser saves.
- Authenticated API foundation and database-enforced authorization for shared submissions and reviews.
- Pydantic validator for schema, types, duplicate IDs, missing fields, provenance, licensing, encoding and release eligibility.

## Structure

```text
apps/web/
  src/app/               App Router pages, authentication and API routes
  src/components/        Interactive demo workspace
  src/lib/               Workflow engine and server Supabase client
  tests/                 Vitest and Playwright verification
packages/schemas/        Zod entry schema and workflow permission rules
packages/sdk/            Future SDK placeholder
datasets/demo/           Versioned, unverified CC0 examples
tools/dataset-validator/ Python validator and tests
supabase/migrations/     Tables, RLS, transactional workflow and history
docs/                    Architecture, governance, data, security, roadmap
.github/workflows/       CI checks
```

## Optional Supabase configuration

Use an existing authorized Supabase project or a local Supabase instance. Do not create an external account or deploy as part of this prototype.

1. With Docker running and the Supabase CLI installed, run `supabase init` and `supabase start` in this repository. Then `supabase db reset` applies the migrations to the local development database. Reset deletes only the selected local development database contents; use an empty instance.
2. For an existing shared project, apply the numbered SQL migrations in order after review and a backup. Do not reset a shared database.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `apps/web/.env.local`, following `.env.local.example`. No service-role key is used by the application.
4. Add `http://127.0.0.1:3000/auth` to the authentication redirect allowlist. Sign-in supports new users when Supabase signups are enabled (`shouldCreateUser: true`). Users create their own display-name profile after email verification. Editorial roles still require a trusted, audited database operation; the live interface never grants roles to itself.
5. The API uses cookies and validates users on every protected request; RLS remains the final authority. Configure SMTP and email rate limits before any real use.

Supabase variables activate the shared interface. Email links use PKCE and the `/auth` callback; token-hash callbacks and email-code verification are also supported when the email templates provide them. Use the same browser and the `127.0.0.1` address throughout sign-in. Next Proxy refreshes cookie sessions, protected API handlers verify the user with `getUser()`, and RLS controls reads/writes. The live interface stores only the language preference locally, never profile or submission data. Shared screens are also addressable under `/shared/` for unconfigured/offline UI testing.

Before deployment, set `APP_ORIGIN` to the canonical HTTPS application origin and configure exact authentication callback URLs, SMTP, email rate limits and anti-abuse controls. Supabase's default email provider can limit delivery to authorized addresses; no authentication settings or rate limits were weakened.

## Limitations and next steps

This is a functioning local prototype, not a production release. Shared profile setup and dataset contribution/review/publication/corrections/comments/dispute resolution are connected to Supabase. Scholar decisions, audited role administration, articles and release creation remain demo-only and show an explicit unavailable state in live routes. Shared reviewer assignment, evidence entry and audit-history presentation still need endpoints/UI integration. Existing database functions enforce independent review and published versions; both original migrations are tested with PGlite and were applied to the authorized Supabase project. Real email delivery, refreshed/revoked sessions and concurrent authenticated users still need end-to-end verification. The dataset browser currently loads up to 500 records, and shared discussions up to 1,000 comments. Published demo status is not scholarly validation. The SDK is a placeholder. Founding scholars must ratify governance and review Somali interface copy.

Next: complete a real email sign-in/profile check, bootstrap explicitly approved independent reviewer/editor accounts, exercise the full shared publication workflow, then add the remaining community RPCs/endpoints and concurrency tests. No demo rows, identities or role grants were imported into the shared project.

## Licensing

Software is MIT licensed (see `LICENSE`). Original demonstration records are CC0-1.0. Project explanatory article copy is CC-BY-4.0 with attribution to qaamuusAi. Future datasets and articles carry independent record-specific licenses; software licensing never grants rights to third-party language resources.

## Reference documentation

Framework setup follows the [Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation). The server client follows the [Supabase SSR documentation](https://supabase.com/docs/guides/auth/server-side).
