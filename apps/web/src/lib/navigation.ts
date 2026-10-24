import type { SharedState } from "./shared";

// This controls discoverability only; server handlers and RLS authorize actions.
export function showWorkspaceLink(path: string, state: Pick<SharedState, "user" | "roles">): boolean {
  if (["datasets", "articles", "dashboard/releases"].includes(path)) return true;
  if (!state.user) return false;
  if (path === "admin/contributors") return state.roles.includes("technical_admin");
  if (path === "admin/roles")
    return state.roles.includes("editor") || state.roles.includes("technical_admin");
  if (path === "dashboard/reviews")
    return state.roles.includes("editor") || state.roles.includes("reviewer");
  return true;
}
