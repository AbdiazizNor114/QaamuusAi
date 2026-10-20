import { beforeEach, expect, it, vi } from "vitest";
const { db } = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/lib/public-db", () => ({ publicDb: db }));
import { GET } from "../src/app/api/v1/entries/route";
beforeEach(() => vi.resetAllMocks());
function setup(
  result = { data: [], count: 0, error: null } as {
    data: unknown[];
    count: number;
    error: unknown;
  },
) {
  const query = {
    select: vi.fn(),
    in: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    range: vi.fn().mockResolvedValue(result),
  };
  for (const key of ["select", "in", "eq", "or", "order"] as const)
    query[key].mockReturnValue(query);
  const from = vi.fn().mockReturnValue(query);
  db.mockReturnValue({ from });
  return { query, from };
}
it("reads only published columns through an anonymous client with open-license filtering", async () => {
  const { query, from } = setup();
  const response = await GET(
    new Request(
      "http://localhost/api/v1/entries?q=home&category=translation&dialect=Maxaatiri&page=2&limit=10",
    ),
  );
  expect(response.status).toBe(200);
  expect(from).toHaveBeenCalledExactlyOnceWith("dataset_entries");
  expect(query.select.mock.calls[0][0]).not.toMatch(/author_id|contributor_id|reviewer_id|\*/);
  expect(query.in).toHaveBeenCalledWith("license", ["CC0-1.0", "CC-BY-4.0"]);
  expect(query.eq).toHaveBeenCalledWith("category", "translation");
  expect(query.eq).toHaveBeenCalledWith("dialect", "Maxaatiri");
  expect(query.or).toHaveBeenCalledWith("term.ilike.%home%,translation.ilike.%home%");
  expect(query.range).toHaveBeenCalledWith(10, 19);
});
it("reports pagination and valid empty pages", async () => {
  setup({ data: [{ id: "synthetic" }], count: 51, error: null });
  const result = await (await GET(new Request("http://localhost/api/v1/entries"))).json();
  expect(result.pagination).toEqual({
    page: 1,
    limit: 25,
    total: 51,
    total_pages: 3,
    has_next: true,
  });
  setup();
  expect(
    (await (await GET(new Request("http://localhost/api/v1/entries?page=2"))).json()).data,
  ).toEqual([]);
});
it("rejects unsafe searches, unknown fields, repeated parameters and invalid pagination before querying", async () => {
  for (const params of [
    "q=a,b",
    "q=%25",
    "category=draft",
    "status=draft",
    "page=0",
    "page=1.5",
    "limit=101",
    "page=10001",
    "page=1&page=2",
    "dialect=",
  ]) {
    expect((await GET(new Request(`http://localhost/api/v1/entries?${params}`))).status).toBe(400);
  }
  expect(db).not.toHaveBeenCalled();
});
it("returns generic unavailable errors rather than backend details", async () => {
  db.mockReturnValue(null);
  expect((await GET(new Request("http://localhost/api/v1/entries"))).status).toBe(503);
  setup({ data: [], count: 0, error: { message: "private database detail" } });
  const response = await GET(new Request("http://localhost/api/v1/entries"));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private database detail");
});
