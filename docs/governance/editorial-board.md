# Provisional editorial governance

Founding scholars must ratify this policy before production use.

Contributors propose entries and corrections. Reviewers record independent assessments and evidence. Editors coordinate review, manage disagreements and authorize publication. Technical administrators manage accounts, infrastructure and operational security; that role carries no linguistic approval power.

Users may hold multiple roles only through explicit, audited authorization. The local prototype records independent grants/revocations with actor, rationale and resulting roles. Editorial roles require an editor; operational grants require a technical administrator. A user cannot change their own roles, and the community must retain an editor. Scholar acceptance can grant reviewer permission while preserving existing roles.

The current implementation uses Supabase authentication, RLS and audited workflow RPCs; automated tests use synthetic fixtures. There is no browser-local identity fallback and no direct client role-write policy. Founding appointments require authorized, audited administration. Local tests do not prove that every migration or role has been verified in production; consult the current contributor launch checklist before onboarding real participants.

Authors cannot review or publish their own proposals. Editors should disclose conflicts and arrange independent review. Acceptance criteria, reviewer qualifications, appeals and board quorum are outstanding decisions for founding scholars.
