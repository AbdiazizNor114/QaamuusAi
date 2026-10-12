import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const db = await supabase();
  if (!db)
    return NextResponse.json(
      { error: "Authentication is not configured. Use the demo workspace." },
      { status: 503 },
    );
  const input = z.object({ email: z.email() }).safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const { error } = await db.auth.signInWithOtp({
    email: input.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: new URL("/auth", request.url).href },
  });
  return error
    ? NextResponse.json({ error: "Sign-in could not be requested." }, { status: 400 })
    : NextResponse.json({ ok: true });
}
