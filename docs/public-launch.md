# Public Website and API

## First Deployment Checklist

Public address: `https://qai.smidify.com`, deployed on Vercel from `master`. Do not overwrite records for the existing apex domain or email service.

1. Choose the hosting account and link the repository/workspace with access limited to this project. For managed Next.js hosting, use Node 24 and pnpm 11.25.0; retain access to the root workspace and `packages/schemas`, install from the repository root with `pnpm install --frozen-lockfile`, build with `pnpm build`, and select `apps/web` as the framework application where the provider supports monorepos. Do not publish as a static-only export: auth and API routes require a Next.js server runtime. Exact provider settings must be checked once the host is selected.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and the publishable key in hosting environment settings, never in Git. Set `APP_ORIGIN` and `NEXT_PUBLIC_SITE_URL` to the same final HTTPS origin. `NEXT_PUBLIC_*` changes require rebuilding. Use a separate Supabase project for untrusted previews rather than granting preview contributors production credentials or private sessions.
3. Configure distributed rate limits at the hosting edge. Only set `DEPLOY_EDGE_RATE_LIMIT_CONFIRMED=true` after verifying the rules apply to public API routes. `PUBLIC_API_TRUST_PROXY=true` additionally requires checking the provider's overwritten IP-header contract and setting `DEPLOY_TRUSTED_PROXY_CONFIRMED=true`. These flags are preflight attestations, not implementations of the controls.
4. Run `pnpm deploy:check --production` in the production environment. It validates origins/key type, checks tracked environment templates and refuses missing edge-control confirmation. It never prints credential values or deploys anything. A private ignored backup of the old environment example is under `.local/`; do not upload it.
5. Run `pnpm test:deploy`, `pnpm test`, `pnpm test:db`, `pnpm lint`, `pnpm build` and `pnpm test:e2e`. Browser tests use the production build on a dedicated port 3100, refusing to reuse another server. Override with `E2E_PORT` if needed. Build before running them.
6. Deploy to the host-issued URL first, verify HTTPS, then add only the confirmed subdomain and the DNS record values supplied by that host. A preview testing session may require its own matching origin values; never mix an unrelated `APP_ORIGIN` with the browser's sign-in origin.
7. In Supabase, preserve existing local redirects, add the exact production `/auth` callback URL and set the production Site URL. Confirm the production mail provider/limits before sending recovery emails. Do not reset credentials to test deployment.
8. Run `pnpm deploy:smoke https://your-confirmed-origin` after deployment. It uses read-only pages/API calls, checks that anonymous private-claims access is denied and an unlisted CORS origin is rejected. It creates no accounts, proposals, claims, emails or review decisions.
9. Check robots/sitemap/canonical URLs, configured CORS, actual edge limits, editor/reviewer isolation and one user-controlled sign-in/recovery flow. Connect external health monitoring and provider error logs. A green build is not proof of production authentication or DNS correctness.

For self-hosted Node deployments, `pnpm start` binds to `0.0.0.0` and uses the provider's `PORT` environment variable; terminate HTTPS at the trusted host/reverse proxy. Do not expose a development server as production.

## Local Features

- Public catalog and terminology-in-progress remain separate. Drafts are not published datasets.
- `/releases` lists frozen editor-created releases, dates, notes, JSON/JSONL downloads, licensing/attribution manifests and SHA256SUMS.
- `/api/releases/{id}?format=json|jsonl|manifest|checksums` reads only the stored release. SHA-256 hashes cover the exact UTF-8 bytes returned, including final newlines. The checksum header and ETag match the downloaded representation. Checksums detect changes, not authenticity or linguistic correctness.
- `/api/v1/entries` supports validated search, category/dialect filters and pagination.
- `/api/status` checks anonymous database reachability with a five-second timeout. A 503 indicates unavailable data access; a 200 does not prove all API operations work or promise uptime. Health failures and v1 query failures emit structured events without search text, credentials or database details.

## Environment Configuration

Do not commit secrets or edit the credential-filled example file. Set these in local or hosting environment settings:

- `NEXT_PUBLIC_SITE_URL`: final public origin, for canonical URLs, Open Graph URLs, robots and sitemap. Until set, the prototype requests no indexing and emits no invented domain.
- `NEXT_PUBLIC_CONTACT_EMAIL`: optional public project contact. Without it the site offers workspace contribution and scholar-application links, not an invented mailbox.
- `PUBLIC_API_ALLOWED_ORIGINS`: comma-separated exact browser origins, including scheme and optional port. Unlisted cross-origin requests are rejected with 403. Same-origin and requests without Origin work. No credentialed CORS is enabled; only GET/HEAD/OPTIONS are advertised. Never use cookies with public API calls.
- `PUBLIC_API_TRUST_PROXY`: leave false unless the deployment's trusted reverse proxy overwrites x-forwarded-for and cannot be bypassed. Otherwise clients can spoof identity. Default mode shares one request budget per process.

## Limits and Launch Requirements

Public catalog, export, terminology, release, status and v1 requests pass through a bounded in-memory 60-request/minute backstop. Responses expose X-RateLimit-Limit/Remaining and 429 provides Retry-After seconds. Counters reset on process restart and are not shared across instances; this is NOT distributed abuse protection. Configure provider/WAF rate limits and request/response size budgets before a multi-instance public launch. OPTIONS does not consume the local budget. The public-site data fetch also consumes a request.

CORS controls browser access, not authorization or server-to-server access. All served records must be public. Do not add secret data or a service-role client to public routes.

The `Production health checks` GitHub Actions workflow runs read-only smoke checks against the fixed production domain after a successful production deployment, or manually from Actions. It uses no Supabase credentials, never follows event-supplied URLs and checks pages, the logo, callback origin, database reachability, API behavior and anonymous access denial. A failed workflow is visible in Actions; configure your GitHub Actions notification preferences to receive failure notifications. This does not roll back a deployment or provide continuous uptime monitoring. The workflow must be pushed before it can run on GitHub.

No continuous external availability monitor is activated. Connect structured server logs to the host log service and configure an external availability monitor for `/api/status` with a sensible interval (for example five minutes). Alert on persistent 503s, elevated 429s and v1 query failure events. Never log recovery tokens, authorization headers or full query URLs. Check provider timeouts and a distributed limiter before opening access widely.

Buy/configure the domain, deploy HTTPS, set environment variables, rebuild for public environment settings, then verify canonical tags, sitemap, allowlisted CORS, limits, recovery redirect allowlist and download hashes on the real origin. Robots directives are not access control. Existing database role/RLS enforcement remains necessary.
