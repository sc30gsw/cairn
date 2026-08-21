import { Result } from "better-result";

import { ForbiddenError, UnauthenticatedError } from "./errors";

export type IdentityLike = {
  email?: null | string;
  subject: string;
};

export function emailsMatch(email: string | null | undefined, allowedEmail: string | undefined) {
  if (email === null || email === undefined || allowedEmail === undefined || allowedEmail === "") {
    return false;
  }
  return email.toLowerCase() === allowedEmail.toLowerCase();
}

export function ownerFromIdentity(
  identity: IdentityLike | null | undefined,
  allowedEmail: string | undefined,
): Result<{ ownerId: string }, ForbiddenError | UnauthenticatedError> {
  if (identity === null || identity === undefined) {
    return Result.err(
      new UnauthenticatedError({
        message: "ログインが必要です。所有者として入り直してください。",
      }),
    );
  }
  if (!emailsMatch(identity.email, allowedEmail)) {
    return Result.err(
      new ForbiddenError({
        message: "許可されていないアカウントです。所有者だけが入れます。",
      }),
    );
  }
  return Result.ok({ ownerId: identity.subject });
}
