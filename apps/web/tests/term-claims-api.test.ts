import { beforeEach, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
import { GET, POST } from "../src/app/api/terminology/claims/route";
beforeEach(() => vi.resetAllMocks());
const seed = "tech-navigation-dashboard";
const id = "11111111-1111-4111-8111-111111111111";
function setup(error: unknown = null, signedIn = true) {
  const rpc = vi.fn().mockResolvedValue({ data: [], error });
  client.mockResolvedValue({
    rpc,
    auth: { getUser: async () => ({ data: { user: signedIn ? { id } : null }, error: null }) },
  });
  return rpc;
}
function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/terminology/claims", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
it("requires sign-in and exposes only the controlled claim-list RPC", async () => {
  setup(null, false);
  expect((await GET()).status).toBe(401);
  const rpc = setup();
  const response = await GET();
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenCalledExactlyOnceWith("list_terminology_claims");
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("rejects foreign origins, unknown terms and forged owners before writes", async () => {
  const rpc = setup();
  expect(
    (await POST(request({ action: "claim", seed_id: seed }, "https://evil.example"))).status,
  ).toBe(403);
  expect((await POST(request({ action: "claim", seed_id: "unknown" }))).status).toBe(400);
  expect((await POST(request({ action: "claim", seed_id: seed, owner_id: id }))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});
it("uses the authenticated database identity and a specific claim ID for release", async () => {
  const rpc = setup();
  expect((await POST(request({ action: "claim", seed_id: seed }))).status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("claim_terminology_term", { term_id: seed });
  expect((await POST(request({ action: "release", seed_id: seed, claim_id: id }))).status).toBe(
    200,
  );
  expect(rpc).toHaveBeenCalledWith("release_terminology_claim", { term_id: seed, claim_id: id });
});
it("reports claim conflicts and unavailable migrations without exposing backend details", async () => {
  setup({ code: "23505", message: "private database details" });
  expect((await POST(request({ action: "claim", seed_id: seed }))).status).toBe(409);
  setup({ code: "42501" });
  expect((await POST(request({ action: "release", seed_id: seed, claim_id: id }))).status).toBe(
    403,
  );
  setup({ code: "PGRST202", message: "private schema detail" });
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private schema detail");
});
