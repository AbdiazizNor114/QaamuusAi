export function requestOrigin(request: Request): string {
  if (process.env.APP_ORIGIN) return new URL(process.env.APP_ORIGIN).origin;
  const url = new URL(request.url);
  const host = request.headers.get("host");
  // Next's local server normalizes request URLs to localhost, even for 127.0.0.1.
  if (["localhost", "127.0.0.1"].includes(url.hostname) && host) {
    try {
      const incoming = new URL(`${url.protocol}//${host}`);
      if (["localhost", "127.0.0.1"].includes(incoming.hostname) && incoming.port === url.port)
        return incoming.origin;
    } catch {}
  }
  return url.origin;
}
export function sameOrigin(request: Request): boolean {
  return request.headers.get("origin") === requestOrigin(request);
}
