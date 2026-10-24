# Contributor pilot launch

## Deployment order

1. Apply `202610240003_contributor_abuse_limits.sql` in the authorized Supabase SQL editor in a transaction. It changes application submission to server-only; deploy the accompanying application immediately afterward. Existing accounts and application records are preserved.
2. Deploy the checked commit from `master`. Required server environment: `SUPABASE_SECRET_KEY`; public URL and publishable key remain separate. Never expose secret keys in public variables.
3. Confirm `/privacy`, `/contributor-guide`, `/join`, `/login`, and `/api/status` on the canonical production origin.
4. Test a synthetic application with an `example.com` address without approving it. Confirm `pending` in admin and no anonymous access to applicants. Do not send email to example addresses.

## Controls and support

- Vercel API edge rule: request path starts with `/api/`, 120 requests per 60 seconds per IP, return 429. Verify the published rule in the hosting dashboard; code does not create this rule.
- Application database budget: five valid attempts per source per 15 minutes and 100 globally per hour. All server instances share the budget. Direct anonymous calls are revoked. Vercel's overwritten `x-real-ip` is HMAC-hashed using the server secret before storage; other hosts share a budget. A missing Vercel client IP fails closed.
- The budget is an abuse backstop, not a guarantee against targeted denial of service. Investigate sustained limits in hosting logs; do not turn off authentication or email verification.
- SMTP sender is `noreply@smidify.com`; human support is `hello@smidify.com`. The mailbox exists; the operator must monitor it. No applicant email is sent before administrator approval.
- Logs emit `contributor_application_failed` and `contributor_invitation_failed` with provider error codes, not emails, token links or passwords. Inspect these in Vercel Runtime Logs. `invited` means Auth accepted the send; it does not prove inbox delivery.
- The production smoke workflow runs every 15 minutes and after deployment. GitHub may delay scheduled jobs. The repository owner must enable Actions failure notifications. This is availability checking, not 24/7 incident response.

## Invitation recovery

- Pending/failed: Approve and email invitation / Retry invitation.
- Invited, expired or lost link: Resend invitation. Only previously invited records qualify; the sending state prevents concurrent sends. Use only the newest link.
- Confirmed existing account: sign in or use Forgot password. An authorized administrator manages contributor access through Role administration. The public application does not grant roles.
- Sending after a server crash: check Auth and SMTP logs first. If the email was accepted, set the request to invited; if delivery was not attempted, set failed. Never blindly reset an in-flight request.
- Password setup: successful save completes invitation acceptance, signs out the current session and opens login. Profile password changes retain the current session. Failed saves stay on the form.

## Backups — release gate

Supabase Free has no managed daily backups. Code and migrations in Git are not a database backup.

Before accepting real team work, either enable a paid managed-backup plan yourself, or configure private exports using the official Supabase CLI:

1. Install the official Supabase CLI and ensure Docker is available.
2. Set `SUPABASE_DB_URL` privately to the database connection URI from Supabase Connect, with its database password. Never paste it in chat, commit it, or expose it to the browser.
3. Run `tools/backup-database.ps1`. Outputs stay in ignored `.local/backups/`. Move copies to operator-controlled encrypted off-site storage. SQL exports can contain personal information and authentication data.
4. Create a separate disposable local database or isolated Supabase test project. Restore roles, schema, then data using the official Supabase restore procedure; never point a restore test at production.
5. Verify row counts, Auth access, RLS policies, a contributor draft and published records. Record the test date, backup timestamp and result privately.
6. Repeat exports at least daily during the pilot and before schema changes; retain a rotating recovery history. Storage files need separate backups if file uploads are introduced.

Managed backup availability and a successful restore drill must be recorded before this gate is passed. No production reset is part of launch preparation.

## Pilot acceptance

Invite 3–5 people first. Confirm each can accept, set a password, sign in, see only authorized work and save a draft. A contributor must not read applicant identities, grant roles, review their own work or publish without independent review. Automated database tests exercise these denials; verify a real user session as well. Establish who will perform independent review before collecting submissions.

## Rollback

If the new app is unhealthy, stop approvals and investigate before sending more mail. Application submission requires the new five-argument RPC; rolling back only the app disables applications until the matching API is restored. Do not re-grant anonymous insertion as a workaround. Existing editorial data is unaffected by the budget migration. Database recovery is a separate, operator-controlled procedure based on a verified backup.
