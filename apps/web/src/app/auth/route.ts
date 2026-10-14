import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requestOrigin } from "@/lib/origin";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const db = await supabase();
  const destination = type === "recovery" ? "/reset-password" : "/dashboard";
  if (
    token_hash &&
    db &&
    (type === "email" || type === "magiclink" || type === "signup" || type === "recovery")
  ) {
    const { error } = await db.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(new URL(destination, origin));
  }
  if (code && db) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, origin));
  }
  return NextResponse.redirect(new URL("/login?error=callback", origin));
}
