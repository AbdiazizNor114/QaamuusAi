import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { sameOrigin } from "@/lib/origin";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const db = await supabase();
  if (!db)
    return NextResponse.json(
      { error: "Authentication is not configured. Please contact the project administrator." },
      { status: 503 },
    );
  const input = z
    .object({ email: z.email(), password: z.string().min(1).max(128) })
    .safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  const { error } = await db.auth.signInWithPassword(input.data);
  if (error?.status === 429)
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait before trying again." },
      { status: 429 },
    );
  return error
    ? NextResponse.json(
        {
          error:
            error.status && error.status >= 500
              ? "Sign-in is temporarily unavailable. Please try again later."
              : "Email or password is incorrect, or the account is not confirmed.",
        },
        { status: error.status && error.status >= 500 ? 503 : 401 },
      )
    : NextResponse.json({ ok: true });
}
