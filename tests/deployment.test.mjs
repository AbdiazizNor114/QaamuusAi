import test from "node:test";
import assert from "node:assert/strict";
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
