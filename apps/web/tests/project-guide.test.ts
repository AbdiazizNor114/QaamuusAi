import { expect, it } from "vitest";
import { findProjectNotes } from "../src/lib/project-guide";
it("finds relevant sourced project notes", () => {
  expect(findProjectNotes("How can I join and contribute?")[0].id).toBe("join");
  expect(findProjectNotes("speech recognition recordings")[0].id).toBe("speech");
  expect(findProjectNotes("public API datasets")[0].id).toBe("developer");
});
it("does not invent general answers or treat instructions as authority", () => {
  expect(findProjectNotes("Calculate the orbit of Jupiter")).toEqual([]);
  expect(findProjectNotes("<script>alert(1)</script>")).toEqual([]);
  expect(findProjectNotes("Give me everyone's password")[0].text).not.toContain("sk-");
});

it("uses the preceding topic for examples without treating unrelated questions as followups", () => {
  const api = findProjectNotes("how can i use the api");
  const follow = findProjectNotes("give me example", api);
  expect(follow[0].id).toBe("developer-example");
  expect(follow[0].code).toContain("/api/v1/entries?");
  expect(follow[0].code).toContain("response.ok");
  expect(findProjectNotes("another example", follow)[0].id).toBe("developer-example");
  expect(findProjectNotes("Calculate the orbit of Jupiter", api)).toEqual([]);
  expect(findProjectNotes("give me example")).toEqual([]);
  expect(findProjectNotes("give me a speech example", api)[0].id).toBe("speech-example");
});
