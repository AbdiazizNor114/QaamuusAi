const input = process.argv[2];
if (!input) {
  console.error("Usage: pnpm deploy:smoke https://your-deployment-origin");
  process.exit(1);
}
const origin = new URL(input);
if (
  !["http:", "https:"].includes(origin.protocol) ||
  origin.username ||
  origin.password ||
  origin.search ||
  origin.hash ||
  origin.pathname !== "/"
)
  throw new Error("Supply an HTTP(S) origin without credentials or path.");
let failed = 0;
async function check(path, validate, options = {}) {
  try {
    const response = await fetch(new URL(path, origin), {
      ...options,
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    await validate(response);
    console.log(`PASS ${path}`);
  } catch {
    failed++;
    console.error(`FAIL ${path}`);
  }
}
function requireValue(value) {
  if (!value) throw new Error("Unexpected response");
}
for (const path of ["/", "/developers", "/releases", "/login"])
  await check(path, async (response) => {
    requireValue(response.status === 200);
    requireValue((await response.text()).includes("qaamuusAi"));
    requireValue(response.headers.get("x-content-type-options") === "nosniff");
  });
await check("/api/status", async (response) => {
  requireValue(response.status === 200);
  requireValue((await response.json()).status === "operational");
});
await check("/api/v1/entries?limit=1", async (response) => {
  const body = await response.json();
  requireValue(
    response.status === 200 &&
      body.api_version === "v1" &&
      body.status === "published" &&
      Array.isArray(body.data) &&
      body.pagination.limit === 1,
  );
});
await check("/api/technology", async (response) => {
  const body = await response.json();
  requireValue(
    response.status === 200 &&
      body.terms.length === 1000 &&
      body.terms.every(
        (term) => term.somali === null && term.review_status === "needs_translation",
      ),
  );
});
await check("/api/terminology/claims", async (response) => requireValue(response.status === 401));
await check(
  "/api/v1/entries",
  async (response) =>
    requireValue(response.status === 403 && !response.headers.has("access-control-allow-origin")),
  { headers: { Origin: "https://untrusted-smoke.invalid" } },
);
console.log(
  failed
    ? `${failed} smoke checks failed.`
    : "All read-only deployment smoke checks passed. No emails or mutations were requested.",
);
process.exitCode = failed ? 1 : 0;
