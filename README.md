# qaamuusAi

A local prototype for a community-governed Somali language commons. It contains a Next.js App Router application, shared TypeScript schemas, Supabase migrations and a Python JSONL validator. Project branding is **qaamuusAi**; package identifiers use lowercase `qaamuusai`.

## Run locally

Requires Node.js 22+ (verified here with Node 24), pnpm 11 and Python 3.11+.

```powershell
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000. No credentials are needed for the demo. All proposals, decisions and role changes in the interface are isolated in your browser's local storage. The role selector is a demonstration identity switch, not authentication. Do not store real personal or unpublished contributor data in this prototype.

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
4. Add `http://127.0.0.1:3000/auth` to the authentication redirect allowlist. Sign-in supports existing users only (`shouldCreateUser: false`). Create profiles and grant editorial roles through a trusted, audited database operation. Client-side role grants are intentionally unavailable.
5. The API uses cookies and validates users on every protected request; RLS remains the final authority. Configure SMTP and email rate limits before any real use.

The current interface remains a browser-local demo even when Supabase variables are set. The authenticated API is a separate integration foundation; wiring the shared-data UI is the next phase. Sign-in callback/session refresh and real-user onboarding need end-to-end verification before shared use.

## Limitations and next steps

This is a functioning local prototype, not a production release. The follow-on phases for onboarding, editorial workflows, articles/releases and localization/accessibility are implemented using synthetic browser-local identities. These capabilities are not yet wired to Supabase. Both original SQL migrations are tested in embedded PostgreSQL (PGlite); the newer profile, role, article and release workflows still need server endpoints and database policies when Supabase integration resumes. Real authentication, email/session integration and multi-user concurrency remain unverified. Published demonstration status simulates approval and is not scholarly validation. The SDK is a placeholder. Founding scholars must ratify governance and review Somali interface copy.

Supabase work is paused at the user's request. Next: connect the completed local workflows to authenticated shared persistence, add corresponding RPCs and RLS for role decisions/articles/releases, test sessions and multi-user concurrency, and obtain governance/language approval before deployment. The demo selector must never become a real role-switching mechanism.

## Licensing

Software is MIT licensed (see `LICENSE`). Original demonstration records are CC0-1.0. Project explanatory article copy is CC-BY-4.0 with attribution to qaamuusAi. Future datasets and articles carry independent record-specific licenses; software licensing never grants rights to third-party language resources.

## Reference documentation

Framework setup follows the [Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation). The server client follows the [Supabase SSR documentation](https://supabase.com/docs/guides/auth/server-side).
