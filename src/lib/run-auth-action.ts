import { Result } from "better-result";

import { type AuthErrorContext, presentAuthError } from "~/lib/auth-error-messages";
import { AuthActionError } from "~/lib/errors";

export type ActionResult = { errorMessage: null } | { errorMessage: string };

export function toActionResult(result: Result<void, AuthActionError>): ActionResult {
  if (Result.isError(result)) {
    return { errorMessage: result.error.message };
  }
  return { errorMessage: null };
}

export function authActionError(error: unknown, context: AuthErrorContext): AuthActionError {
  return new AuthActionError({ cause: error, message: presentAuthError(error, context) });
}

export function authActionErrorFromUnknown(
  cause: unknown,
  context: AuthErrorContext,
): AuthActionError {
  if (cause instanceof AuthActionError) {
    return cause;
  }
  return authActionError(cause, context);
}

export async function runAuthAction(
  action: () => Promise<void>,
  context: AuthErrorContext,
  onSuccess?: () => void | Promise<void>,
): Promise<ActionResult> {
  const result = await Result.tryPromise({
    catch: (cause) => authActionErrorFromUnknown(cause, context),
    try: action,
  });
  if (Result.isOk(result) && onSuccess !== undefined) {
    await onSuccess();
  }
  return toActionResult(result);
}
