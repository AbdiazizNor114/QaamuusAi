import { afterEach, expect, it, vi } from "vitest";
const { db } = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/lib/public-db", () => ({ publicDb: db }));
import { GET } from "../src/app/api/status/route";
afterEach(() => vi.restoreAllMocks());
it("checks published database reachability without returning records", async () => {
  const abortSignal = vi.fn().mockResolvedValue({ data: [{ id: "not returned" }], error: null });
  db.mockReturnValue({ from: () => ({ select: () => ({ limit: () => ({ abortSignal }) }) }) });
  const response = await GET();
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.status).toBe("operational");
  expect(result).not.toHaveProperty("data");
  expect(abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
});
it("reports outages generically and logs no private backend errors", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  db.mockReturnValue(null);
  expect((await GET()).status).toBe(503);
  expect(warn).toHaveBeenCalledWith(expect.stringContaining("public_api_health_failed"));
});
