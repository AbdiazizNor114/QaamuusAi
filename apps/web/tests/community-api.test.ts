import { beforeEach, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
import { POST } from "../src/app/api/community/[action]/route";
import { communityCommands } from "../src/lib/shared-community";
const id = "11111111-1111-4111-8111-111111111111";
function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/community/role", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_ORIGIN", "");
});
it("rejects cross-origin community actions before accessing the database", async () => {
  expect(
    (
      await POST(request({}, "https://untrusted.example"), {
        params: Promise.resolve({ action: "role" }),
      })
    ).status,
  ).toBe(403);
  expect(client).not.toHaveBeenCalled();
});
it("unknown commands cannot select arbitrary RPC functions", async () => {
  expect(
    (await POST(request({}), { params: Promise.resolve({ action: "has_role" }) })).status,
  ).toBe(404);
  expect(client).not.toHaveBeenCalled();
});
it("requires a verified session for every community command", async () => {
  client.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  });
  for (const action of Object.keys(communityCommands))
    expect((await POST(request({}), { params: Promise.resolve({ action }) })).status).toBe(401);
});
it("strips forged actor identity and honors role RPC rejection", async () => {
  const rpc = vi.fn().mockResolvedValue({ error: { message: "No authority" }, data: null });
  client.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id } } }) },
    rpc,
  });
  expect(
    (
      await POST(
        request({
          member: id,
          wanted: "editor",
          remove: false,
          reason: "Explicit appointment",
          actor_id: "forged",
        }),
        { params: Promise.resolve({ action: "role" }) },
      )
    ).status,
  ).toBe(403);
  expect(rpc).toHaveBeenCalledWith("change_member_role", {
    member: id,
    wanted: "editor",
    remove: false,
    reason: "Explicit appointment",
  });
});
it("rejects duplicate release IDs and malformed versions before the RPC", async () => {
  const rpc = vi.fn();
  client.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id } } }) },
    rpc,
  });
  for (const body of [
    { release_version: "1.0.0", entries: [id, id], notes: "Reviewed" },
    { release_version: "bad", entries: [id], notes: "Reviewed" },
  ])
    expect(
      (await POST(request(body), { params: Promise.resolve({ action: "release" }) })).status,
    ).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});
