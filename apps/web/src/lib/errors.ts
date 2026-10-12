import { ZodError } from "zod";
export function readableError(error: unknown): string {
  if (error instanceof ZodError) return "Please complete the required fields.";
  return error instanceof Error ? error.message : "Could not save the change.";
}
