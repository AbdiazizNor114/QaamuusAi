import type { SharedState } from "./shared";
import type { SharedCommunity } from "./shared-community";

export function workspaceCounts(state: SharedState, community: SharedCommunity) {
  const disputed = new Set(state.revisions.filter((row) => row.status === "disputed").map((row) => row.id));
  return {
    datasets: state.entries.length,
    submissions: state.user ? state.revisions.filter((row) => row.author_id === state.user?.id && row.status === "changes_requested").length : 0,
    disputes: state.user ? state.disputes.filter((item) => !item.resolved_at && disputed.has(item.revision_id)).length : 0,
    scholars: state.user && state.roles.includes("editor")
      ? community.applications.filter((item) => item.status === "pending" && item.applicant_id !== state.user?.id).length
      : 0,
  };
}
