import { NextResponse } from "next/server";
import { z } from "zod";
import { proposalSchema } from "@qaamuusai/schemas";
import { supabase } from "@/lib/supabase";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const input = z
    .object({ published_entry: z.uuid(), content: proposalSchema })
    .safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid correction." }, { status: 400 });
  const { data, error } = await db.rpc("propose_correction", input.data);
  return error
    ? NextResponse.json({ error: "Correction could not be created." }, { status: 403 })
    : NextResponse.json({ id: data }, { status: 201 });
}
