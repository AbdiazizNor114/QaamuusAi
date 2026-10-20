import { beforeEach, describe, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
import { POST as profile } from "../src/app/api/profile/route";
import { POST as comments } from "../src/app/api/comments/route";
import { POST as verify } from "../src/app/api/login/verify/route";
import { POST as logout } from "../src/app/api/logout/route";
import { POST as submissions } from "../src/app/api/submissions/route";
import { POST as evidence } from "../src/app/api/evidence/route";
import { POST as assign } from "../src/app/api/reviews/assign/route";
const userId = "11111111-1111-4111-8111-111111111111";
function request(path: string, body: unknown, origin = "http://localhost:3000") {
  return new Request(`http://localhost:3000/api/${path}`, {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => vi.resetAllMocks());
describe("shared API authority", () => {
  it("rejects cross-origin mutations before touching Supabase", async () => {
    for (const handler of [profile, comments, verify, logout, submissions, evidence, assign]) {
      expect((await handler(request("test", {}, "https://untrusted.example"))).status).toBe(403);
    }
    expect(client).not.toHaveBeenCalled();
  });
  it("requires a verified user for profile, comment and draft writes", async () => {
    client.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });
    for (const handler of [profile, comments, submissions, evidence, assign])
      expect((await handler(request("test", {}))).status).toBe(401);
  });
  it("profile identity and permissions cannot be supplied by the browser", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    client.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
      from: () => ({ upsert }),
    });
    expect(
      (
        await profile(
          request("profile", {
            display_name: " Test contributor ",
            id: "forged",
            roles: ["editor"],
          }),
        )
      ).status,
    ).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: userId, display_name: "Test contributor" }),
    );
    expect(upsert.mock.calls[0][0]).not.toHaveProperty("roles");
  });
  it("comments use the verified author and propagate database rejection", async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: "RLS denied" } });
    client.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
      from: () => ({ insert }),
    });
    expect(
      (
        await comments(
          request("comments", {
            revision_id: userId,
            body: "Sourced discussion",
            author_id: "forged",
          }),
        )
      ).status,
    ).toBe(403);
    expect(insert).toHaveBeenCalledWith({
      revision_id: userId,
      body: "Sourced discussion",
      author_id: userId,
    });
  });
  it("validates evidence and uses only the verified author", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    client.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
      from: () => ({ insert }),
    });
    expect((await evidence(request("evidence", {
      dispute_id: userId, position: " ", source: "Book",
    }))).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
    expect((await evidence(request("evidence", {
      dispute_id: userId, position: " Explanation ", source: " Book, page 10 ",
      author_id: "forged",
    }))).status).toBe(200);
    expect(insert).toHaveBeenCalledWith({
      dispute_id: userId, position: "Explanation", source: "Book, page 10", author_id: userId,
    });
    insert.mockResolvedValue({ error: { message: "private database detail" } });
    const rejected = await evidence(request("evidence", {
      dispute_id: userId, position: "Explanation", source: "Book",
    }));
    expect(rejected.status).toBe(403);
    expect(await rejected.text()).not.toContain("private database detail");
  });
  it("assignment forwards validated arguments, not browser-supplied authority", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    client.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) }, rpc });
    expect((await assign(request("reviews/assign", { revision: userId, reviewer: userId, reason: " " }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect((await assign(request("reviews/assign", { revision: userId, reviewer: userId,
      reason: " Independent review ", actor_id: "forged", role: "editor" }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("assign_dataset_reviewer", {
      revision: userId, reviewer: userId, reason: "Independent review",
    });
    rpc.mockResolvedValue({ error: { message: "database detail" } });
    expect((await assign(request("reviews/assign", { revision: userId, reviewer: userId,
      reason: "Independent review" }))).status).toBe(403);
  });
  it("does not forward malformed verification codes", async () => {
    const verifyOtp = vi.fn();
    client.mockResolvedValue({ auth: { verifyOtp } });
    expect(
      (await verify(request("login/verify", { email: "test@example.com", token: "not-a-code" })))
        .status,
    ).toBe(400);
    expect(verifyOtp).not.toHaveBeenCalled();
  });
  it("signs out only the current browser session", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    client.mockResolvedValue({ auth: { signOut } });
    expect((await logout(request("logout", {}))).status).toBe(200);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
