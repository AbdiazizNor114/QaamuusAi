import { z } from "zod";
import { categories, roles, statuses, proposalSchema } from "@qaamuusai/schemas";

export const sharedRecordSchema = proposalSchema.extend({
  id: z.uuid(),
  author_id: z.uuid().optional(),
  contributor_id: z.uuid().optional(),
  assigned_reviewer_id: z.uuid().nullable().optional(),
  reviewer_id: z.uuid().optional(),
  status: z.enum(statuses).optional(),
  version: z.number().int().positive(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SharedRecord = z.infer<typeof sharedRecordSchema>;
export const sharedStateSchema = z.object({
  configured: z.boolean(),
  user: z.object({ id: z.uuid(), email: z.string().optional() }).nullable(),
  profile: z.object({ display_name: z.string() }).nullable(),
  roles: z.array(z.enum(roles)),
  entries: z.array(sharedRecordSchema),
  revisions: z.array(sharedRecordSchema),
  comments: z.array(
    z.object({
      id: z.uuid(),
      revision_id: z.uuid(),
      author_id: z.uuid(),
      body: z.string(),
      created_at: z.string(),
    }),
  ),
  disputes: z.array(
    z.object({
      id: z.uuid(),
      revision_id: z.uuid(),
      position: z.string(),
      resolution: z.string().nullable(),
      resolved_at: z.string().nullable(),
    }),
  ),
  evidence: z.array(z.object({
    id: z.uuid(),
    dispute_id: z.uuid(),
    author_id: z.uuid(),
    position: z.string(),
    source: z.string(),
    created_at: z.string(),
  })).default([]),
  reviewHistory: z.array(z.object({
    id: z.uuid(), revision_id: z.uuid(), reviewer_id: z.uuid(),
    decision: z.enum(statuses), rationale: z.string(), created_at: z.string(),
  })).default([]),
  revisionHistory: z.array(z.object({
    id: z.uuid(), record_id: z.uuid(), actor_id: z.uuid().nullable(),
    action: z.enum(["revision_created", "revision_snapshot"]), created_at: z.string(),
    details: z.object({ after: sharedRecordSchema }),
  })).default([]),
});
export type SharedState = z.infer<typeof sharedStateSchema>;
export function reviewQueue(state: SharedState): SharedRecord[] {
  if (!state.user) return [];
  const editor = state.roles.includes("editor");
  const reviewer = state.roles.includes("reviewer");
  return state.revisions.filter((row) => {
    if (row.author_id === state.user?.id) return false;
    if (editor) return ["submitted", "under_review", "approved"].includes(row.status ?? "");
    return reviewer && (
      (row.status === "submitted" && (!row.assigned_reviewer_id || row.assigned_reviewer_id === state.user?.id)) ||
      (row.status === "under_review" && row.assigned_reviewer_id === state.user?.id)
    );
  });
}
export const emptySharedState: SharedState = {
  configured: false,
  user: null,
  profile: null,
  roles: [],
  entries: [],
  revisions: [],
  comments: [],
  disputes: [],
  evidence: [],
  reviewHistory: [],
  revisionHistory: [],
};
export const sharedCategories = categories;
