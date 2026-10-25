# Ten ready-to-claim starter tasks

All tasks: **unassigned / not started**. Effort ranges are planning estimates, not pay quotes or delivery promises. These are repository task briefs, not published GitHub issues. A maintainer assigns an owner and independent reviewer before work.

| ID | Task | Dependencies | Estimate |
|---|---|---|---|
| [T01](#t01) | Reproduce the contributor setup | None | 2–4 hours |
| [T02](#t02) | Review transcription and dialect conventions | None | 3–5 hours |
| [T03](#t03) | Review consent and participant information | T02 draft | 3–6 hours, plus external review |
| [T04](#t04) | Design the recording and review journey | T02 and T03 drafts | 4–8 hours |
| [T05](#t05) | Prototype accessible recording controls | T04 | 4–8 hours |
| [T06](#t06) | Design private audio ingestion | T03 and speech schema review | 4–8 hours |
| [T07](#t07) | Implement a speech-manifest validator | T02 and T03 | 5–10 hours |
| [T08](#t08) | Run a small collection rehearsal | T02, T03, T04, T06 and T07 approved | 2–4 hours coordination, excluding participant time |
| [T09](#t09) | Reproduce the speech baseline | Authorized evaluation data and T07 | 6–12 hours, excluding compute |
| [T10](#t10) | Prepare pilot funding and progress brief | Budget and owners reviewed | 2–4 hours |

<a id="t01"></a>

## T01: Reproduce the contributor setup

- **Best fit:** Backend / DevOps
- **Owner / reviewer:** unassigned / unassigned
- **Dependencies:** None
- **Scope:** Document a clean local install and a restricted test environment. Keep production credentials out of local onboarding.
- **Done when:** A new developer follows the instructions; typecheck, lint and unit tests pass; missing-service states are documented; no secrets appear in logs or Git.
- **Handoff:** focused PR or linked design/report, evidence, unresolved questions, and next recommended task.

<a id="t02"></a>

## T02: Review transcription and dialect conventions

- **Best fit:** Language / editorial
- **Owner / reviewer:** unassigned / unassigned
- **Dependencies:** None
- **Scope:** Review the proposed speech standard with Somali language specialists. Decide spelling, code-switching, uncertain segments and self-described dialect labels.
- **Done when:** Record decisions and unresolved disagreements; provide at least ten invented transcript edge cases; appoint an independent language reviewer before approval.
- **Handoff:** focused PR or linked design/report, evidence, unresolved questions, and next recommended task.

<a id="t03"></a>

## T03: Review consent and participant information

- **Best fit:** Data stewardship / community
- **Owner / reviewer:** unassigned / unassigned
- **Dependencies:** T02 draft
- **Scope:** Adapt the consent draft with the responsible organization and a qualified privacy reviewer. Identify contact, retention, permitted purposes and downstream-release limits.
- **Done when:** Name the data steward and support channel; review the Somali explanation; separate ASR, TTS and public-release choices; document withdrawal handling; no recordings collected yet.
- **Handoff:** focused PR or linked design/report, evidence, unresolved questions, and next recommended task.

<a id="t04"></a>

## T04: Design the recording and review journey

- **Best fit:** UI / UX
- **Owner / reviewer:** unassigned / unassigned
- **Dependencies:** T02 and T03 drafts
- **Scope:** Create a phone-first design covering information, consent, record, listen, retry, transcript and submission, plus independent review.
- **Done when:** Show keyboard/focus behavior, text alternatives, errors and deletion requests; test the prototype with three volunteers using no recorded voice; link the design and findings.
- **Handoff:** focused PR or linked design/report, evidence, unresolved questions, and next recommended task.

<a id="t05"></a>

## T05: Prototype accessible recording controls

- **Best fit:** Frontend
- **Owner / reviewer:** unassigned / unassigned
- **Dependencies:** T04
- **Scope:** Build an isolated prototype with record, stop, playback, discard and transcript fields. Use synthetic local audio and explicit microphone permission.
- **Done when:** Keyboard controls and accessible names work; unsupported browsers and denied permission are handled; audio never uploads automatically; document codec/sample-rate inspection and limitations.
- **Handoff:** focused PR or linked design/report, evidence, unresolved questions, and next recommended task.

<a id="t06"></a>

## T06: Design private audio ingestion

- **Best fit:** Backend / security
- **Owner / reviewer:** unassigned / unassigned
- **Dependencies:** T03 and speech schema review
- **Scope:** Propose private object storage, short-lived authorized upload access, file limits, content inspection, checksums and consent linkage. Do not enable public collection.
- **Done when:** Document RLS/access rules, quotas, orphan cleanup, review states, retention and backup/restore; tests cover unauthorized reads, uploads and public URL exposure in an isolated environment.
- **Handoff:** focused PR or linked design/report, evidence, unresolved questions, and next recommended task.

<a id="t07"></a>

## T07: Implement a speech-manifest validator

- **Best fit:** Data engineering
- **Owner / reviewer:** unassigned / unassigned
- **Dependencies:** T02 and T03
- **Scope:** Use the draft JSON Schema for structure and add checks against actual audio and private consent records. Keep the existing text validator unchanged.
- **Done when:** Detect duplicate IDs, wrong hashes/duration/sample rate, missing rights, author-as-reviewer, unsafe paths, withdrawn consent and split leakage; synthetic pass/fail fixtures; no real voice in CI.
- **Handoff:** focused PR or linked design/report, evidence, unresolved questions, and next recommended task.

<a id="t08"></a>

## T08: Run a small collection rehearsal

- **Best fit:** Audio / language / community
- **Owner / reviewer:** unassigned / unassigned
- **Dependencies:** T02, T03, T04, T06 and T07 approved
- **Scope:** Rehearse with consenting adult participants and approved prompts only after storage, consent and named owners are ready. Target two speakers first, before scaling.
- **Done when:** Verify playback, transcript review, consent linkage, discard/withdrawal and access controls; log issues without identities; obtain go/no-go from data and language owners.
- **Handoff:** focused PR or linked design/report, evidence, unresolved questions, and next recommended task.

<a id="t09"></a>

## T09: Reproduce the speech baseline

- **Best fit:** ML / speech engineering
- **Owner / reviewer:** unassigned / unassigned
- **Dependencies:** Authorized evaluation data and T07
- **Scope:** Follow the model evaluation plan. Pin model revisions and environment; compare ASR candidates on identical approved inputs. Keep restricted models research-only.
- **Done when:** Publish configuration and aggregate results with WER/CER, subgroup counts, timing, hardware and costs; a second contributor reproduces a subset; no invented quality claims or raw private data.
- **Handoff:** focused PR or linked design/report, evidence, unresolved questions, and next recommended task.

<a id="t10"></a>

## T10: Prepare pilot funding and progress brief

- **Best fit:** Community / project lead
- **Owner / reviewer:** unassigned / unassigned
- **Dependencies:** Budget and owners reviewed
- **Scope:** Turn the budget into a clear milestone-based sponsor brief, with current facts separated from planned outputs.
- **Done when:** Show cash and volunteer assumptions, funding gap, receipt owner and monthly report; sponsor recognition confers no editorial authority; no messages, fundraising account or purchases without explicit authorization.
- **Handoff:** focused PR or linked design/report, evidence, unresolved questions, and next recommended task.
