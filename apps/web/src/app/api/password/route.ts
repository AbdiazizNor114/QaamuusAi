import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { sameOrigin } from "@/lib/origin";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required to set your password." }, { status: 401 });
  const input = z
    .object({ password: z.string().min(12).max(128), confirmation: z.string() })
    .refine((data) => data.password === data.confirmation)
    .safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Passwords must match and contain 12 to 128 characters." },
      { status: 400 },
    );
  const { error } = await db.auth.updateUser({ password: input.data.password });
  if (error)
    return NextResponse.json(
      {
        error:
          "Could not update password. Supabase may require recent sign-in or additional verification.",
      },
      { status: 400 },
    );
  const { error: accessError } = await db.rpc("accept_contributor_invitation");
  if (accessError)
    return NextResponse.json(
      {
        error:
          "Password saved, but contributor access could not be completed. Please try saving again.",
      },
      { status: 503 },
    );
  return NextResponse.json({ ok: true });
}
