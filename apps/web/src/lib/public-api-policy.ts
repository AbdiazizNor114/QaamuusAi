const buckets = new Map<string, { count: number; reset: number }>();
const windowMs = 60_000;
const limit = 60;

// A per-process backstop. Configure distributed limits at the hosting edge before launch.
export function publicApiPolicy(request: Request, now = Date.now()) {
  const headers = new Headers({ Vary: "Origin", "Cache-Control": "no-store" });
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Next may normalize the internal URL hostname; Host is the browser's actual destination.
  const requestOrigin = `${url.protocol}//${request.headers.get("host") ?? url.host}`;
  const allowed = (process.env.PUBLIC_API_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (origin && origin !== requestOrigin && !allowed.includes(origin))
    return {
      headers,
      response: Response.json(
        { error: { code: "origin_rejected", message: "This browser origin is not allowed." } },
        { status: 403, headers },
      ),
    };
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Accept");
    headers.set(
      "Access-Control-Expose-Headers",
      "Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, ETag, X-Checksum-SHA256",
    );
  }
  if (request.method === "OPTIONS")
    return { headers, response: new Response(null, { status: 204, headers }) };
  // Forwarded client identity is opt-in: only trust headers overwritten by your reverse proxy.
  const identity =
    process.env.PUBLIC_API_TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "shared"
      : "shared";
  for (const [key, bucket] of buckets) if (bucket.reset <= now) buckets.delete(key);
  if (!buckets.has(identity) && buckets.size >= 10_000)
    return {
      headers,
      response: Response.json(
        { error: { code: "rate_limited", message: "Service busy. Retry later." } },
        { status: 429, headers: { ...Object.fromEntries(headers), "Retry-After": "60" } },
      ),
    };
  const bucket = buckets.get(identity) ?? { count: 0, reset: now + windowMs };
  bucket.count++;
  buckets.set(identity, bucket);
  headers.set("X-RateLimit-Limit", String(limit));
  headers.set("X-RateLimit-Remaining", String(Math.max(0, limit - bucket.count)));
  if (bucket.count > limit) {
    headers.set("Retry-After", String(Math.ceil((bucket.reset - now) / 1000)));
    return {
      headers,
      response: Response.json(
        {
          error: {
            code: "rate_limited",
            message: "Too many requests. Retry after the indicated delay.",
          },
        },
        { status: 429, headers },
      ),
    };
  }
  return { headers, response: null };
}

export function isPublicApi(path: string) {
  return (
    ["/api/public", "/api/export", "/api/technology", "/api/status"].includes(path) ||
    path.startsWith("/api/v1/") ||
    path.startsWith("/api/releases/")
  );
}
