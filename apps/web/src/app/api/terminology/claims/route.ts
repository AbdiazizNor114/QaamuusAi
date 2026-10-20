import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { sameOrigin } from "@/lib/origin";
import { technologyTerms } from "@/lib/technology-terms";
const headers = { "Cache-Control": "private, no-store" };
const seedIds = new Set(technologyTerms.map((seed) => seed.id));
const seed = z.string().refine((value) => seedIds.has(value));
const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("claim"), seed_id: seed }).strict(),
  z.object({ action: z.literal("release"), seed_id: seed, claim_id: z.uuid() }).strict(),
]);
function failure(status: number, error: string) {
  return Response.json({ error }, { status, headers });
}
async function authenticatedDb() {
  const db = await supabase();
  if (!db) return { response: failure(503, "Shared term claims are not configured.") };
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error?.status === 401 || error?.status === 403)
    return { response: failure(401, "Sign in required.") };
  if (
    error &&
    error.name !== "AuthSessionMissingError" &&
    error.status !== 401 &&
    error.status !== 403
  )
    return { response: failure(503, "Could not verify your session. Try again.") };
  if (!user) return { response: failure(401, "Sign in required.") };
  return { db };
}
export async function GET() {
  const auth = await authenticatedDb();
  if (auth.response) return auth.response;
  const { data, error } = await auth.db!.rpc("list_terminology_claims");
  if (error)
    return failure(
      error.code === "42501" ? 403 : 503,
      "Shared term claims are unavailable. The claim migration may need to be applied.",
    );
  return Response.json(data ?? [], { headers });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return failure(403, "Origin rejected.");
  const input = command.safeParse(await request.json().catch(() => null));
  if (!input.success) return failure(400, "Choose a valid term and claim action.");
  const auth = await authenticatedDb();
  if (auth.response) return auth.response;
  const value = input.data;
  const { error } =
    value.action === "claim"
      ? await auth.db!.rpc("claim_terminology_term", { term_id: value.seed_id })
      : await auth.db!.rpc("release_terminology_claim", {
          term_id: value.seed_id,
          claim_id: value.claim_id,
        });
  if (error)
    return failure(
      error.code === "23505" ? 409 : error.code === "42501" ? 403 : 503,
      error.code === "23505"
        ? "Someone has already claimed this term. Refresh to see the current claimant."
        : error.code === "42501"
          ? "A scholar role is required to claim; only the claimant can release the current claim."
          : "Could not update the shared claim. Please retry.",
    );
  return Response.json({ ok: true }, { headers });
}
