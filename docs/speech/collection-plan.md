# Audio collection pilot — proposed plan

No collection has started. Before collecting real speech, appoint a data steward and independent language reviewer, approve the participant information and consent, establish private storage and withdrawal handling, and fund the work. Use [starter tasks](../contributors/starter-tasks.md) T02–T08 as the implementation sequence.

## Scope and success

First rehearse with two consenting adults. If the rehearsal passes, propose 20 adult speakers with 15 accepted minutes each: five hours of checked audio. This is a workflow and evaluation pilot, not enough evidence to promise broad Somali coverage or production-quality TTS. Do not recruit children in this pilot. Ask people to describe their dialect optionally; recruit intentionally across available varieties and report actual coverage, including gaps. No biometric identity verification or exact location collection is needed.

Start with licensed scripted everyday phrases: technology, education and ordinary conversation. Language specialists must approve prompts and pronunciation conventions first. Exclude identifying personal stories, private health details, copyrighted readings without permission and incidental third-party speech. A later natural-conversation corpus needs its own protocol.

## Session checklist

1. Explain the project in a language the participant understands. Explain separate ASR, evaluation, TTS and public-audio uses, compensation if agreed, contact and withdrawal limits. Complete the reviewed consent process before recording.
2. Assign random speaker/consent IDs; store the mapping and permission evidence separately with restricted access. Names and contacts never go into benchmark files or Git.
3. Test the microphone, room and device; turn off notifications. Use a quiet room without background music. Record a short test, listen and allow re-recording. A phone is acceptable for the pilot; do not claim studio quality.
4. Preserve the original privately. Segment and derive ASR copies without erasing originals. Record actual duration, channel count, rate, codec, checksum and processing history; follow the [speech standard](../data/speech-standard.md).
5. Let the speaker listen, discard or retry before submission. Do not pressure participants to authorize TTS or public distribution.
6. Transcribe faithfully; a different qualified reviewer listens and checks the transcript. Quarantine uncertainty or personal information. Do not use unreviewed machine transcripts as ground truth.
7. Check current rights and permitted use before every job. Freeze speaker-disjoint splits before model comparison. Keep unsuitable material out of release candidates.

## Quality and operations

Accept only decodable, audible, correctly paired clips with appropriate permission and no unresolved clipping, overlap or privacy concern. Log reasons for rejection; do not rank a dialect as poor quality because a baseline model performs badly on it. Track accepted minutes, review time, rejection reasons, coverage and participant requests without publishing identity data.

Private storage needs authorization, quotas, inspection, encryption in transit, controlled access, deletion handling and backups with a tested restore. The website currently does not provide this speech collection pipeline. Implement and review T06/T07 first; do not create a public audio bucket as a shortcut.

Proposed retention for review: unaccepted raw submissions 30 days; accepted working recordings up to 12 months before an explicit necessity review. These are proposals requiring steward/privacy approval and participant notice before collection, not promises already in force. Define backup expiry and legal exceptions as part of that review.

## Go/no-go

Data steward: consent, rights, access and retention ready. Language reviewer: prompts, transcripts and dialect approach ready. Technical maintainer: quotas, storage and recovery tested. Budget owner: compensation and spending cap agreed. Each records approval before the rehearsal and again before expansion. Stop when any gate fails; fix issues before recruiting more speakers.
