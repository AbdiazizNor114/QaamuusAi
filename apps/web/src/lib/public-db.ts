import "server-only";
import { createClient } from "@supabase/supabase-js";

// Public API reads never inherit a signed-in user's privileges or cookies.
export function publicDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null;
}
