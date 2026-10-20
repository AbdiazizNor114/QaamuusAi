import { expect, it } from "vitest";
import { showWorkspaceLink } from "../src/lib/navigation";
import type { SharedState } from "../src/lib/shared";
const state = (roles: SharedState["roles"], signedIn = true) => ({ user: signedIn ? { id: "test" } : null, roles });
it("shows role administration only to editorial or technical administrators", () => {
  for (const roles of [[], ["contributor"], ["reviewer"]] as SharedState["roles"][])
    expect(showWorkspaceLink("admin/roles", state(roles))).toBe(false);
  for (const roles of [["editor"], ["technical_admin"], ["editor", "technical_admin"]] as SharedState["roles"][])
    expect(showWorkspaceLink("admin/roles", state(roles))).toBe(true);
  expect(showWorkspaceLink("admin/roles", state(["editor"], false))).toBe(false);
});
it("review queues follow editorial rather than technical authority", () => {
  expect(showWorkspaceLink("dashboard/reviews", state(["technical_admin"]))).toBe(false);
  expect(showWorkspaceLink("dashboard/reviews", state(["reviewer"]))).toBe(true);
  expect(showWorkspaceLink("dashboard/reviews", state(["editor"]))).toBe(true);
});
it("keeps public data available and signed-in contribution routes accessible", () => {
  for (const path of ["datasets", "articles", "dashboard/releases"])
    expect(showWorkspaceLink(path, state([], false))).toBe(true);
  for (const path of ["dashboard", "dashboard/profile", "dashboard/submissions", "dashboard/scholars", "dashboard/articles", "dashboard/disputes"]) {
    expect(showWorkspaceLink(path, state([]))).toBe(true);
    expect(showWorkspaceLink(path, state([], false))).toBe(false);
  }
});
