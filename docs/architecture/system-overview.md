# System overview

The pnpm workspace separates the web application, shared schemas, future SDK, datasets, database migrations and Python validation. Next.js App Router serves the public pages and API routes. Tailwind's build integration and shared CSS provide responsive styling. Lucide supplies interface icons.

The current interface uses a browser-local Workspace containing entries, immutable history snapshots and dispute evidence. It uses synthetic identities only. The demo transition engine shares permission rules with unit tests. No browser-local permission check protects real data.

Shared persistence is a separate foundation: authenticated server API routes use Supabase SSR cookies, `auth.getUser()`, Zod validation and an ordinary publishable-key client. PostgreSQL RLS and security-definer functions implement authorization. Mutating requests check the Origin header. No service-role credential bypasses RLS.

Published dataset rows are append-only to client roles. Proposal revisions hold editable draft content; audit snapshots preserve earlier content. Publication inserts a new accepted row, preserving previous published versions. Review decisions and dispute evidence remain separate immutable records. Public exports select only the accepted table and redistributable licenses.

The community domain module adds synthetic profiles, scholar applications, independent role grants, review assignments, discussions, article revision/publication and immutable release snapshots. Changes record actor, rationale, timestamp and content snapshots. Schema-validated restoration preserves old demo saves and retains an invalid save in a recovery key. Storage events synchronize open tabs; this is a last-write-wins demo, not a concurrent shared database.

The locale context translates interface copy and stores the English/Somali preference. Submitted language content is displayed verbatim as React text, never interpreted as HTML. Keyboard dialogs trap focus, close on Escape and mark background content inert. Global headers deny framing, MIME sniffing, embedded objects and unnecessary device permissions.

Supabase integration is paused. Future integration must add session refresh, authenticated UI queries, profile/role/article/release API contracts and RLS, pagination, notifications and concurrent-user testing. Do not connect the demo role selector to real authorization.
