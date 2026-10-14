import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { requestOrigin, sameOrigin } from "@/lib/origin";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const input = z.object({ email: z.email() }).safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const origin = requestOrigin(request);
  const { error } = await db.auth.resetPasswordForEmail(input.data.email, {
    redirectTo: new URL("/auth", origin).href,
  });
  if (error)
    return NextResponse.json(
      {
        error:
          error.status === 429
            ? "Email delivery limit reached. Please wait before requesting another reset link."
            : "Recovery email could not be sent. Please try again later.",
      },
      { status: error.status === 429 ? 429 : 503 },
    );
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  response.cookies.set("qaamuusai-recovery", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https:"),
    path: "/",
    maxAge: 3600,
  });
  return response;
}
