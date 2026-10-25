# Somali speech baseline and evaluation plan

Researched 25 October 2026 from primary model cards and repositories. **No models were downloaded, run, trained or benchmarked for this pack.** Support for Somali does not establish quality or suitability for every dialect. Pin exact model revisions and re-check licences before execution or redistribution.

## Candidate shortlist

| Candidate | Task and evidence | Licence / decision |
|---|---|---|
| [Whisper large-v3](https://huggingface.co/openai/whisper-large-v3) | ASR candidate; [official tokenizer](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py) includes Somali (`so`). Compare to a smaller multilingual Whisper checkpoint if hardware is limited; verify that checkpoint independently. | Current large-v3 card states Apache-2.0. Preferred first ASR investigation for developer reuse; actual quality and resource use unmeasured here. |
| [Meta MMS-1b-all](https://huggingface.co/facebook/mms-1b-all) | ASR comparison candidate; card lists Somali (`som`) and language adapters. Confirm preprocessing and adapter selection from the pinned implementation. | CC-BY-NC-4.0 on card. Research comparison only until use-specific review; do not bundle as unrestricted commercial developer infrastructure. |
| [Meta MMS-TTS Somali](https://huggingface.co/facebook/mms-tts-som) | Existing Somali text-to-speech checkpoint; suitable to investigate pronunciation and intelligibility with listeners. | CC-BY-NC-4.0. Restricted research candidate, not the selected public commercial voice offering. Do not promise unrestricted derivatives or voice cloning. |

Model-weight permissions, dependencies, training-data rights, participant permissions and generated-output conditions must be checked separately. This is a licence screening note, not clearance. No candidate has been selected for production.

## Evaluation data

Use an authorized, independently checked corpus. Target five accepted pilot hours from 20 speakers only after collection gates pass. Freeze speaker-disjoint train/dev/test assignments before tuning; never train on test speakers or leak their augmented clips. Keep a prompt-overlap register. A small pilot may not support reliable subgroup conclusions: report minutes, speakers, devices and dialect self-descriptions, including missing coverage. Do not substitute English/Swedish performance claims for measured Somali results.

External corpora are leads, not imported data. Verify Somali availability, exact release, consent/provenance, permitted access and licences before using them. Common Voice's [current terms](https://commonvoice.mozilla.org/dav/terms) specify CC0 contributions and request access via Mozilla Data Collective rather than mirroring; do not scrape or rehost it as part of this pilot. Treat overlap with model pretraining as a limitation when comparing public benchmarks.

## ASR protocol

1. Pin model ID/revision, tokenizer/processor revision, dependencies, hardware, precision, seed and dataset manifest hash. Record licence review and permitted dataset use.
2. Decode the same checked inputs for each candidate. Record resampling, channel conversion, chunking, language selection (`so` versus `som` as required) and decoding parameters. Preserve raw predictions privately.
3. Report corpus word error rate: `(substitutions + deletions + insertions) / reference words`. It can exceed 100%. Also report character error rate and exact normalization rules; never compare numbers produced under different normalization policies as equivalent.
4. Report totals and per-dialect/device/noise group counts, not just a single average. Bootstrap uncertainty by speaker where feasible; label tiny groups exploratory. Listen to representative errors and code-switching cases with reviewers.
5. Measure wall-clock runtime, audio seconds, real-time factor (`runtime/audio duration`), peak memory and actual compute cost. Separate cold starts from steady-state runs.
6. Record no-speech and noise-only behavior using authorized or synthetic fixtures. Any invented transcript from silence must be investigated. Do not assign an accuracy score before running the study.

## TTS protocol

Use a separately approved prompt set and only permitted TTS inputs. Randomize system order. Ask at least three independent Somali listeners to rate intelligibility and naturalness from 1–5 with written anchors; collect pronunciation/error notes. Include numerals, loanwords, long/short vowels, consonant contrasts and dialect choices after language review. Report listener and prompt counts and uncertainty; ASR transcription of generated audio is supplementary, not a substitute for listening. Record synthesis runtime, audio duration, memory and cost. Do not imitate a named person without the required explicit permission.

## Results template and release decision

Use [baseline-results-template.csv](baseline-results-template.csv); blank cells mean not measured, never zero. Keep separate run logs with software/model revisions, data hash, consent check timestamp, normalization, preprocessing, hardware, sample counts and error analysis. Another contributor must reproduce a subset.

Proposed first decision gate: complete reproducible runs for two ASR candidates, one rights-reviewed TTS research candidate, independent error analysis and a documented cost/resource comparison. Before seeing final test results, language and technical owners agree task-specific quality thresholds and subgroup minimums; freeze them with the protocol. No performance threshold is approved yet. If results are weak, publish limitations and improve data rather than declaring production readiness. Public model/toolkit release additionally requires commercial-use/licence compatibility review, data/model cards and a named maintainer.
