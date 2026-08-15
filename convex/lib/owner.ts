import { Result } from "better-result";

import { ForbiddenError, UnauthenticatedError } from "./errors";

export type IdentityLike = {
  email?: null | string;
  subject: string;
};

export function ownerFromIdentity(
  identity: IdentityLike | null | undefined,
  allowedEmail: string | undefined,
): Result<{ ownerId: string }, ForbiddenError | UnauthenticatedError> {
  if (identity === null || identity === undefined) {
    return Result.err(
      new UnauthenticatedError({
        message: "ログインが必要です。Notion で所有者として入り直してください。",
      }),
    );
  }
  if (allowedEmail === undefined || allowedEmail === "" || identity.email !== allowedEmail) {
    return Result.err(
      new ForbiddenError({
        message: "許可されていないアカウントです。所有者の Notion だけが入れます。",
      }),
    );
  }
  return Result.ok({ ownerId: identity.subject });
}
