import { describe, it, expect } from "vitest";
import {
  applyScholar,
  decideScholar,
  grantRole,
  initialCommunity,
  saveArticle,
  transitionArticle,
  createRelease,
  saveProfile,
  assignReview,
  addComment,
} from "../src/lib/community";
import { initialWorkspace, advance, restoreWorkspace } from "../src/lib/demo";
const article = {
  title: "Sourced example",
  summary: "Demo summary",
  body: "Authored educational demo",
  source: "Original authored material",
  license: "CC-BY-4.0",
};
describe("community authority and persistence", () => {
  it("audits independent scholar decisions and rejects self-elevation and admin editorial grants", () => {
    const applied = applyScholar(initialCommunity, "contributor", {
      expertise: "Demo language study",
      rationale: "Synthetic qualifications",
    });
    const id = applied.applications[0].id;
    expect(() => decideScholar(applied, "contributor", id, true, "Self-approval")).toThrow();
    expect(() =>
      grantRole(applied, "technical_admin", "contributor", "editor", "Admin override"),
    ).toThrow();
    const accepted = decideScholar(applied, "editor", id, true, "Independent assessment");
    expect(accepted.members[0].roles).toEqual(["contributor", "reviewer"]);
    expect(accepted.audit.map((e) => e.action)).toEqual([
      "scholar_applied",
      "role_granted",
      "scholar_accepted",
    ]);
    expect(() => grantRole(accepted, "editor", "editor", "reviewer", "Self grant")).toThrow();
  });
  it("preserves article publication, content snapshots and corrections", () => {
    let state = saveArticle(initialCommunity, "contributor", article);
    const id = state.articles[0].id;
    state = transitionArticle(state, "contributor", id, "submitted", "Ready");
    expect(() =>
      transitionArticle(state, "contributor", id, "under_review", "Self review"),
    ).toThrow();
    state = transitionArticle(state, "reviewer", id, "under_review", "Independent review");
    state = transitionArticle(state, "reviewer", id, "changes_requested", "Clarify source");
    state = saveArticle(
      state,
      "contributor",
      { ...article, body: "Clarified sourced content" },
      state.articles[0],
    );
    state = transitionArticle(state, "contributor", id, "submitted", "Revised");
    state = transitionArticle(state, "reviewer", id, "under_review", "Recheck");
    state = transitionArticle(state, "reviewer", id, "approved", "Checked");
    expect(() =>
      transitionArticle(state, "technical_admin", id, "published", "Admin publish"),
    ).toThrow();
    state = transitionArticle(state, "editor", id, "published", "Rights checked");
    const published = state.articles[0];
    state = saveArticle(state, "contributor", { ...article, body: "New correction" }, published);
    expect(state.articles[0].version).toBe(2);
    expect(state.articles.find((a) => a.id === id)).toEqual(published);
    expect(JSON.parse(state.audit[0].snapshot).body).toBe(article.body);
  });
  it("freezes release data and license manifests and blocks draft exports", () => {
    const entries = structuredClone(initialWorkspace.entries.slice(0, 4));
    const state = createRelease(
      initialCommunity,
      "editor",
      entries,
      "0.1.0",
      "Initial demonstration release",
    );
    entries[0].term = "changed later";
    expect(state.releases[0].entries[0].term).toBe("buug");
    expect(state.releases[0].manifest[0].attribution).toBe("Demo contributor");
    expect(() => createRelease(state, "editor", entries, "0.1.0", "Overwrite")).toThrow();
    expect(() => createRelease(state, "reviewer", entries, "0.2.0", "Reviewer release")).toThrow();
    expect(() =>
      createRelease(state, "editor", initialWorkspace.entries, "0.2.0", "Unpublished entries"),
    ).toThrow();
  });
  it("assigns independent reviewers, records discussion and preserves profile permissions", () => {
    const entry = initialWorkspace.entries[4];
    expect(() =>
      assignReview(initialCommunity, "technical_admin", entry, "reviewer", "Admin assignment"),
    ).toThrow();
    let state = assignReview(initialCommunity, "editor", entry, "editor", "Review delegated");
    expect(() =>
      addComment(state, "reviewer", entry, "Unauthorized assigned discussion"),
    ).toThrow();
    expect(() =>
      advance(
        { ...initialWorkspace, community: state, role: "reviewer" },
        entry.id,
        "under_review",
        "Other reviewer",
      ),
    ).toThrow();
    state = addComment(state, "contributor", entry, "A cited correction");
    expect(state.comments[0].body).toBe("A cited correction");
    state = saveProfile(state, "contributor", {
      name: "Synthetic contributor",
      bio: "Demo profile",
      expertise: "Grammar",
      roles: ["editor"],
    });
    expect(state.members[0].roles).toEqual(["contributor"]);
  });
  it("migrates legacy demo state and rejects corrupt history or missing identities", () => {
    const { community, ...legacy } = initialWorkspace;
    expect(restoreWorkspace(legacy).community.members).toHaveLength(4);
    expect(() =>
      restoreWorkspace({ ...initialWorkspace, events: [{ snapshot: "bad" }] }),
    ).toThrow();
    expect(() =>
      restoreWorkspace({ ...initialWorkspace, community: { ...community, members: [] } }),
    ).toThrow();
  });
});
