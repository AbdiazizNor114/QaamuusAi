import { createHash } from "node:crypto";
type Release = { version: string; snapshot: unknown[]; license_manifest: unknown[] };
export function releaseFiles(release: Release) {
  const base = `qaamuusai-v${release.version.replace(/[^0-9.]/g, "")}`;
  const files = {
    json: {
      filename: `${base}.json`,
      type: "application/json",
      body: JSON.stringify(release.snapshot, null, 2) + "\n",
    },
    jsonl: {
      filename: `${base}.jsonl`,
      type: "application/x-ndjson",
      body:
        release.snapshot.map((row) => JSON.stringify(row)).join("\n") +
        (release.snapshot.length ? "\n" : ""),
    },
    manifest: {
      filename: `${base}-manifest.json`,
      type: "application/json",
      body: JSON.stringify(release.license_manifest, null, 2) + "\n",
    },
  };
  return Object.fromEntries(
    Object.entries(files).map(([key, file]) => [
      key,
      { ...file, sha256: createHash("sha256").update(file.body, "utf8").digest("hex") },
    ]),
  ) as Record<keyof typeof files, (typeof files)[keyof typeof files] & { sha256: string }>;
}
