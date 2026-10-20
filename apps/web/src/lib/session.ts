export const expiredSessionMessage = "Your session expired. Please sign in again.";

export function isInvalidSession(error: { status?: number; code?: string } | null | undefined) {
  return !!error && (error.status === 401 || error.status === 403 ||
    ["refresh_token_not_found", "refresh_token_already_used", "session_not_found", "session_expired"].includes(error.code ?? ""));
}
