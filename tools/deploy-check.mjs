import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function checkEnvironment(env, production = false) {
  const errors = [];
  const warnings = [];
  const origin = (name) => {
    const value = env[name];
    if (!value) {
      (production ? errors : warnings).push(`${name} is not set.`);
      return null;
    }
    try {
      const url = new URL(value);
      if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/" ||
        url.protocol !== "https:" ||
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
        throw new Error();
      return url.origin;
    } catch {
      errors.push(`${name} must be a public HTTPS origin without credentials, query or path.`);
      return null;
    }
  };
  const site = origin("NEXT_PUBLIC_SITE_URL");
  const app = origin("APP_ORIGIN");
  if (site && app && site !== app) errors.push("APP_ORIGIN and NEXT_PUBLIC_SITE_URL must match.");
  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
  } catch {
    errors.push("A valid HTTPS NEXT_PUBLIC_SUPABASE_URL is required.");
  }
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  let anonJwt = false;
  try {
    anonJwt = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "anon";
  } catch {
    /* New publishable keys are not JWTs. */
  }
  if (!(key.startsWith("sb_publishable_") || anonJwt))
    errors.push(
      "Use a Supabase publishable/anon key only; secret or service-role keys are forbidden in public variables.",
    );
  for (const item of (env.PUBLIC_API_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)) {
    try {
      const url = new URL(item);
      if (url.origin !== item || url.protocol !== "https:") throw new Error();
    } catch {
      errors.push(
        "PUBLIC_API_ALLOWED_ORIGINS must contain exact HTTPS origins, never wildcards or paths.",
      );
    }
  }
  if (env.PUBLIC_API_TRUST_PROXY === "true" && env.DEPLOY_TRUSTED_PROXY_CONFIRMED !== "true")
    errors.push(
      "Confirm the hosting proxy overwrites client IP headers before enabling PUBLIC_API_TRUST_PROXY.",
    );
  if (production && env.DEPLOY_EDGE_RATE_LIMIT_CONFIRMED !== "true")
    errors.push(
      "Production edge/distributed API rate limiting must be configured and confirmed with DEPLOY_EDGE_RATE_LIMIT_CONFIRMED=true.",
    );
  if (!env.NEXT_PUBLIC_CONTACT_EMAIL)
    warnings.push("Public contact email is not configured; contribution links remain available.");
  warnings.push(
    "Verify Supabase production Site URL and /auth redirect allowlist, email delivery, HTTPS and external monitoring before launch.",
  );
  return { errors, warnings };
}

export async function checkTrackedEnvironmentFiles(root = process.cwd()) {
  const paths = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  const errors = [];
  for (const path of paths.filter((item) => /(^|\/)\.env/.test(item))) {
    if (!path.endsWith(".example")) {
      errors.push(`Tracked environment file must be removed from version control: ${path}`);
      continue;
    }
    const text = await readFile(
      new URL(path, pathToFileURL(root.replaceAll("\\", "/") + "/")),
      "utf8",
    );
    if (
      text.split(/\r?\n/).some((line) => {
        const value = line.trim();
        if (!value || value.startsWith("#")) return false;
        const match = value.match(/^[A-Z][A-Z0-9_]*=(.*)$/);
        return !match || !["", "false", "true"].includes(match[1].trim());
      })
    )
      errors.push(`Environment example must contain blank placeholders only: ${path}`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = checkEnvironment(process.env, process.argv.includes("--production"));
  result.errors.push(...(await checkTrackedEnvironmentFiles()));
  for (const warning of result.warnings) console.log(`WARN ${warning}`);
  for (const error of result.errors) console.error(`FAIL ${error}`);
  console.log(
    result.errors.length
      ? "Deployment checks failed. No deployment was performed."
      : "Configuration checks passed. External launch checks still require verification.",
  );
  process.exitCode = result.errors.length ? 1 : 0;
}
