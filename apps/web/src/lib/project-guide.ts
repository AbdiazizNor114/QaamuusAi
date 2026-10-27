export type GuideNote = {
  id: string;
  title: string;
  text: string;
  href: string;
  keywords: string[];
  code?: string;
};
export const projectNotes: GuideNote[] = [
  {
    id: "mission",
    title: "What QaamuusAI is building",
    text: "QaamuusAI is building the datasets, models, evaluation tools and documentation developers need to create Somali language and speech applications. The voice-assistant illustration is an example of what developers could build using those resources, not a live QaamuusAI speech model.",
    href: "/ai",
    keywords: [
      "qaamuusai",
      "qaamuus",
      "mission",
      "goal",
      "purpose",
      "project",
      "vision",
      "about",
      "what is",
      "explain",
    ],
  },
  {
    id: "join",
    title: "Join and contribute",
    text: "Apply with your name, email, field of study and professional background at Request to contribute. An administrator reviews the application. If approved, use the newest email invitation to set a password and sign in. Contribution interests do not grant reviewer or administrator permissions.",
    href: "/join",
    keywords: [
      "join",
      "contribute",
      "contributing",
      "contributor",
      "apply",
      "application",
      "invite",
      "invitation",
      "account",
      "login",
      "password",
      "sign in",
    ],
  },
  {
    id: "tasks",
    title: "Find your first task",
    text: "Signed-in members can use Start here to choose a contribution path and the task board to claim work, attach evidence and request independent review. Shared tracking requires its database migration. Engineering, design, language, data and community work have separate paths; choosing a path changes recommendations, not permissions.",
    href: "/dashboard/start",
    keywords: [
      "task",
      "tasks",
      "start",
      "begin",
      "onboarding",
      "frontend",
      "backend",
      "design",
      "designer",
      "devops",
      "work",
      "role",
      "roles",
      "workspace",
    ],
  },
  {
    id: "speech",
    title: "Speech data and models are planned",
    text: "The speech roadmap covers consented recordings with checked transcripts, evaluation of existing recognition and speech-generation models, and documented developer releases. No collected-audio volume, trained model release or benchmark result is established by these notes. A two-speaker rehearsal is proposed before a larger collection pilot.",
    href: "/ai#ai-roadmap",
    keywords: [
      "speech",
      "voice",
      "audio",
      "recording",
      "recordings",
      "transcript",
      "transcription",
      "model",
      "models",
      "train",
      "training",
      "recognition",
      "tts",
      "asr",
    ],
  },
  {
    id: "developer",
    title: "Developer API and planning terms",
    text: "The public read-only API is GET /api/v1/entries with search, category, dialect and pagination parameters. Published resources keep source and licence information. The 1,000 English technology starter terms are research prompts awaiting Somali proposals and independent review; they are not an approved bilingual dictionary.",
    href: "/developers",
    keywords: [
      "api",
      "sdk",
      "developer",
      "developers",
      "dataset",
      "datasets",
      "download",
      "json",
      "jsonl",
      "endpoint",
      "integration",
      "technology",
      "terminology",
      "terms",
    ],
  },
  {
    id: "rights",
    title: "Sources, permissions and independent review",
    text: "Language contributions need provenance and an explicit redistribution licence. A citation does not establish permission. Uncertain rights stay permission pending. Authors cannot approve their own work. Speech recognition, synthetic voice use and public audio release need distinct permission choices and an approved collection process.",
    href: "/contributor-guide",
    keywords: [
      "license",
      "licence",
      "licensing",
      "permission",
      "permissions",
      "rights",
      "consent",
      "source",
      "sources",
      "review",
      "reviewer",
      "governance",
      "privacy",
      "safety",
    ],
  },
  {
    id: "budget",
    title: "Proposed pilot budget",
    text: "The preparation pack proposes a three-month pilot estimate of $1,746, rounded to a possible $1,800 fundraising target. It includes stated hosting, collection, transcription, review and evaluation allowances. It is not a verified current bill, secured funding or a promise of production-quality speech. Software/ML engineering and other exclusions are listed in the budget.",
    href: "https://github.com/AbdiazizNor114/QaamuusAi/blob/master/docs/funding/pilot-budget.md",
    keywords: [
      "budget",
      "funding",
      "fundraise",
      "fundraising",
      "cost",
      "costs",
      "price",
      "money",
      "sponsor",
      "hosting",
      "supabase",
      "vercel",
    ],
  },
  {
    id: "chat",
    title: "Project guide versus connected AI",
    text: "This project guide matches your question to curated project notes on your device. It is not a generative AI model and cannot answer arbitrary questions or inspect your account. Free AI chat is a separate mode using OpenRouter when a server key is configured. It sends recent messages to the model provider and has a shared free-tier allowance. This local guide mode never sends questions externally.",
    href: "/ai",
    keywords: [
      "chat",
      "chatbox",
      "free",
      "assistant",
      "ai",
      "question",
      "questions",
      "limit",
      "limits",
      "connected",
      "connect",
      "50",
    ],
  },
];
const stop = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "for",
  "is",
  "are",
  "can",
  "do",
  "does",
  "how",
  "what",
  "my",
  "i",
  "we",
  "you",
  "me",
  "it",
  "this",
  "with",
  "about",
  "tell",
  "please",
  "would",
  "like",
]);
const examples: Record<string, { text: string; code?: string }> = {
  developer: {
    text: "Run this JavaScript in a page on the QaamuusAI website, or adapt the relative URL to your own server. It searches published translations for ‘home’ and requests five results. An empty data array means no published matches, not an error. If the service is unavailable, the example reports the API error. No API key is required for this public read-only endpoint. Browser calls from another website are subject to the configured CORS allowlist.",
    code: `const params = new URLSearchParams({
  q: 'home',
  category: 'translation',
  page: '1',
  limit: '5'
});
const response = await fetch('/api/v1/entries?' + params);
const result = await response.json();
if (!response.ok) {
  throw new Error(result.error?.message ?? 'Request failed');
}
console.log(result.data);
console.log(result.pagination);`,
  },
  join: {
    text: "For example, a frontend developer can apply at /join with their name, email, field of study and professional role. After administrator approval, they open the newest invitation, set a password and sign in. This is an example of the workflow, not an approval or account created by this guide.",
  },
  tasks: {
    text: "A designer could choose the design contribution area and open the task board. If an appropriate task is open and its required dependencies are complete, they can claim it, start work, attach their design link and submit a handoff summary for independent review. Task tracking requires the workspace database migration.",
  },
  speech: {
    text: "For a proposed speech-recognition pilot, an adult participant would first receive the approved participant information and choose permitted uses. An authorized collector would record approved prompts privately; a transcriber and independent reviewer would check the transcript. This example describes a planned process, not an enabled upload service or permission to begin collecting.",
  },
  rights: {
    text: "For example, citing a dictionary page explains where a proposed term came from, but does not give permission to redistribute that dictionary’s content. If sharing rights are uncertain, keep the proposal marked permission pending and ask an independent reviewer to examine the evidence before publication.",
  },
  mission: {
    text: "For example, a developer could eventually use an evaluated Somali speech-recognition model to turn a spoken question into text, then use a suitable speech-generation model for spoken replies. QaamuusAI aims to provide the underlying datasets, models and tools; these speech model releases are still planned.",
  },
  budget: {
    text: "The draft collection example is 20 adults × 15 accepted minutes = 300 minutes, or five audio hours. Its proposed three-month total is $1,746, including listed allowances and contingency. It excludes software/ML engineering and other costs; it is not secured funding or a production-quality speech guarantee.",
  },
  chat: {
    text: "Try asking ‘How can I use the API?’ and then ‘Give me an example.’ This local guide can carry the previous project topic into a short follow-up. It still retrieves curated notes rather than generating arbitrary AI answers.",
  },
};
function exampleFor(note: GuideNote): GuideNote {
  const base = projectNotes.find((item) => item.id === note.id.replace(/-example$/, "")) ?? note;
  const example = examples[base.id];
  return example
    ? {
        ...base,
        id: base.id + "-example",
        title:
          base.id === "developer"
            ? "API example: search published translations"
            : base.title + " — example",
        text: example.text,
        code: example.code,
      }
    : base;
}
export function findProjectNotes(question: string, previousNotes: GuideNote[] = []): GuideNote[] {
  const normalized = question.normalize("NFC").toLowerCase();
  const words = new Set(
    (normalized.match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 1 && !stop.has(w)),
  );
  const matches = projectNotes
    .map((note) => ({
      note,
      score: note.keywords.reduce(
        (n, key) =>
          n + (key.includes(" ") ? (normalized.includes(key) ? 2 : 0) : words.has(key) ? 2 : 0),
        0,
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.note);
  const exampleRequest = /\b(example|examples|sample|snippet|illustrate|curl|javascript)\b/.test(
    normalized,
  );
  if (matches.length) return exampleRequest ? [exampleFor(matches[0])] : matches;
  const followUp =
    exampleRequest ||
    /^(?:please\s+)?(?:explain (?:more|that)|tell me more|more details|how do i do (?:that|it)|show me how)[?.!\s]*$/.test(
      normalized,
    );
  if (followUp && previousNotes.length)
    return exampleRequest ? [exampleFor(previousNotes[0])] : [previousNotes[0]];
  return [];
}
