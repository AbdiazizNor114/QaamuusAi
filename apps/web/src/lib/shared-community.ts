import { z } from "zod";
import { roles, statuses, entrySchema } from "@qaamuusai/schemas";
import { articleInput } from "./article-input";
const text = z.string().trim().min(1).max(10000);
export const sharedArticleSchema = articleInput.extend({
  id: z.uuid(),
  author_id: z.uuid(),
  reviewer_id: z.uuid().nullable().optional(),
  article_id: z.uuid().nullable().optional(),
  parent_id: z.uuid().nullable().optional(),
  assigned_reviewer_id: z.uuid().nullable().optional(),
  approved_by: z.uuid().nullable().optional(),
  status: z.enum(statuses).optional(),
  version: z.number().int().positive(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});
export const sharedCommunitySchema = z.object({
  articles: z.array(sharedArticleSchema),
  articleRevisions: z.array(sharedArticleSchema),
  applications: z.array(
    z.object({
      id: z.uuid(),
      applicant_id: z.uuid(),
      expertise: z.string(),
      rationale: z.string(),
      status: z.enum(["pending", "accepted", "declined"]),
      decision: z.string().nullable(),
      decided_by: z.uuid().nullable(),
      created_at: z.string(),
    }),
  ),
  members: z.array(
    z.object({ id: z.uuid(), display_name: z.string(), roles: z.array(z.enum(roles)) }),
  ),
  audit: z.array(
    z.object({
      id: z.uuid(),
      actor_id: z.uuid().nullable(),
      action: z.string(),
      record_id: z.uuid().nullable(),
      details: z.record(z.string(), z.unknown()),
      created_at: z.string(),
    }),
  ),
  releases: z.array(
    z.object({
      id: z.uuid(),
      version: z.string(),
      notes: z.string(),
      published_by: z.uuid(),
      created_at: z.string(),
      snapshot: z.array(
        entrySchema.extend({
          created_at: z.iso.datetime({ offset: true }),
          updated_at: z.iso.datetime({ offset: true }),
        }),
      ),
      license_manifest: z.array(
        z.object({
          id: z.uuid(),
          version: z.number(),
          license: z.string(),
          source: z.string(),
          attribution: z.string(),
        }),
      ),
    }),
  ),
  decisions: z.array(
    z.object({
      id: z.uuid(),
      revision_id: z.uuid(),
      reviewer_id: z.uuid(),
      decision: z.enum(statuses),
      rationale: z.string(),
      created_at: z.string(),
    }),
  ),
});
export type SharedCommunity = z.infer<typeof sharedCommunitySchema>;
export type SharedArticle = z.infer<typeof sharedArticleSchema>;
export function articleActionCount(workspace: { user: { id: string } | null; roles: string[] }, community: SharedCommunity) {
  if (!workspace.user) return 0;
  const user = workspace.user.id;
  const editor = workspace.roles.includes("editor");
  const reviewer = workspace.roles.includes("reviewer");
  return community.articleRevisions.filter((article) => {
    if (article.author_id === user) return article.status === "changes_requested";
    if (editor) return ["submitted", "under_review", "approved", "disputed"].includes(article.status ?? "");
    return reviewer && (
      (article.status === "submitted" && (!article.assigned_reviewer_id || article.assigned_reviewer_id === user)) ||
      (article.status === "under_review" && article.assigned_reviewer_id === user)
    );
  }).length;
}
export const emptySharedCommunity: SharedCommunity = {
  articles: [],
  articleRevisions: [],
  applications: [],
  members: [],
  audit: [],
  releases: [],
  decisions: [],
};
export const communityCommands = {
  apply: z.object({ expertise: text, rationale: text }),
  decide: z.object({ application: z.uuid(), accept: z.boolean(), reason: text }),
  role: z.object({ member: z.uuid(), wanted: z.enum(roles), remove: z.boolean(), reason: text }),
  article: z.object({
    content: articleInput,
    revision: z.uuid().nullable().default(null),
    original: z.uuid().nullable().default(null),
  }),
  transition: z.object({ revision: z.uuid(), next_status: z.enum(statuses), reason: text }),
  release: z.object({
    release_version: z.string().regex(/^\d+\.\d+\.\d+$/),
    entries: z
      .array(z.uuid())
      .min(1)
      .max(500)
      .refine((ids) => new Set(ids).size === ids.length),
    notes: text,
  }),
};
export const communityRPC = {
  apply: "apply_scholar",
  decide: "decide_scholar",
  role: "change_member_role",
  article: "save_article_proposal",
  transition: "transition_article",
  release: "publish_dataset_release",
} as const;
