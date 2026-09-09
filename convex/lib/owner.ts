import { Result } from "better-result";
import type { UserIdentity } from "convex/server";

import { UnauthenticatedError } from "./errors";

export type IdentityLike = Pick<UserIdentity, "email" | "subject">;
export type OwnerId = IdentityLike["subject"];

export function ownerFromIdentity(
  identity: IdentityLike | null | undefined,
): Result<{ ownerId: OwnerId }, UnauthenticatedError> {
  if (identity === null || identity === undefined) {
    return Result.err(
      new UnauthenticatedError({
        message: "ログインが必要です。アカウントで入り直してください。",
      }),
    );
  }
  return Result.ok({ ownerId: identity.subject });
}
