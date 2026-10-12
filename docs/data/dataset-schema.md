# Dataset schema

Each JSONL line is one UTF-8 JSON object. Required fields: UUID `id`, `category` (vocabulary, translation, grammar), `term`, `translation`, `source`, `license`, `dialect`, `contributor`, nullable `reviewer`, `status`, positive integer `version`, boolean `demonstration`, and timezone-aware `created_at` / `updated_at`. `notes` defaults to an empty string. Meaning and provenance strings cannot be blank.

Lifecycle: draft -> submitted -> under_review -> approved -> published. Review may request changes, reject or dispute a proposal. Changes requested return to submission; editor-resolved disputes return to review. Published versions remain preserved; superseded is reserved for future release management.

Zod supplies app validation; Pydantic independently validates files and rejects unknown fields, duplicates, type coercion, malformed JSON and invalid UTF-8. `--published-only` also requires a named reviewer and redistribution permission. Demonstration releases are not scholar-verified.
