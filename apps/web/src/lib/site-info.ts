export const publicPages = {
  "": {
    title: "qaamuusAi | Somali language commons",
    description:
      "Browse published Somali vocabulary, translations and grammar with sources and licensing.",
  },
  datasets: {
    title: "Datasets | qaamuusAi",
    description: "Search published Somali language datasets and download openly licensed entries.",
  },
  technology: {
    title: "Terminology in progress | qaamuusAi",
    description:
      "1,000 English technology starter terms awaiting Somali proposals and independent review. Not an approved dictionary.",
  },
  developers: {
    title: "Developer API | qaamuusAi",
    description:
      "Use the public Somali language API and download versioned JSON, JSONL, attribution manifests and SHA-256 checksums.",
  },
  releases: {
    title: "Release history | qaamuusAi",
    description:
      "Frozen published dataset releases with licensing, attribution and verifiable downloads.",
  },
  articles: {
    title: "Articles | qaamuusAi",
    description: "Published community writing on Somali language, usage and the commons.",
  },
  about: {
    title: "About | qaamuusAi",
    description:
      "Our goal, community review process and ways to contribute to a Somali language commons.",
  },
} as const;
export function siteOrigin() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}
