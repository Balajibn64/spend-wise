import axios from "axios";

/**
 * Every backend error response is `{ success: false, message, data? }` —
 * `data` holds a field-name -> message map for validation errors. This pulls
 * out something a toast (or a form) can actually show, instead of the
 * generic "Failed to X" strings that used to paper over it everywhere.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { message?: string; data?: Record<string, string> }
      | undefined;
    if (body?.message) {
      // Validation errors carry the real per-field messages in `data`;
      // surface the first one alongside the generic "Validation failed" text.
      if (body.data && typeof body.data === "object") {
        const firstFieldError = Object.values(body.data)[0];
        if (firstFieldError) return firstFieldError;
      }
      return body.message;
    }
  }
  return fallback;
}

export function getApiFieldErrors(error: unknown): Record<string, string> | null {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { data?: Record<string, string> } | undefined;
    if (body?.data && typeof body.data === "object") {
      return body.data;
    }
  }
  return null;
}
