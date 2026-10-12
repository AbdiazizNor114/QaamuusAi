import { z } from "zod";
import {
  canExport,
  canTransition,
  entrySchema,
  roles,
  statuses,
  type Entry,
  type Role,
  type Status,
} from "@qaamuusai/schemas";

const text = z.string().trim().min(1).max(10000);
const timestamp = z.iso.datetime();
export const memberSchema = z.object({
  id: z.enum(roles),
  name: z.string().trim().min(1).max(120),
  expertise: z.string().max(2000),
  bio: z.string().max(2000),
  roles: z.array(z.enum(roles)).min(1),
  onboarded: z.boolean(),
});
export const applicationSchema = z.object({
  id: z.uuid(),
  applicant: z.enum(roles),
  expertise: text,
  rationale: text,
  status: z.enum(["pending", "accepted", "declined"]),
  decision: z.string(),
  decidedBy: z.enum(roles).nullable(),
  createdAt: timestamp,
});
export const articleInput = z.object({
  title: text,
  summary: text,
  body: text,
  source: text,
  license: z.enum(["CC0-1.0", "CC-BY-4.0", "Permission pending"]),
});
export const articleSchema = articleInput.extend({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
  author: z.enum(roles),
  reviewer: z.enum(roles).nullable(),
  status: z.enum(statuses),
  version: z.number().int().positive(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
const auditSchema = z.object({
  id: z.uuid(),
  actor: z.enum(roles),
  action: text,
  target: text,
  rationale: text,
  at: timestamp,
  snapshot: z.string(),
});
const releaseSchema = z.object({
  id: z.uuid(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  notes: text,
  createdBy: z.enum(roles),
  createdAt: timestamp,
  entries: z.array(entrySchema).min(1),
  manifest: z.array(
    z.object({
      id: z.uuid(),
      version: z.number().int().positive(),
      license: text,
      source: text,
      attribution: text,
    }),
  ),
});
export const communitySchema = z
  .object({
    members: z.array(memberSchema),
    applications: z.array(applicationSchema),
    articles: z.array(articleSchema),
    audit: z.array(auditSchema),
    releases: z.array(releaseSchema),
    assignments: z.array(z.object({ entryId: z.uuid(), reviewer: z.enum(roles) })),
    comments: z.array(
      z.object({
        id: z.uuid(),
        entryId: z.uuid(),
        author: z.enum(roles),
        body: text,
        createdAt: timestamp,
      }),
    ),
    resolutions: z.array(
      z.object({ entryId: z.uuid(), editor: z.enum(roles), rationale: text, at: timestamp }),
    ),
  })
  .refine(
    (state) => roles.every((role) => state.members.filter((m) => m.id === role).length === 1),
    "All demo identities must be present exactly once.",
  );
export type Community = z.infer<typeof communitySchema>;
export type Article = z.infer<typeof articleSchema>;
const now = () => new Date().toISOString();
const identityNames: Record<Role, string> = {
  contributor: "Demo contributor",
  reviewer: "Demo reviewer",
  editor: "Demo editor",
  technical_admin: "Demo administrator",
};
export const initialCommunity: Community = {
  members: roles.map((role) => ({
    id: role,
    name: `Demo ${role.replaceAll("_", " ")}`,
    expertise: "",
    bio: "",
    roles: [role],
    onboarded: role !== "contributor",
  })),
  applications: [],
  articles: [],
  audit: [],
  releases: [],
  assignments: [],
  comments: [],
  resolutions: [],
};
export function hasPermission(state: Community, identity: Role, permission: Role): boolean {
  return !!state.members.find((m) => m.id === identity)?.roles.includes(permission);
}
function record(
  state: Community,
  actor: Role,
  action: string,
  target: string,
  rationale: string,
  snapshot: unknown,
): Community {
  return {
    ...state,
    audit: [
      ...state.audit,
      {
        id: crypto.randomUUID(),
        actor,
        action,
        target,
        rationale,
        at: now(),
        snapshot: JSON.stringify(snapshot),
      },
    ],
  };
}
function requireReason(reason: string) {
  if (!reason.trim()) throw new Error("A rationale is required.");
}
export function saveProfile(state: Community, actor: Role, input: unknown): Community {
  const profile = memberSchema.pick({ name: true, expertise: true, bio: true }).parse(input);
  const members = state.members.map((m) =>
    m.id === actor ? { ...m, ...profile, onboarded: true } : m,
  );
  return record(
    { ...state, members },
    actor,
    "profile_updated",
    actor,
    "Demo profile completed",
    profile,
  );
}
export function applyScholar(state: Community, actor: Role, input: unknown): Community {
  const data = applicationSchema.pick({ expertise: true, rationale: true }).parse(input);
  if (state.applications.some((a) => a.applicant === actor && a.status === "pending"))
    throw new Error("An application is already pending.");
  const application = {
    ...data,
    id: crypto.randomUUID(),
    applicant: actor,
    status: "pending" as const,
    decision: "",
    decidedBy: null,
    createdAt: now(),
  };
  return record(
    { ...state, applications: [application, ...state.applications] },
    actor,
    "scholar_applied",
    application.id,
    data.rationale,
    application,
  );
}
export function grantRole(
  state: Community,
  actor: Role,
  target: Role,
  role: Role,
  reason: string,
  revoke = false,
): Community {
  requireReason(reason);
  if (actor === target) throw new Error("You cannot change your own roles.");
  const editorial = role === "editor" || role === "reviewer";
  if (!hasPermission(state, actor, editorial ? "editor" : "technical_admin"))
    throw new Error("This role grant requires the appropriate authority.");
  const member = state.members.find((m) => m.id === target);
  if (!member) throw new Error("Member not found.");
  const updatedRoles = revoke
    ? member.roles.filter((r) => r !== role)
    : Array.from(new Set([...member.roles, role]));
  if (!updatedRoles.length) throw new Error("A member must retain at least one role.");
  if (
    updatedRoles.length === member.roles.length &&
    updatedRoles.every((r) => member.roles.includes(r))
  )
    throw new Error("No role change to record.");
  const updated = { ...member, roles: updatedRoles };
  if (
    !state.members.some((m) =>
      m.id === target ? updatedRoles.includes("editor") : m.roles.includes("editor"),
    )
  )
    throw new Error("The community must retain an editor.");
  return record(
    { ...state, members: state.members.map((m) => (m.id === target ? updated : m)) },
    actor,
    revoke ? "role_revoked" : "role_granted",
    target,
    reason,
    updated,
  );
}
export function decideScholar(
  state: Community,
  actor: Role,
  id: string,
  accept: boolean,
  reason: string,
): Community {
  requireReason(reason);
  const application = state.applications.find((a) => a.id === id);
  if (!application || application.status !== "pending")
    throw new Error("Pending application required.");
  if (!hasPermission(state, actor, "editor") || actor === application.applicant)
    throw new Error("An independent editor must decide this application.");
  let next = state;
  if (accept && !hasPermission(next, application.applicant, "reviewer"))
    next = grantRole(next, actor, application.applicant, "reviewer", reason);
  const updated = {
    ...application,
    status: accept ? ("accepted" as const) : ("declined" as const),
    decision: reason,
    decidedBy: actor,
  };
  return record(
    { ...next, applications: next.applications.map((a) => (a.id === id ? updated : a)) },
    actor,
    accept ? "scholar_accepted" : "scholar_declined",
    id,
    reason,
    updated,
  );
}
export function assignReview(
  state: Community,
  actor: Role,
  entry: Entry,
  reviewer: Role,
  reason: string,
): Community {
  requireReason(reason);
  if (!hasPermission(state, actor, "editor")) throw new Error("An editor must assign reviews.");
  if (!hasPermission(state, reviewer, "reviewer") && !hasPermission(state, reviewer, "editor"))
    throw new Error("Choose an authorized reviewer.");
  if (entry.contributor === identityNames[reviewer])
    throw new Error("Authors cannot review their own proposals.");
  if (!["submitted", "under_review", "changes_requested"].includes(entry.status))
    throw new Error("This proposal cannot be assigned.");
  const assignment = { entryId: entry.id, reviewer };
  return record(
    {
      ...state,
      assignments: [...state.assignments.filter((a) => a.entryId !== entry.id), assignment],
    },
    actor,
    "review_assigned",
    entry.id,
    reason,
    assignment,
  );
}
export function addComment(state: Community, actor: Role, entry: Entry, body: string): Community {
  const data = text.parse(body);
  if (!canDiscuss(state, actor, entry)) throw new Error("Editorial participation is required.");
  if (["published", "superseded"].includes(entry.status))
    throw new Error("Published entries require a correction proposal.");
  const comment = {
    id: crypto.randomUUID(),
    entryId: entry.id,
    author: actor,
    body: data,
    createdAt: now(),
  };
  return record(
    { ...state, comments: [...state.comments, comment] },
    actor,
    "comment_added",
    entry.id,
    data,
    comment,
  );
}
export function canDiscuss(state: Community, actor: Role, entry: Entry): boolean {
  if (entry.contributor === identityNames[actor]) return hasPermission(state, actor, "contributor");
  if (hasPermission(state, actor, "editor")) return true;
  const assigned = state.assignments.find((a) => a.entryId === entry.id);
  return (
    hasPermission(state, actor, "reviewer") &&
    (!assigned || assigned.reviewer === actor) &&
    !["draft", "changes_requested"].includes(entry.status)
  );
}
export function addArticleEvidence(
  state: Community,
  actor: Role,
  article: Article,
  position: string,
  source: string,
): Community {
  const data = z.object({ position: text, source: text }).parse({ position, source });
  if (article.status !== "disputed") throw new Error("A disputed article is required.");
  if (
    article.author !== actor &&
    !hasPermission(state, actor, "reviewer") &&
    !hasPermission(state, actor, "editor")
  )
    throw new Error("Editorial participation is required.");
  return record(state, actor, "article_evidence", article.id, data.position, data);
}
export function saveArticle(
  state: Community,
  actor: Role,
  input: unknown,
  original?: Article,
): Community {
  const data = articleInput.parse(input);
  if (!hasPermission(state, actor, "contributor"))
    throw new Error("Contributor permission is required.");
  const edit = original && original.status !== "published";
  if (
    edit &&
    (original.author !== actor || !["draft", "changes_requested"].includes(original.status))
  )
    throw new Error("Only your editable article proposals can be changed.");
  const article: Article = edit
    ? { ...original, ...data, updatedAt: now() }
    : {
        ...data,
        id: crypto.randomUUID(),
        parentId: original?.id ?? null,
        author: actor,
        reviewer: null,
        status: "draft",
        version: original ? original.version + 1 : 1,
        createdAt: now(),
        updatedAt: now(),
      };
  return record(
    {
      ...state,
      articles: edit
        ? state.articles.map((a) => (a.id === article.id ? article : a))
        : [article, ...state.articles],
    },
    actor,
    edit ? "article_updated" : "article_created",
    article.id,
    "Article proposal saved",
    article,
  );
}
export function transitionArticle(
  state: Community,
  actor: Role,
  id: string,
  to: Status,
  reason: string,
): Community {
  requireReason(reason);
  const article = state.articles.find((a) => a.id === id);
  if (!article) throw new Error("Article not found.");
  const permission =
    to === "submitted"
      ? "contributor"
      : hasPermission(state, actor, "editor")
        ? "editor"
        : "reviewer";
  if (
    !hasPermission(state, actor, permission) ||
    !canTransition(article.status, to, permission, article.author === actor)
  )
    throw new Error("Your current role cannot make this decision.");
  if (to === "published" && (article.license === "Permission pending" || !article.reviewer))
    throw new Error("Approval and redistribution permission are required.");
  const updated = {
    ...article,
    status: to,
    reviewer: to === "approved" ? actor : article.reviewer,
    updatedAt: now(),
  };
  return record(
    { ...state, articles: state.articles.map((a) => (a.id === id ? updated : a)) },
    actor,
    `article_${to}`,
    id,
    reason,
    updated,
  );
}
export function createRelease(
  state: Community,
  actor: Role,
  entries: Entry[],
  version: string,
  notes: string,
): Community {
  if (!hasPermission(state, actor, "editor"))
    throw new Error("An editor must publish dataset releases.");
  requireReason(notes);
  if (state.releases.some((r) => r.version === version))
    throw new Error("Release versions are immutable and must be unique.");
  const selected = entries.filter(canExport);
  if (!selected.length || selected.length !== entries.length)
    throw new Error("Select only published, redistributable entries.");
  const release = releaseSchema.parse({
    id: crypto.randomUUID(),
    version,
    notes,
    createdBy: actor,
    createdAt: now(),
    entries: structuredClone(selected),
    manifest: selected.map((e) => ({
      id: e.id,
      version: e.version,
      license: e.license,
      source: e.source,
      attribution: e.contributor,
    })),
  });
  return record(
    { ...state, releases: [release, ...state.releases] },
    actor,
    "release_created",
    release.id,
    notes,
    release,
  );
}
