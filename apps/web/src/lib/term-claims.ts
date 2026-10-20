import { z } from "zod";
export const termClaimSchema = z.object({
  seed_id: z.string(),
  id: z.uuid(),
  owner_id: z.uuid(),
  display_name: z.string(),
  claimed_at: z.string(),
});
export const termClaimsSchema = z.array(termClaimSchema);
export type TermClaim = z.infer<typeof termClaimSchema>;
