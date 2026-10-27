import { expect, it } from "vitest";
import { ChatLimiter } from "../src/lib/chat-limit";
it("limits bursts and resets the in-memory UTC daily allowance", () => {
  const limiter = new ChatLimiter();
  const start = Date.parse("2026-10-27T00:00:00Z");
  for (let i = 0; i < 5; i++) expect(limiter.consume("one", start).allowed).toBe(true);
  expect(limiter.consume("one", start).allowed).toBe(false);
  expect(limiter.consume("one", start + 60000).allowed).toBe(true);
  const shared = new ChatLimiter();
  for (let i = 0; i < 40; i++) expect(shared.consume("client-" + i, start).allowed).toBe(true);
  expect(shared.consume("another", start)).toEqual(
    expect.objectContaining({ allowed: false, daily: true }),
  );
  expect(shared.consume("another", start + 86400000).allowed).toBe(true);
});
