import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { sameOrigin } from "@/lib/origin";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const input = z
    .object({
      access_token: z.string().min(1).max(8192),
      refresh_token: z.string().min(1).max(8192),
    })
    .safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Reset link is invalid or expired. Request a new link." },
      { status: 400 },
    );
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const {
    data: { user },
    error: identityError,
  } = await db.auth.getUser(input.data.access_token);
  if (identityError || !user)
    return NextResponse.json(
      { error: "Reset link is invalid or expired. Request a new link." },
      { status: 401 },
    );
  const { error } = await db.auth.setSession(input.data);
  return error
    ? NextResponse.json(
        { error: "Reset link is invalid or expired. Request a new link." },
        { status: 401 },
      )
    : NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
