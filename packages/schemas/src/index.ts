import { z } from "zod";

export const statuses = [
  "draft",
  "submitted",
  "under_review",
  "changes_requested",
  "approved",
  "published",
  "rejected",
  "disputed",
  "superseded",
] as const;
export const categories = ["vocabulary", "translation", "grammar"] as const;
export const roles = ["contributor", "reviewer", "editor", "technical_admin"] as const;
export type Role = (typeof roles)[number];
export type Status = (typeof statuses)[number];
const text = z.string().trim().min(1).max(10000);
export const entrySchema = z.object({
  id: z.uuid(),
  category: z.enum(categories),
  term: text,
  translation: text,
  notes: z.string().max(10000).default(""),
  source: text,
  license: z.enum(["CC0-1.0", "CC-BY-4.0", "Permission pending"]),
  dialect: text,
  contributor: text,
  reviewer: text.nullable(),
  status: z.enum(statuses),
  version: z.number().int().positive(),
  demonstration: z.boolean(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
export type Entry = z.infer<typeof entrySchema>;
export const proposalSchema = entrySchema.pick({
  category: true,
  term: true,
  translation: true,
  notes: true,
  source: true,
  license: true,
  dialect: true,
});
export const transitions: Record<Status, Status[]> = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["changes_requested", "approved", "rejected", "disputed"],
  changes_requested: ["submitted"],
  approved: ["published"],
  published: ["superseded"],
  rejected: [],
  disputed: ["under_review"],
  superseded: [],
};
export function canTransition(from: Status, to: Status, role: Role, own: boolean): boolean {
  if (!transitions[from].includes(to)) return false;
  if (to === "submitted") return own && role === "contributor";
  if (to === "published" || from === "disputed" || to === "superseded")
    return role === "editor" && !own;
  return !own && (role === "reviewer" || role === "editor");
}
export function canExport(entry: Entry): boolean {
  return (
    entry.status === "published" &&
    entry.reviewer !== null &&
    ["CC0-1.0", "CC-BY-4.0"].includes(entry.license)
  );
}
