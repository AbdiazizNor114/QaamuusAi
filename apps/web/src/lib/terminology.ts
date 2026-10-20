import { z } from "zod";
import { technologyTerms } from "./technology-terms";
import type { SharedRecord } from "./shared";

export type TechnologySeed = (typeof technologyTerms)[number];
const seeds = new Map(technologyTerms.map((term) => [term.id, term]));
const detailsSchema = z.object({
  kind: z.literal("qaamuusai.terminology"),
  format_version: z.literal(1),
  seed_id: z.string(),
  definition: z.string().trim().min(1).max(2000),
  example: z.string().trim().min(1).max(2000),
  alternatives: z.string().trim().max(1000),
  permission_evidence: z.string().trim().max(1000),
  notes: z.string().trim().max(2000),
});
export type TerminologyDetails = z.infer<typeof detailsSchema>;
// A versioned notes envelope preserves structured fields through existing save/review/snapshot RPCs.
export function readTerminology(notes: string): TerminologyDetails | null {
  try {
    const parsed = detailsSchema.safeParse(JSON.parse(notes));
    return parsed.success && seeds.has(parsed.data.seed_id) ? parsed.data : null;
  } catch {
    return null;
  }
}
export function terminologySeed(notes: string) {
  const details = readTerminology(notes);
  return details ? (seeds.get(details.seed_id) ?? null) : null;
}
export function writeTerminology(seed: TechnologySeed, form: FormData): string {
  return JSON.stringify(
    detailsSchema.parse({
      kind: "qaamuusai.terminology",
      format_version: 1,
      seed_id: seed.id,
      ...Object.fromEntries(
        ["definition", "example", "alternatives", "permission_evidence", "notes"].map((key) => [
          key,
          form.get(key) ?? "",
        ]),
      ),
    }),
  );
}
export function seedRecords(records: SharedRecord[]) {
  const grouped = new Map<string, SharedRecord[]>();
  for (const record of records) {
    const seed = terminologySeed(record.notes);
    if (seed) grouped.set(seed.id, [...(grouped.get(seed.id) ?? []), record]);
  }
  return grouped;
}
