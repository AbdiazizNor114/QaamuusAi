import { sameOrigin } from "@/lib/origin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const input = z
    .object({ email: z.email(), token: z.string().regex(/^\d{6,10}$/) })
    .safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ error: "Enter your email and verification code." }, { status: 400 });
  const { error } = await db.auth.verifyOtp({ ...input.data, type: "email" });
  return error
    ? NextResponse.json(
        { error: "Code is invalid or expired. Request a new sign-in email." },
        { status: 400 },
      )
    : NextResponse.json({ ok: true });
}
