import { expect, it } from "vitest";
import { articleActionCount, emptySharedCommunity, type SharedArticle } from "../src/lib/shared-community";
const user = "author", other = "other";
const article = (status: SharedArticle["status"], author = other, assigned: string | null = user) =>
  ({ status, author_id: author, assigned_reviewer_id: assigned }) as SharedArticle;
it("counts returned own articles and independent actionable reviews", () => {
  const community = { ...emptySharedCommunity, articleRevisions: [
    article("changes_requested", user), article("draft", user), article("submitted", user),
    article("submitted", other, null), article("under_review"), article("approved"),
    article("submitted", other, "someone-else"), article("disputed"),
  ] };
  expect(articleActionCount({ user: { id: user }, roles: [] }, community)).toBe(1);
  expect(articleActionCount({ user: { id: user }, roles: ["reviewer"] }, community)).toBe(3);
  expect(articleActionCount({ user: { id: user }, roles: ["editor"] }, community)).toBe(6);
  expect(articleActionCount({ user: null, roles: ["editor"] }, community)).toBe(0);
});
