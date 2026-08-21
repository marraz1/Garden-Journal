import { AuthError, ForbiddenError } from "@/lib/guards";

/**
 * Server actions return this instead of throwing, so forms can render an error
 * without a full error boundary. `error` is always a key from messages/errors.
 */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Maps guard errors onto translation keys; anything else becomes `generic`. */
export async function withAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthError) return fail("signInRequired");
    if (error instanceof ForbiddenError) return fail("forbidden");
    // Let Next's redirect/notFound control-flow errors bubble.
    if (error instanceof Error && /NEXT_(REDIRECT|NOT_FOUND)/.test(error.message)) throw error;
    console.error("[action]", error);
    return fail("generic");
  }
}
