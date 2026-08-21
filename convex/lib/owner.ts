import { Result } from "better-result";

import { UnauthenticatedError } from "./errors";

export type IdentityLike = {
  email?: null | string;
  subject: string;
};

export function ownerFromIdentity(
  identity: IdentityLike | null | undefined,
): Result<{ ownerId: string }, UnauthenticatedError> {
  if (identity === null || identity === undefined) {
    return Result.err(
      new UnauthenticatedError({
        message: "ログインが必要です。アカウントで入り直してください。",
      }),
    );
  }
  return Result.ok({ ownerId: identity.subject });
}
