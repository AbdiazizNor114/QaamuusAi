# Start contributing to QaamuusAI

## The mission

Help developers build AI that understands and speaks Somali naturally. We are preparing reviewed text, consented speech and transcripts, model baselines, benchmarks and developer tools. Today the repository contains the language contribution platform, planning terminology and validation tools. Speech collection, speech model releases and training infrastructure remain planned.

## Choose a contribution path

| Background | Useful first work | Start with |
|---|---|---|
| Frontend | Recording controls, upload progress, accessible transcript editing | T05 |
| Backend / DevOps | Private audio storage, permission checks, backups, reproducible setup | T01 or T06 |
| UI / UX | Recording and review journeys, keyboard and phone usability | T04 |
| Linguist / grammar teacher / writer | Text review, transcription conventions, dialect representation | T02 |
| Speaker / transcriber | Review the recording instructions; later contribute only through an approved collection process | T03, then T08 |
| Data scientist / ML engineer | Dataset checks, model reproduction and held-out evaluation | T07 or T09 |
| Community / funding | Clear onboarding, issue coordination and an accountable pilot budget | T10 |

Titles describe expertise; reviewer and administrator access are separately approved permissions.

## Join and choose a task

1. Read this guide, [the code of conduct](../../CODE_OF_CONDUCT.md), [data rights](../data/licensing-and-provenance.md) and the task's acceptance criteria.
2. Request platform access through `/join` on the project website. For code contributions, use the repository's pull request process; do not share account credentials.
3. Choose one [starter task](starter-tasks.md). Ask a maintainer to record your GitHub handle, reviewer and a realistic next update date. All tasks currently remain unassigned; this pack creates no external issues automatically.
4. Discuss scope before substantial work. Flag access or equipment needs early. Use synthetic fixtures, not participant identities or real recordings, in Git.
5. Submit a focused pull request or language proposal with evidence and validation. An independent reviewer can accept it, request changes or explain rejection.

## Local development

Install Node 24, pnpm 11 and Python 3.11+ as appropriate. See [README](../../README.md) for authoritative setup commands. Run `pnpm install --frozen-lockfile`, then `pnpm dev`; open `http://127.0.0.1:3000`. Public page design can be reviewed without production credentials. Authenticated workflows require an authorized environment. Maintainers should provide a restricted test setup, never production secrets.

For app changes run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`; add targeted browser checks for changed workflows. Database changes need `pnpm test:db`. Text dataset changes use the existing Python validator and its tests. The new speech JSON Schema is a draft interchange contract, not an implemented upload service or a replacement for media and consent review.

## A good first contribution

Keep it small enough to review. State the user problem, proposed behavior, checks performed and known limits. Include a screenshot for interface changes, citations and permission evidence for language records, or a reproducible run configuration for ML work. Do not silently change licences, approved wording or dataset splits.

## Where decisions belong

Technical maintainers review implementation and security. Independent language reviewers assess wording and transcripts. The data steward checks rights and release eligibility. The project lead resolves scope and budget questions. Disclose conflicts; ask for a different reviewer when needed. Governance is provisional until ratified by the founding reviewers; see [editorial governance](../governance/editorial-board.md).

No paid positions, payment promises, deadlines or reviewer appointments are implied by these tasks. Agree any compensation before work starts.
