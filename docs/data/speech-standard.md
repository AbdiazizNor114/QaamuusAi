# Text and speech data standard — draft v0.1

Status: proposed, 25 October 2026. This is a file interchange design, not a deployed database schema, audio upload API or completed media validator.

## Preserve the text contract

The [existing text schema](dataset-schema.md) and [licensing rules](licensing-and-provenance.md) remain authoritative. Required fields include ID, category, term, translation, source, licence, dialect, contributor, independent reviewer, workflow status, version and timestamps. Keep `Permission pending` private and non-exportable. Add terminology definitions/examples through the existing versioned notes envelope; do not invent incompatible columns. Text exports must pass the current validator. Corrections preserve accepted versions.

## Proposed speech manifest

Use UTF-8 JSONL, one clip per record, validated with [speech-record-v0.1.schema.json](../../datasets/schemas/speech-record-v0.1.schema.json). The [synthetic example](../../datasets/examples/speech-record.synthetic.json) references no real person or audio file and is never eligible for release.

| Fields | Meaning |
|---|---|
| `schema_version`, `id`, `version` | Contract version, stable clip UUID, positive record version |
| `speaker_id`, `consent_id` | Random private-reference IDs; no names, email, phone, identity document or exact location |
| `language`, `dialect`, `dialect_source` | `som`; participant-described dialect or `Unspecified`; never infer ethnicity/dialect from voice |
| `audio_path`, `sha256` | Safe relative media path and lowercase SHA-256; no signed URL, credentials or local absolute path |
| `duration_seconds`, `sample_rate_hz`, `channels`, `encoding` | Measured media metadata, not user declarations |
| `transcript_verbatim`, `transcript_normalized`, `normalization_version` | Checked speech as spoken; separate deterministic benchmark form and transformation version |
| `prompt_id`, `source` | UUID for scripted prompts, otherwise null; provenance of prompt and recording |
| `license`, `rights_status`, `permitted_uses`, `release_scope` | Licence/permission state separate from purposes: ASR, evaluation or TTS; internal or public intent |
| `split`, `status`, `reviewer_id`, timestamps | Unassigned/train/dev/test split and auditable review lifecycle |

The manifest is restricted working data. Public exports must be generated separately: omit `consent_id`, personal contacts and access links; reassess whether stable speaker references are necessary and proportionate. Pseudonyms and voices are not anonymous. Never expose the participant-to-speaker mapping.

## Recording and transcription conventions

Preserve the original recording privately. Proposed derived ASR format: mono, 16 kHz, 16-bit PCM WAV. It is a compatibility target, not evidence that upsampling improves source quality. For potential TTS work, retain the approved original sampling rate and document each model's requirements. Proposed clip target: 3–15 seconds; quarantine corrupt, silent, clipped, heavily overlapped or third-party speech for review. Header validation, decoding and listening checks must supplement JSON validation.

Use Unicode NFC and UTF-8. Keep code-switching, dialect wording and meaningful repetition in the verbatim transcript. Do not silently translate or rewrite speech into a preferred dialect. Agree a private uncertainty marker convention with reviewers; unresolved speech stays unapproved. The evaluation-normalized transcript uses a frozen, documented policy; preserve a verbatim score alongside normalized scores. Keep prompt IDs and source rights traceable.

## Rights and publication gates

Independent review, valid current consent and cleared source rights are mandatory. The technical validator cannot determine lawful collection or permission by itself. A licence is not a substitute for participant information or permission to create synthetic voices. Do not describe a CC0/CC-BY public release as restricted to research or promise that copies can always be recalled. If a purpose restriction cannot coexist with the planned public licence, retain the material in a separate restricted collection and resolve it before export.

No automatic audio release under the current text licence whitelist. A data steward and language reviewer must approve an audio release policy and each manifest. Check all referenced consent choices, actual media, checksums, current withdrawal status, independent reviewer and permitted purpose. `tts` requires its own explicit permission. Synthetic fixtures always remain excluded. Schema approval is not publication approval.

## Splits and versioning

Provisional split target: 70/15/15 by speaker for train/dev/test, after rights and quality checks. For a tiny pilot prioritize a useful held-out set and report actual counts; percentages alone are misleading. Keep each person in exactly one split across sessions, augmentations and derived clips. Track duplicate/near-duplicate audio and overlapping prompts; report domain/prompt overlap. Never tune on the test set. Hash a frozen manifest; record dataset, normalization, model and evaluation versions. Withdrawn records are blocked from new jobs and releases pending the steward's process.
