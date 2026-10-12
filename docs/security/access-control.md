# Access control

Browser-local roles are synthetic demo identities and protect no shared data. Never put real personal or sensitive unpublished data in this mode.

All shared tables enable RLS. Public clients can read published entries, articles and releases. Authenticated contributors can create drafts, read their own revisions and submit them through a function. Assigned reviewers and editors can read authorized proposals. Independent editors authorize publication and dispute resolution. Technical admins can read operational audit logs and profiles but cannot editorially transition proposals.

Published tables, review decisions, role assignments and audit logs have no direct client mutation policies. Workflow functions check identity, ownership, role, current status and nonempty rationale; review operations lock the revision row. Audit triggers preserve before/after proposal content. Exports omit unpublished revisions.

Use only the publishable key on server requests with user cookies. Keep service-role keys outside the application. API mutations require a same-origin request, valid session and schema-valid input. Magic-link requests do not create users. Before shared use, finish session refresh, rate limiting, safe profile onboarding, role grant auditing, RLS integration tests, backup procedures and security review.

Both migrations are executed by `pnpm test:db` in embedded PostgreSQL (PGlite), with mocked Supabase `auth.uid()` and synthetic users. Tests cover private drafts, immutable snapshots, role escalation denial, administrator restrictions, independent reviews, publication, preserved corrections, disputes and license gates. A full Supabase/PostgREST deployment remains unverified because Docker's daemon is unavailable.
