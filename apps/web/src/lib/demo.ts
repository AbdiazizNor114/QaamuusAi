import {
  type Entry,
  type Role,
  type Status,
  canTransition,
  proposalSchema,
  entrySchema,
  roles,
} from "@qaamuusai/schemas";
import {
  communitySchema,
  initialCommunity,
  hasPermission,
  canDiscuss,
  type Community,
} from "./community";
import { z } from "zod";
export const demoTime = "2026-10-12T09:00:00.000Z";
const base = {
  source: "qaamuusAi authored demonstration; not scholar-verified",
  license: "CC0-1.0" as const,
  dialect: "Unspecified",
  contributor: "Demo contributor",
  reviewer: "Demo reviewer",
  version: 1,
  demonstration: true,
  created_at: demoTime,
  updated_at: demoTime,
};
export const demoEntries: Entry[] = [
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000001",
    category: "vocabulary",
    term: "buug",
    translation: "book",
    notes: "Demonstration noun entry.",
    status: "published",
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000002",
    category: "vocabulary",
    term: "biyo",
    translation: "water",
    notes: "Demonstration vocabulary entry.",
    status: "published",
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000003",
    category: "translation",
    term: "Subax wanaagsan",
    translation: "Good morning",
    notes: "Demonstration greeting.",
    status: "published",
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000004",
    category: "grammar",
    term: "Magac",
    translation: "Noun",
    notes: "Demonstration grammatical label; not a complete grammar rule.",
    status: "published",
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000005",
    category: "vocabulary",
    term: "qalin",
    translation: "pen",
    notes: "Please verify the proposed gloss against a cited source.",
    status: "submitted",
    reviewer: null,
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000006",
    category: "translation",
    term: "Mahadsanid",
    translation: "Thank you",
    notes: "Discuss accepted regional variants before publishing.",
    status: "disputed",
  },
];
export type Event = {
  id: string;
  entryId: string;
  actor: string;
  action: string;
  rationale: string;
  at: string;
  snapshot: Entry;
};
export type Evidence = {
  id: string;
  entryId: string;
  actor: string;
  position: string;
  source: string;
  at: string;
};
export type Workspace = {
  entries: Entry[];
  events: Event[];
  evidence: Evidence[];
  role: Role;
  community: Community;
};
export const initialWorkspace: Workspace = {
  entries: demoEntries,
  events: [],
  evidence: [],
  role: "contributor",
  community: initialCommunity,
};
export const actors: Record<Role, string> = {
  contributor: "Demo contributor",
  reviewer: "Demo reviewer",
  editor: "Demo editor",
  technical_admin: "Demo administrator",
};
export function advance(
  workspace: Workspace,
  id: string,
  to: Status,
  rationale: string,
): Workspace {
  const entry = workspace.entries.find((e) => e.id === id);
  if (!entry) throw new Error("Entry not found.");
  const actor = actors[workspace.role];
  const assignment = workspace.community.assignments.find((a) => a.entryId === id);
  if (
    to !== "submitted" &&
    assignment &&
    assignment.reviewer !== workspace.role &&
    !hasPermission(workspace.community, workspace.role, "editor")
  )
    throw new Error("This proposal is assigned to another reviewer.");
  const permission =
    to === "submitted"
      ? "contributor"
      : hasPermission(workspace.community, workspace.role, "editor")
        ? "editor"
        : "reviewer";
  if (
    !hasPermission(workspace.community, workspace.role, permission) ||
    !canTransition(entry.status, to, permission, entry.contributor === actor)
  )
    throw new Error("Your current role cannot make this decision.");
  if (!rationale.trim()) throw new Error("Add a rationale before recording this decision.");
  if (to === "published" && entry.license === "Permission pending")
    throw new Error("Redistribution permission is required before publishing.");
  const at = new Date().toISOString();
  const updated = {
    ...entry,
    status: to,
    updated_at: at,
    reviewer: to === "approved" ? actor : entry.reviewer,
  };
  return {
    ...workspace,
    community:
      entry.status === "disputed"
        ? {
            ...workspace.community,
            resolutions: [
              ...workspace.community.resolutions,
              { entryId: id, editor: workspace.role, rationale: rationale.trim(), at },
            ],
          }
        : workspace.community,
    entries: workspace.entries.map((e) => (e.id === id ? updated : e)),
    events: [
      ...workspace.events,
      {
        id: crypto.randomUUID(),
        entryId: id,
        actor,
        action: to,
        rationale: rationale.trim(),
        at,
        snapshot: updated,
      },
    ],
  };
}
export function restoreWorkspace(input: unknown): Workspace {
  return z
    .object({
      entries: z.array(entrySchema),
      role: z.enum(roles),
      events: z.array(
        z.object({
          id: z.uuid(),
          entryId: z.uuid(),
          actor: z.string(),
          action: z.string(),
          rationale: z.string(),
          at: z.iso.datetime(),
          snapshot: entrySchema,
        }),
      ),
      evidence: z.array(
        z.object({
          id: z.uuid(),
          entryId: z.uuid(),
          actor: z.string(),
          position: z.string(),
          source: z.string(),
          at: z.iso.datetime(),
        }),
      ),
      community: communitySchema.default(() => structuredClone(initialCommunity)),
    })
    .parse(input);
}
export function addEvidence(workspace: Workspace, entry: Entry, input: unknown): Workspace {
  const data = z
    .object({
      position: z.string().trim().min(1).max(10000),
      source: z.string().trim().min(1).max(10000),
    })
    .parse(input);
  if (entry.status !== "disputed" || !canDiscuss(workspace.community, workspace.role, entry))
    throw new Error("Editorial access is required to add evidence.");
  return {
    ...workspace,
    evidence: [
      ...workspace.evidence,
      {
        ...data,
        id: crypto.randomUUID(),
        entryId: entry.id,
        actor: actors[workspace.role],
        at: new Date().toISOString(),
      },
    ],
  };
}
export function propose(workspace: Workspace, input: unknown, original?: Entry): Workspace {
  if (
    workspace.role !== "contributor" ||
    !hasPermission(workspace.community, workspace.role, "contributor")
  )
    throw new Error("Switch to the contributor role to submit a proposal.");
  const data = proposalSchema.parse(input);
  const at = new Date().toISOString();
  const entry: Entry = {
    ...data,
    id: crypto.randomUUID(),
    contributor: actors.contributor,
    reviewer: null,
    status: "draft",
    version: original ? original.version + 1 : 1,
    demonstration: true,
    created_at: at,
    updated_at: at,
  };
  return {
    ...workspace,
    entries: [entry, ...workspace.entries],
    events: [
      ...workspace.events,
      {
        id: crypto.randomUUID(),
        entryId: entry.id,
        actor: actors.contributor,
        action: original ? `correction of ${original.id}` : "draft",
        rationale: "Proposal created",
        at,
        snapshot: entry,
      },
    ],
  };
}
export function revise(workspace: Workspace, id: string, input: unknown): Workspace {
  const entry = workspace.entries.find((e) => e.id === id);
  if (
    !entry ||
    workspace.role !== "contributor" ||
    !hasPermission(workspace.community, workspace.role, "contributor") ||
    entry.contributor !== actors.contributor ||
    !["draft", "changes_requested"].includes(entry.status)
  )
    throw new Error("Only your editable proposals can be revised.");
  const data = proposalSchema.parse(input);
  const at = new Date().toISOString();
  const updated = { ...entry, ...data, updated_at: at };
  return {
    ...workspace,
    entries: workspace.entries.map((e) => (e.id === id ? updated : e)),
    events: [
      ...workspace.events,
      {
        id: crypto.randomUUID(),
        entryId: id,
        actor: actors.contributor,
        action: "draft_updated",
        rationale: "Proposal content revised",
        at,
        snapshot: updated,
      },
    ],
  };
}
