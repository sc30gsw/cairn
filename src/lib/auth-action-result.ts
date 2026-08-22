import { Result } from "better-result";

import { AuthActionError } from "~/lib/errors";

export type AuthActionResult = Result<void, AuthActionError>;

export function authActionErrorMessage(result: AuthActionResult): null | string {
  if (Result.isError(result)) {
    return result.error.message;
  }
  return null;
}
