import { beforeEach, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
import { GET, POST } from "../src/app/api/project-workspace/route";
import { mayReviewTask, type ProjectTask } from "../src/lib/project-workspace";
const req = (body: unknown, origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/project-workspace", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_ORIGIN", "");
});
it("requires sign-in and rejects cross-origin writes", async () => {
  client.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  });
  expect((await GET()).status).toBe(401);
  expect((await POST(req({ command: "area", area: "design" }))).status).toBe(401);
  expect((await POST(req({}, "https://other.example"))).status).toBe(403);
});
it("uses authenticated identity, never forged owner or role fields", async () => {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  client.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "verified" } } }) },
    rpc,
  });
  expect(
    (
      await POST(
        req({
          command: "task",
          task_id: "T01",
          expected_version: 1,
          action: "claim",
          owner_id: "forged",
          role: "technical_admin",
        }),
      )
    ).status,
  ).toBe(200);
  expect(rpc).toHaveBeenCalledWith("transition_project_task", {
    task_id: "T01",
    expected_version: 1,
    action: "claim",
    evidence: "",
    explanation: "",
  });
});
it("fails closed on invalid areas, unsafe links and unavailable storage", async () => {
  expect((await POST(req({ command: "area", area: "technical_admin" }))).status).toBe(400);
  expect(
    (
      await POST(
        req({
          command: "task",
          task_id: "T01",
          expected_version: 1,
          action: "submit",
          evidence: "javascript:alert(1)",
        }),
      )
    ).status,
  ).toBe(400);
  client.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "verified" } } }) },
    rpc: vi.fn().mockResolvedValue({ error: { message: "private provider detail" } }),
  });
  const response = await GET();
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("private provider detail");
});
it("keeps contribution preferences distinct from review authority", () => {
  const task = { status: "review", owner_id: "author", track: "language" } as ProjectTask;
  expect(mayReviewTask(task, "author", ["editor"])).toBe(false);
  expect(mayReviewTask(task, "other", ["technical_admin"])).toBe(false);
  expect(mayReviewTask(task, "other", ["reviewer"])).toBe(true);
  expect(mayReviewTask({ ...task, track: "design" }, "other", ["reviewer"])).toBe(false);
});
