import { expect, it } from "vitest";
import { workspaceCounts } from "../src/lib/workspace-counts";
import { emptySharedState, type SharedRecord } from "../src/lib/shared";
import { emptySharedCommunity, type SharedCommunity } from "../src/lib/shared-community";
it("counts published data, open visible disputes and independent pending applications", () => {
  const state = { ...emptySharedState, user: { id: "editor" },
    revisions: [{ id: "revision", status: "disputed" } as SharedRecord],
    entries: [{} as SharedRecord, {} as SharedRecord],
    disputes: [
      { id: "one", revision_id: "revision", position: "Evidence", resolution: null, resolved_at: null },
      { id: "two", revision_id: "revision", position: "Evidence", resolution: "Resolved", resolved_at: "date" },
    ],
  };
  const community = { ...emptySharedCommunity, applications: [
    { applicant_id: "other", status: "pending" }, { applicant_id: "editor", status: "pending" },
    { applicant_id: "third", status: "accepted" },
  ] } as SharedCommunity;
  expect(workspaceCounts({ ...state, roles: ["editor"] }, community)).toEqual({ datasets: 2, submissions: 0, disputes: 1, scholars: 1 });
  expect(workspaceCounts({ ...state, roles: ["reviewer"] }, community).scholars).toBe(0);
  expect(workspaceCounts({ ...state, user: null }, community)).toEqual({ datasets: 2, submissions: 0, disputes: 0, scholars: 0 });
});
it("counts only the signed-in author's submissions returned for corrections", () => {
  const state = { ...emptySharedState, user: { id: "author" }, revisions: [
    { author_id: "author", status: "changes_requested" },
    { author_id: "other", status: "changes_requested" },
    { author_id: "author", status: "draft" },
    { author_id: "author", status: "submitted" },
  ] as SharedRecord[] };
  expect(workspaceCounts(state, emptySharedCommunity).submissions).toBe(1);
  state.revisions[0].status = "submitted";
  expect(workspaceCounts(state, emptySharedCommunity).submissions).toBe(0);
});
