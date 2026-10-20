import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicApi, publicApiPolicy } from "@/lib/public-api-policy";
export async function proxy(request: NextRequest) {
  if (isPublicApi(request.nextUrl.pathname)) {
    const policy = publicApiPolicy(request);
    if (policy.response) return new NextResponse(policy.response.body, { status: policy.response.status, headers: policy.response.headers });
    const publicResponse = NextResponse.next();
    policy.headers.forEach((value, name) => publicResponse.headers.set(name, value));
    return publicResponse;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key || !request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-")))
    return response;
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await db.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|demo).*)"] };
