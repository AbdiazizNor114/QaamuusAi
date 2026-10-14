import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requestOrigin } from "@/lib/origin";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const db = await supabase();
  const recovery =
    type === "recovery" ||
    new NextRequest(request).cookies.get("qaamuusai-recovery")?.value === "1";
  const destination = recovery ? "/reset-password" : "/dashboard";
  function redirect(path: string) {
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.set("qaamuusai-recovery", "", { path: "/", maxAge: 0 });
    return response;
  }
  if (
    token_hash &&
    db &&
    (type === "email" || type === "magiclink" || type === "signup" || type === "recovery")
  ) {
    const { error } = await db.auth.verifyOtp({ token_hash, type });
    if (!error) return redirect(destination);
  }
  if (code && db) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return redirect(destination);
  }
  return redirect("/login?error=callback");
}
