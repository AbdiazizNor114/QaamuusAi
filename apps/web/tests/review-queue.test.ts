import { expect, it } from "vitest";
import { emptySharedState, reviewQueue, type SharedRecord } from "../src/lib/shared";

const user = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
function row(status: SharedRecord["status"], assigned: string | null = null, author = other) {
  return { id: crypto.randomUUID(), author_id: author, assigned_reviewer_id: assigned,
    status } as SharedRecord;
}
it("counts only actionable independent work for reviewers", () => {
  const eligible = [row("submitted"), row("submitted", user), row("under_review", user)];
  const state = { ...emptySharedState, user: { id: user }, roles: ["reviewer"] as const,
    revisions: [...eligible, row("draft"), row("submitted", other), row("approved", user),
      row("changes_requested", user), row("submitted", null, user)],
  };
  expect(reviewQueue({ ...state, roles: ["reviewer"] })).toEqual(eligible);
  expect(reviewQueue({ ...state, roles: ["technical_admin"] })).toEqual([]);
  expect(reviewQueue({ ...state, roles: ["reviewer"], user: null })).toEqual([]);
});
it("editors also count entries awaiting publication, but never their own", () => {
  const submitted = row("submitted", other);
  const approved = row("approved", other);
  expect(reviewQueue({ ...emptySharedState, user: { id: user }, roles: ["editor"],
    revisions: [submitted, approved, row("approved", other, user), row("published", other)],
  })).toEqual([submitted, approved]);
});
