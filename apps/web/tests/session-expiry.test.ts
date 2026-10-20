import { beforeEach, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
import { GET as workspace } from "../src/app/api/workspace/route";
import { GET as community } from "../src/app/api/community/route";
import { expiredSessionMessage, isInvalidSession } from "../src/lib/session";
beforeEach(() => vi.resetAllMocks());
it("distinguishes rejected sessions from temporary provider failures", () => {
  expect(isInvalidSession({ code: "refresh_token_not_found", status: 400 })).toBe(true);
  expect(isInvalidSession({ status: 401 })).toBe(true);
  expect(isInvalidSession({ status: 503 })).toBe(false);
  expect(isInvalidSession(null)).toBe(false);
});
it("rejects expired sessions before querying private workspace data", async () => {
  const from = vi.fn(), rpc = vi.fn();
  client.mockResolvedValue({ from, rpc, auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { name: "AuthApiError", code: "session_expired", status: 401 } }),
  } });
  for (const handler of [workspace, community]) {
    const response = await handler();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: expiredSessionMessage });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  }
  expect(from).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalled();
});
it("does not mislabel provider outages as expired sessions", async () => {
  client.mockResolvedValue({ auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { name: "AuthRetryableFetchError", status: 503 } }),
  } });
  expect((await workspace()).status).toBe(503);
  expect((await community()).status).toBe(503);
});
