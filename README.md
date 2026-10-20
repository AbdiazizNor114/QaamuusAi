# qaamuusAi

A local prototype for a community-governed Somali language commons. It contains a Next.js App Router application, shared TypeScript schemas, Supabase migrations and a Python JSONL validator. Project branding is **qaamuusAi**; package identifiers use lowercase `qaamuusai`.

## Run locally

Requires Node.js 22+ (verified here with Node 24), pnpm 11 and Python 3.11+.

```powershell
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000. The public catalog, `/datasets`, `/articles`, `/technology`, `/developers` and `/about` work without sign-in. Published shared records load when Supabase is configured; empty collections are not filled with demo records. Authenticated work starts at `/dashboard`. The isolated demo is always available at `/demo/dashboard`; its proposals, decisions and role changes stay in browser local storage. Demo roles never authorize shared operations. Do not put real personal or unpublished contributor data into the demo.

### Public developer access

`GET /api/v1/entries` is the versioned anonymous API for openly licensed published records. Optional parameters: `q` (term/translation search, max 100 characters; letters, numbers, spaces, apostrophes and hyphens), `category` (vocabulary/translation/grammar), `dialect` (exact match), `page` (1–10000, default 1), `limit` (1–100, default 25). Unknown/repeated parameters return 400; backend outages return 503. Success contains `api_version`, `status`, `data` and `pagination` (page, limit, total, total_pages, has_next). No workspace drafts or internal user identifiers are queried. Pagination is live rather than a frozen snapshot. Developer examples and field descriptions are at `/developers`.

`/api/public` provides a read-only catalog (up to 500 entries, 500 articles and 100 releases). `/api/export?format=json` or `format=jsonl` downloads openly licensed published entries, paginated internally. `/releases` lists frozen JSON/JSONL downloads, licensing manifests and SHA-256 checksums. Public API requests have a local rate-limit backstop and configurable CORS allowlist; production distributed limits and external monitoring still require deployment configuration. See [Public Launch](docs/public-launch.md) for environment settings, health checks and limitations. No SLA is provided.

`/api/technology?format=json` or `format=jsonl` provides 1,000 distinct English technology planning terms. The same starter list is available in My submissions for scholar proposals. Somali values are deliberately null and marked `needs_translation`: this is not an approved bilingual dictionary. Source and permission review must precede publication of translations.

The dedicated `/dashboard/terminology` workspace offers topic/status filters, search, pagination and scoped progress counts. Terminology proposals add definition, example, alternatives and permission evidence. These fields use a versioned `qaamuusai.terminology` JSON envelope in the existing `notes` string, preserving existing save/review/history RPCs without a migration. Notes in public JSON/JSONL retain that envelope when a terminology entry is eventually published; ordinary proposals retain plain notes. Old notes are never automatically converted. Progress is based on the loaded, RLS-visible records (currently up to 500 revisions/500 entries), not an authoritative global total.

Shared term claims require migration `202610170001_terminology_claims.sql` (applied to the hosted project on 17 October 2026 after explicit approval). Reviewers/editors can claim one active slot per starter term; a unique database key prevents competing claims. Only its owner can release a particular claim ID, even after losing the scholar role. Authenticated members with profiles see claimant display names, not emails. Writes are audited, and direct table writes are revoked. Claims refresh on focus/every 30 seconds; conflict responses refresh immediately. Claims are coordination only, not review assignment or approval, and do not block alternative proposals. They do not expire automatically. If the migration is unavailable, claim controls remain unavailable rather than pretending terms are unclaimed.

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
- Shared dispute evidence with source citations, verified authors and read-only evidence after resolution.
- Authorized shared submission review history with decision rationale, reviewer identity and timestamps.
- Read-only dataset revision snapshots showing preserved wording, sources, dialect and licensing.
- Editor-led independent reviewer assignment with a required rationale and audit record (migration `202610140001_reviewer_assignment.sql` tested locally and applied to the shared project after approval).
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
4. The default sign-in form uses email/password with Supabase's existing-account authentication; it sends no sign-in email and creates no account implicitly. Existing email-link users can set a password from `/dashboard/profile` while signed in. Password entry is user-controlled; no passwords are stored locally or logged. Forgot password opens an email-recovery form; public account registration is not implemented yet. Keep `http://127.0.0.1:3000/auth` allowlisted for existing email callbacks/recovery configuration. Editorial roles still require a trusted, audited database operation.
5. The API uses cookies and validates users on every protected request; RLS remains the final authority. Configure SMTP and email rate limits before any real use.

Supabase variables activate the shared interface. Password sign-in uses a server endpoint and SSR cookies. Password updates require a same-origin request, verified current user, matching confirmation and 12–128 characters; Supabase enforces its own additional security requirements. Only the current authenticated user can update their password, never a browser-supplied user ID. Legacy PKCE/token-hash callbacks and email-code verification remain supported for previously issued links. Use the same browser and `127.0.0.1` throughout sign-in. Next Proxy refreshes cookie sessions, protected handlers call `getUser()`, and RLS remains authoritative. Shared screens store only the language preference locally.

Password-recovery links that return to the site root with `type=recovery` and session tokens in the URL fragment are handled on first client load. The fragment is removed immediately; a same-origin endpoint validates the access token with Supabase before establishing SSR cookies, then opens `/reset-password`. Explicit recovery token-hash/PKCE callbacks also route to that form. Invalid/expired fragments show a generic error. Tokens are never put in local storage or application logs. The user enters the new password; the agent does not set credentials. The Forgot password form requests a recovery email via the existing /auth allowlist, with an HTTP-only routing marker for PKCE callbacks. Responses do not reveal whether an account exists; provider limits remain enforced. No test recovery emails were sent. Public account registration remains pending.

Before deployment, set `APP_ORIGIN` to the canonical HTTPS application origin and configure exact authentication callback URLs, SMTP, email rate limits and anti-abuse controls. Supabase's default email provider can limit delivery to authorized addresses; no authentication settings or rate limits were weakened.

## Limitations and next steps

This is a functioning local prototype, not a production release. Shared profile setup, dataset workflows, scholar applications/decisions, audited role administration, article draft/edit/review/publication/correction and frozen dataset release creation/downloads are connected to Supabase. The third migration adds controlled community RPCs and article decision history. Publication requires independent approval and redistribution permission. Role changes reject self-modification and separate editorial from operational authority; changes are audited and serialized. No founding roles are granted automatically. Shared dataset reviewer assignment, evidence entry and dataset audit-history presentation still need UI/endpoints. The dataset/article browsers load up to 500 records; discussions and article decisions up to 1,000 rows; releases up to 100. All three migrations are tested with PGlite and applied to the authorized project. The user has confirmed real sign-in and profile/draft persistence after refresh; refreshed/revoked sessions, concurrent users and hosted privileged workflows still need verification. Published demo status is not scholarly validation. The SDK remains a placeholder. Founding scholars must ratify governance and review Somali interface copy.

Next: designate explicitly approved founding editor/technical-admin accounts through an audited, trusted database operation, then exercise the shared scholar/review/publication/release workflows with independent accounts. Complete concurrency, revocation and remaining dataset controls before deployment. No demo rows, identities or role grants were imported into the shared project. A normal signed-in contributor can submit articles/applications but cannot approve them, manage roles or publish releases.

## Licensing

Software is MIT licensed (see `LICENSE`). Original demonstration records are CC0-1.0. Project explanatory article copy is CC-BY-4.0 with attribution to qaamuusAi. Future datasets and articles carry independent record-specific licenses; software licensing never grants rights to third-party language resources.

## Reference documentation

Framework setup follows the [Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation). The server client follows the [Supabase SSR documentation](https://supabase.com/docs/guides/auth/server-side).
