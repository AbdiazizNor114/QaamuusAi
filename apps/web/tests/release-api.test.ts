import { beforeEach, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
import { GET } from "../src/app/api/releases/[id]/route";
import { emptySharedCommunity, sharedCommunitySchema } from "../src/lib/shared-community";
const id = "11111111-1111-4111-8111-111111111111";
const snapshot = [{ id, term: "Synthetic immutable entry", version: 1 }];
const manifest = [
  { id, license: "CC0-1.0", source: "Synthetic fixture", attribution: id, version: 1 },
];
beforeEach(() => vi.resetAllMocks());
it("accepts PostgreSQL timestamp offsets in frozen releases", () => {
  const row = {
    id,
    category: "vocabulary",
    term: "Synthetic",
    translation: "Test",
    notes: "",
    source: "Fixture",
    license: "CC0-1.0",
    dialect: "Standard",
    contributor: id,
    reviewer: id,
    status: "published",
    version: 1,
    demonstration: true,
    created_at: "2026-10-13T08:00:00.123456+00:00",
    updated_at: "2026-10-13T08:00:00+00:00",
  };
  expect(
    sharedCommunitySchema.safeParse({
      ...emptySharedCommunity,
      releases: [
        {
          id,
          version: "0.1.0",
          notes: "Fixture",
          published_by: id,
          created_at: row.created_at,
          snapshot: [row],
          license_manifest: manifest,
        },
      ],
    }).success,
  ).toBe(true);
});
function setup(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  client.mockResolvedValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) });
}
it("rejects invalid release IDs before touching Supabase", async () => {
  expect(
    (
      await GET(new Request("http://localhost:3000/api/releases/bad"), {
        params: Promise.resolve({ id: "bad" }),
      })
    ).status,
  ).toBe(400);
  expect(client).not.toHaveBeenCalled();
});
it("downloads the stored immutable snapshot, not client-submitted contents", async () => {
  setup({ version: "0.1.0", snapshot, license_manifest: manifest });
  const response = await GET(new Request(`http://localhost:3000/api/releases/${id}?term=forged`), {
    params: Promise.resolve({ id }),
  });
  expect(response.headers.get("Content-Disposition")).toBe(
    "attachment; filename=qaamuusai-v0.1.0.jsonl",
  );
  expect(response.headers.get("Content-Type")).toContain("application/x-ndjson");
  expect(await response.text()).toBe(JSON.stringify(snapshot[0]) + "\n");
});
it("downloads the stored license manifest separately", async () => {
  setup({ version: "0.1.0", snapshot, license_manifest: manifest });
  const response = await GET(
    new Request(`http://localhost:3000/api/releases/${id}?format=manifest`),
    { params: Promise.resolve({ id }) },
  );
  expect(response.headers.get("Content-Disposition")).toContain("-manifest.json");
  expect(await response.json()).toEqual(manifest);
});
it("does not fabricate a missing release", async () => {
  setup(null);
  expect(
    (
      await GET(new Request(`http://localhost:3000/api/releases/${id}`), {
        params: Promise.resolve({ id }),
      })
    ).status,
  ).toBe(404);
});
