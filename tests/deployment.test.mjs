import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { checkEnvironment, checkTrackedEnvironmentFiles } from "../tools/deploy-check.mjs";
const valid = {
  NEXT_PUBLIC_SITE_URL: "https://commons.example",
  APP_ORIGIN: "https://commons.example",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
  DEPLOY_EDGE_RATE_LIMIT_CONFIRMED: "true",
};
test("production config validates origins without printing secret values", () => {
  assert.equal(checkEnvironment(valid, true).errors.length, 0);
  assert.ok(
    checkEnvironment({ ...valid, APP_ORIGIN: "https://other.example" }, true).errors.length,
  );
  assert.ok(
    checkEnvironment({ ...valid, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }, true).errors
      .length,
  );
  const result = checkEnvironment(
    { ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_never-print-this" },
    true,
  );
  assert.ok(result.errors.length);
  assert.ok(!JSON.stringify(result).includes("never-print-this"));
});
test("production requires edge protection and explicit trusted proxy configuration", () => {
  assert.ok(
    checkEnvironment({ ...valid, DEPLOY_EDGE_RATE_LIMIT_CONFIRMED: "" }, true).errors.length,
  );
  assert.ok(checkEnvironment({ ...valid, PUBLIC_API_TRUST_PROXY: "true" }, true).errors.length);
  assert.ok(checkEnvironment({ ...valid, PUBLIC_API_ALLOWED_ORIGINS: "*" }, true).errors.length);
});
test("tracked environment templates contain no populated settings or credentials", async () => {
  assert.deepEqual(await checkTrackedEnvironmentFiles(), []);
});

test("deployment smoke detects database failures and incorrect callback origins without leaking bodies", async (t) => {
  let mode = "healthy";
  const methods = [];
  const server = createServer((request, response) => {
    methods.push(request.method);
    const path = new URL(request.url, "http://localhost").pathname;
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (path === "/auth") {
      response.writeHead(307, { Location: mode === "callback" ? "https://wrong.invalid/login?error=callback" : `${origin}/login?error=callback` });
      return response.end();
    }
    if (path === "/qaamuusai-logo.svg") {
      response.setHeader("Content-Type", "image/svg+xml");
      return response.end("<svg><title>QaamuusAi</title></svg>");
    }
    response.setHeader("Content-Type", "application/json");
    if (path === "/api/status") {
      response.statusCode = mode === "database" ? 503 : 200;
      return response.end(JSON.stringify({ status: mode === "database" ? "private-failure-detail" : "operational" }));
    }
    if (path === "/api/v1/entries") {
      response.statusCode = request.headers.origin ? 403 : 200;
      return response.end(JSON.stringify({ api_version: "v1", status: "published", data: [], pagination: { limit: 1 } }));
    }
    if (path === "/api/technology") return response.end(JSON.stringify({ terms: Array.from({ length: 1000 }, () => ({ somali: null, review_status: "needs_translation" })) }));
    if (path === "/api/terminology/claims") {
      response.statusCode = 401;
      return response.end("{}");
    }
    response.end("qaamuusAi");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const script = fileURLToPath(new URL("../tools/deploy-smoke.mjs", import.meta.url));
  const run = () => promisify(execFile)(process.execPath, [script, origin]);
  assert.match((await run()).stdout, /All read-only deployment smoke checks passed/);
  for (const failure of ["callback", "database"]) {
    mode = failure;
    await assert.rejects(run, (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stdout, failure === "database" ? /FAIL \/api\/status/ : /FAIL \/auth/);
      assert.ok(!`${error.stdout}${error.stderr}`.includes("private-failure-detail"));
      return true;
    });
  }
  assert.ok(methods.every((method) => method === "GET"));
});
