import { beforeEach, expect, it, vi } from "vitest";
const { client, service } = vi.hoisted(() => ({ client: vi.fn(), service: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: service }));
import { POST as apply, GET as list } from "../src/app/api/contributor-requests/route";
import { POST as decide } from "../src/app/api/contributor-requests/[id]/route";
const id = "10000000-0000-4000-8000-000000000099";
function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/contributor-requests", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_ORIGIN", "");
  vi.stubEnv("VERCEL", "");
});
it("accepts validated name and email without an account and normalizes email", async () => {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  service.mockReturnValue({ rpc });
  expect(
    (
      await apply(
        request({
          name: " Applicant ",
          email: "Applicant@example.com",
          study: "Computer science",
          professional_role: "frontend",
        }),
      )
    ).status,
  ).toBe(200);
  expect(rpc).toHaveBeenCalledWith("request_contributor_access", {
    applicant_name: "Applicant",
    applicant_email: "applicant@example.com",
    applicant_study: "Computer science",
    applicant_role: "frontend",
    client_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
  });
  expect((await apply(request({ name: "", email: "bad" }))).status).toBe(400);
  expect((await apply(request({}, "https://external.example"))).status).toBe(403);
});
it("keeps requests and invitation privileges private", async () => {
  client.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  });
  expect((await list()).status).toBe(401);
  client.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "member" } } }) },
    rpc: vi.fn().mockResolvedValue({ data: false }),
  });
  expect((await list()).status).toBe(403);
  expect(
    (await decide(request({ decision: "approve" }), { params: Promise.resolve({ id }) })).status,
  ).toBe(403);
  expect(service).not.toHaveBeenCalled();
});
function administrator() {
  client.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin" } } }) },
    rpc: vi.fn().mockResolvedValue({ data: true }),
  });
  const chain = {
    update: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { email: "stored@example.com", name: "Stored applicant" },
      error: null,
    }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  const invite = vi.fn().mockResolvedValue({ error: null });
  service.mockReturnValue({
    from: vi.fn().mockReturnValue(chain),
    auth: { admin: { inviteUserByEmail: invite } },
  });
  return { chain, invite };
}
it("approval emails only the stored address and records who approved", async () => {
  const { chain, invite } = administrator();
  expect(
    (
      await decide(request({ decision: "approve", email: "forged@example.com" }), {
        params: Promise.resolve({ id }),
      })
    ).status,
  ).toBe(200);
  expect(invite).toHaveBeenCalledWith("stored@example.com", {
    data: { display_name: "Stored applicant" },
    redirectTo: "http://localhost:3000/auth?type=invite",
  });
  expect(chain.update).toHaveBeenCalledWith(
    expect.objectContaining({ status: "sending", reviewed_by: "admin" }),
  );
  expect(chain.update).toHaveBeenCalledWith({ status: "invited" });
});
it("decline sends no invitation", async () => {
  const { invite } = administrator();
  expect(
    (await decide(request({ decision: "decline" }), { params: Promise.resolve({ id }) })).status,
  ).toBe(200);
  expect(invite).not.toHaveBeenCalled();
});
it("failed delivery stays retryable and hides provider details", async () => {
  const { chain, invite } = administrator();
  invite.mockResolvedValue({ error: { message: "private provider detail" } });
  const response = await decide(request({ decision: "approve" }), {
    params: Promise.resolve({ id }),
  });
  expect(response.status).toBe(502);
  expect(JSON.stringify(await response.json())).not.toContain("private provider detail");
  expect(chain.update).toHaveBeenCalledWith({ status: "failed" });
});
it("a concurrent or completed decision sends no duplicate invitation", async () => {
  const { chain, invite } = administrator();
  chain.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect(
    (await decide(request({ decision: "approve" }), { params: Promise.resolve({ id }) })).status,
  ).toBe(409);
  expect(invite).not.toHaveBeenCalled();
});

it("resends only previously invited applications and rejects concurrent resends", async () => {
  const { chain, invite } = administrator();
  expect(
    (await decide(request({ decision: "resend" }), { params: Promise.resolve({ id }) })).status,
  ).toBe(200);
  expect(chain.in).toHaveBeenCalledWith("status", ["invited"]);
  expect(invite).toHaveBeenCalledTimes(1);
  chain.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect(
    (await decide(request({ decision: "resend" }), { params: Promise.resolve({ id }) })).status,
  ).toBe(409);
  expect(invite).toHaveBeenCalledTimes(1);
});

it("explains existing accounts without exposing provider details", async () => {
  const { invite } = administrator();
  invite.mockResolvedValue({ error: { code: "email_exists", message: "private provider detail" } });
  const response = await decide(request({ decision: "approve" }), {
    params: Promise.resolve({ id }),
  });
  expect(response.status).toBe(502);
  const body = await response.json();
  expect(body.error).toContain("already has an account");
  expect(body.error).not.toContain("private provider detail");
});

it("returns a retryable rate limit response from the shared database budget", async () => {
  service.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ error: { code: "P0429" } }) });
  const response = await apply(
    request({
      name: "Applicant",
      email: "test@example.com",
      study: "Test",
      professional_role: "other",
    }),
  );
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("900");
});

it("trusts client IP headers only on Vercel and fails closed if missing", async () => {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  service.mockReturnValue({ rpc });
  vi.stubEnv("VERCEL", "1");
  const body = {
    name: "Applicant",
    email: "test@example.com",
    study: "Test",
    professional_role: "other",
  };
  expect((await apply(request(body))).status).toBe(503);
  const input = request(body);
  input.headers.set("x-real-ip", "192.0.2.1");
  expect((await apply(input)).status).toBe(200);
  expect(rpc.mock.calls[0][1].client_hash).not.toContain("192.0.2.1");
});

it("requires study and a listed role without assigning application permissions", async () => {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  service.mockReturnValue({ rpc });
  const basic = { name: "Applicant", email: "applicant@example.com" };
  expect((await apply(request(basic))).status).toBe(400);
  expect(
    (await apply(request({ ...basic, study: "Linguistics", professional_role: "technical_admin" })))
      .status,
  ).toBe(400);
  expect((await apply(request({ ...basic, study: " ", professional_role: "writer" }))).status).toBe(
    400,
  );
  expect(rpc).not.toHaveBeenCalled();
  expect(
    (await apply(request({ ...basic, study: "Linguistics", professional_role: "grammar_teacher" })))
      .status,
  ).toBe(200);
});
