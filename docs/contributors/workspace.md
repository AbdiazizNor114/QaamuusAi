# Contributor workspace implementation

- `/dashboard/start`: role-based onboarding, profile guidance and links to the preparation pack.
- `/dashboard/tasks`: shared starter tasks, track/status/search filters, owner claims, handoff evidence and independent reviews.
- `/dashboard`: contribution-area preference, relevant open tasks, personal task count and review count alongside existing language work.

Apply `supabase/migrations/202610250001_project_workspace.sql` before enabling shared task tracking in a hosted environment. This change is prepared in the repository; it does not apply itself to production. Without the migration the UI reports unavailable storage and does not fabricate task owners or progress.

The migration seeds the ten project-preparation task briefs (not language data). Members with profiles can claim available tasks, start work, submit an HTTP(S) evidence link and summary, or release unsubmitted work. Required completed dependencies are enforced transactionally for gated tasks. Draft-level preparation and external prerequisites remain described in each brief and must be checked by the independent reviewer.

Language tasks require an independent reviewer/editor; other tasks require an independent technical administrator. A completion is coordination evidence, not consent approval, editorial publication or authority to collect recordings. Each mutation locks the row, checks the expected version and writes an audit event. Direct writes and anonymous reads are revoked. Preferences are visible only to their owner and never grant permissions. Authenticated board members see assignee display names, not email addresses.

There is no GitHub write integration: submit existing PR/design/report URLs as evidence. The app does not open issues, send messages, recruit speakers or enable audio upload. Start page and GitHub task briefs can be read while the task database is unavailable. Existing project guidance and permission gates remain authoritative.

Hosted acceptance: verify two real contributor sessions cannot claim the same task, cannot edit another owner's task, cannot review their own work, and cannot turn a design preference into a privileged role. Confirm profile creation, preferences across sign-in, review feedback, and an audit entry before inviting a larger group.
