import { beforeEach, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
import { GET as catalog } from "../src/app/api/public/route";
import { GET as exported } from "../src/app/api/export/route";
import { GET as technology } from "../src/app/api/technology/route";
import { technologyTerms } from "../src/lib/technology-terms";
beforeEach(() => vi.resetAllMocks());
it("technology drafts have unique IDs and never fabricate reviewed translations", async () => {
  expect(technologyTerms).toHaveLength(1000);
  expect(new Set(technologyTerms.map((row) => row.english.toLowerCase())).size).toBe(1000);
  expect(new Set(technologyTerms.map((row) => row.id)).size).toBe(technologyTerms.length);
  expect(
    technologyTerms.every(
      (row) => row.somali === null && row.review_status === "needs_translation",
    ),
  ).toBe(true);
  const json = await technology(new Request("http://localhost/api/technology"));
  expect((await json.json()).terms).toHaveLength(technologyTerms.length);
  const jsonl = await technology(new Request("http://localhost/api/technology?format=jsonl"));
  expect(
    (await jsonl.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line)),
  ).toEqual(technologyTerms);
  expect((await technology(new Request("http://localhost/api/technology?format=csv"))).status).toBe(
    400,
  );
});
it("public catalog queries only published-resource tables without authentication", async () => {
  const from = vi.fn(() => ({
    select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
  }));
  client.mockResolvedValue({ from });
  expect(await (await catalog()).json()).toEqual({
    entries: [],
    articles: [],
    releases: [],
    configured: true,
  });
  expect(from).toHaveBeenCalledTimes(3);
  expect(from).toHaveBeenNthCalledWith(1, "dataset_entries");
  expect(from).toHaveBeenNthCalledWith(2, "articles");
  expect(from).toHaveBeenNthCalledWith(3, "dataset_releases");
});
it("published JSON and JSONL exports preserve licence filtering and normalized attribution", async () => {
  const query = {
    order: vi.fn(),
    range: vi.fn().mockResolvedValue({
      data: [
        {
          id: "synthetic",
          license: "CC0-1.0",
          contributor_id: "author",
          reviewer_id: "reviewer",
        },
      ],
      error: null,
    }),
  };
  query.order.mockReturnValue(query);
  const filter = vi.fn().mockReturnValue(query);
  client.mockResolvedValue({ from: () => ({ select: () => ({ in: filter }) }) });
  const response = await exported(new Request("http://localhost/api/export?format=json"));
  expect(await response.json()).toEqual([
    {
      id: "synthetic",
      license: "CC0-1.0",
      contributor: "author",
      reviewer: "reviewer",
      status: "published",
    },
  ]);
  expect(filter).toHaveBeenCalledWith("license", ["CC0-1.0", "CC-BY-4.0"]);
  expect(response.headers.get("content-disposition")).toContain(".json");
  expect((await exported(new Request("http://localhost/api/export?format=invalid"))).status).toBe(
    400,
  );
});
it("published exports fetch beyond the first backend page", async () => {
  const query = {
    order: vi.fn(),
    range: vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, id) => ({ id })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ id: 500 }], error: null }),
  };
  query.order.mockReturnValue(query);
  client.mockResolvedValue({ from: () => ({ select: () => ({ in: () => query }) }) });
  const response = await exported(new Request("http://localhost/api/export?format=json"));
  expect(await response.json()).toHaveLength(501);
  expect(query.range).toHaveBeenNthCalledWith(2, 500, 999);
});
