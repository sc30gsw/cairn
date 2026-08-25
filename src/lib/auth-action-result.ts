import { Result } from "better-result";

import type { AuthErrorContext } from "~/lib/auth-error-messages";
import { AuthActionError } from "~/lib/errors";
import { authActionErrorFromUnknown } from "~/lib/run-auth-action";

export type AuthActionResult = Result<void, AuthActionError>;

export function authActionErrorMessage(result: AuthActionResult): null | string {
  if (Result.isError(result)) {
    return result.error.message;
  }
  return null;
}

export async function runAuthAction(
  action: () => Promise<void>,
  context: AuthErrorContext,
  onSuccess?: () => void | Promise<void>,
): Promise<AuthActionResult> {
  return Result.tryPromise({
    catch: (cause) => authActionErrorFromUnknown(cause, context),
    try: async () => {
      await action();
      if (onSuccess !== undefined) {
        await onSuccess();
      }
    },
  });
}
