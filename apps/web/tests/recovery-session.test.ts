import { beforeEach, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
import { POST } from "../src/app/api/auth/recovery/route";
const tokens = { access_token: "synthetic-access-token", refresh_token: "synthetic-refresh-token" };
function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/auth/recovery", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_ORIGIN", "");
});
it("rejects external origins and incomplete recovery credentials", async () => {
  expect((await POST(request(tokens, "https://untrusted.example"))).status).toBe(403);
  expect((await POST(request({ access_token: "only-one" }))).status).toBe(400);
  expect(client).not.toHaveBeenCalled();
});
it("does not establish a session from an unverified access token", async () => {
  const setSession = vi.fn();
  client.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "expired" } }),
      setSession,
    },
  });
  expect((await POST(request(tokens))).status).toBe(401);
  expect(setSession).not.toHaveBeenCalled();
});
it("validates the supplied access token before writing the cookie session", async () => {
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "verified" } }, error: null }),
    setSession = vi.fn().mockResolvedValue({ error: null });
  client.mockResolvedValue({ auth: { getUser, setSession } });
  const response = await POST(request(tokens));
  expect(response.status).toBe(200);
  expect(getUser).toHaveBeenCalledWith(tokens.access_token);
  expect(setSession).toHaveBeenCalledWith(tokens);
  expect(getUser.mock.invocationCallOrder[0]).toBeLessThan(setSession.mock.invocationCallOrder[0]);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
