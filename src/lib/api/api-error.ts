import type { ApiError } from "@/types/api";

/**
 * httpClient rejects with a plain ApiError object ({ message, errors, status }),
 * not an Error instance — so `error instanceof Error` is always false.
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ApiError).message === "string"
  );
}

/** First validation message per field from a 422 ApiError.errors bag. */
export function fieldErrorsFromApi(
  error: unknown,
): Record<string, string> {
  if (!isApiError(error) || !error.errors) return {};
  const next: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.errors)) {
    if (messages?.[0]) next[field] = messages[0];
  }
  return next;
}

export function apiErrorMessage(
  error: unknown,
  fallback = "Please try again",
): string {
  if (isApiError(error) && error.message.trim()) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
