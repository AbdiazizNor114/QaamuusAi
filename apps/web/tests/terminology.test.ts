import { expect, it } from "vitest";
import {
  readTerminology,
  writeTerminology,
  terminologySeed,
  seedRecords,
} from "../src/lib/terminology";
import { technologyTerms } from "../src/lib/technology-terms";
import type { SharedRecord } from "../src/lib/shared";
it("round-trips scholar fields without inventing a translation or permissions", () => {
  const form = new FormData();
  form.set("definition", "A synthetic definition");
  form.set("example", "A synthetic example sentence.");
  form.set("alternatives", "Alternative A\nAlternative B");
  form.set("notes", "Original notes");
  const notes = writeTerminology(technologyTerms[0], form);
  const details = readTerminology(notes);
  expect(details?.alternatives).toBe("Alternative A\nAlternative B");
  expect(details?.permission_evidence).toBe("");
  expect(details?.notes).toBe("Original notes");
  expect(terminologySeed(notes)?.id).toBe(technologyTerms[0].id);
  const record = { id: "synthetic", notes } as SharedRecord;
  expect(seedRecords([record]).get(technologyTerms[0].id)).toEqual([record]);
});
it("retains ordinary notes as ordinary notes and rejects unknown envelope versions or IDs", () => {
  expect(readTerminology("Old proposal notes")).toBeNull();
  expect(readTerminology('{"kind":"qaamuusai.terminology","format_version":2}')).toBeNull();
  const form = new FormData();
  form.set("definition", "Definition");
  form.set("example", "Example");
  const notes = JSON.parse(writeTerminology(technologyTerms[0], form));
  expect(readTerminology(JSON.stringify({ ...notes, seed_id: "unknown" }))).toBeNull();
});
it("requires definitions and examples and enforces field limits", () => {
  expect(() => writeTerminology(technologyTerms[0], new FormData())).toThrow();
  const form = new FormData();
  form.set("definition", "x".repeat(2001));
  form.set("example", "Example");
  expect(() => writeTerminology(technologyTerms[0], form)).toThrow();
});
