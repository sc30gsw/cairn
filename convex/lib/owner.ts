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
  // NOTE: 生成済みガイドライン(convex/_generated/ai/guidelines.md)は identity.tokenIdentifier
  // (issuer付き)を推奨するが、ここでは identity.subject をそのまま ownerId に使う意図的な選択。
  // このプロジェクトの認証プロバイダは Better Auth 単独(convex/auth.ts の createAuth)であり、
  // subject は同一 issuer 内で一意なので衝突しない。将来 2つ目の identity provider を足す場合は、
  // 先に既存 ownerId(= 旧 subject)を tokenIdentifier へ移行してからでないと、
  // 別プロバイダ発行の同一文字列 subject が別ユーザーの ownerId と衝突しうる。
  return Result.ok({ ownerId: identity.subject });
}
