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
});
export type SharedState = z.infer<typeof sharedStateSchema>;
export const emptySharedState: SharedState = {
  configured: false,
  user: null,
  profile: null,
  roles: [],
  entries: [],
  revisions: [],
  comments: [],
  disputes: [],
};
export const sharedCategories = categories;
