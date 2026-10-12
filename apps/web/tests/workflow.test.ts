import { describe, it, expect } from "vitest";
import { canTransition, canExport, entrySchema } from "@qaamuusai/schemas";
import { advance, initialWorkspace, propose } from "../src/lib/demo";
describe("editorial authority", () => {
  it("blocks administrators and self-review", () => {
    expect(canTransition("under_review", "approved", "technical_admin", false)).toBe(false);
    expect(canTransition("under_review", "approved", "reviewer", true)).toBe(false);
    expect(canTransition("approved", "published", "reviewer", false)).toBe(false);
    expect(canTransition("disputed", "under_review", "editor", false)).toBe(true);
  });
  it("records a complete proposal lifecycle without changing the published source", () => {
    const original = initialWorkspace.entries[0];
    let state = propose(
      initialWorkspace,
      { ...original, translation: "revised demo meaning" },
      original,
    );
    const id = state.entries[0].id;
    state = advance(state, id, "submitted", "Ready for review");
    state = advance({ ...state, role: "reviewer" }, id, "under_review", "Assigned");
    state = advance(state, id, "approved", "Evidence examined");
    state = advance({ ...state, role: "editor" }, id, "published", "Redistribution verified");
    expect(state.entries.find((e) => e.id === id)?.version).toBe(2);
    expect(state.entries.find((e) => e.id === original.id)).toEqual(original);
    expect(state.events).toHaveLength(5);
    expect(canExport(state.entries[0])).toBe(true);
  });
  it("requires rationale and excludes uncertain licensing from export", () => {
    const pending = initialWorkspace.entries[4];
    expect(() =>
      advance({ ...initialWorkspace, role: "reviewer" }, pending.id, "under_review", ""),
    ).toThrow();
    expect(canExport({ ...initialWorkspace.entries[0], license: "Permission pending" })).toBe(
      false,
    );
    expect(entrySchema.safeParse({ ...pending, source: "" }).success).toBe(false);
  });
});
