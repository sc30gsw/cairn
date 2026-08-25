import { TaggedError } from "better-result";
import { Result } from "better-result";

import type { Id } from "~/../convex/_generated/dataModel";
import { MAX_AVATAR_BYTES } from "~/../convex/lib/avatarStorage";
import { presentError } from "~/lib/error-presentation";
import { AuthActionError } from "~/lib/errors";

export class AvatarTooLargeError extends TaggedError("AvatarTooLarge")<{
  message: string;
}> {}

export class AvatarUnsupportedTypeError extends TaggedError("AvatarUnsupportedType")<{
  message: string;
}> {}

export class AvatarUploadFailedError extends TaggedError("AvatarUploadFailed")<{
  cause?: unknown;
  message: string;
}> {}

export type AvatarUploadError =
  | AuthActionError
  | AvatarTooLargeError
  | AvatarUnsupportedTypeError
  | AvatarUploadFailedError;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

export async function uploadAvatarBlob(
  blob: Blob,
  deps: {
    claimAvatarUpload: (args: {
      claimId: Id<"avatarUploadClaims">;
      storageId: Id<"_storage">;
    }) => Promise<void>;
    generateUploadUrl: () => Promise<{ claimId: Id<"avatarUploadClaims">; uploadUrl: string }>;
  },
): Promise<Result<Id<"_storage">, AvatarUploadError>> {
  if (!ALLOWED_TYPES.has(blob.type)) {
    return Result.err(
      new AvatarUnsupportedTypeError({
        message: "JPEG または PNG の画像を選んでください",
      }),
    );
  }
  if (blob.size > MAX_AVATAR_BYTES) {
    return Result.err(
      new AvatarTooLargeError({
        message: "画像は 512KB 以下にしてください",
      }),
    );
  }

  const uploadResult = await Result.tryPromise({
    catch: (cause) =>
      new AvatarUploadFailedError({
        cause,
        message: "アップロードに失敗しました",
      }),
    try: async () => {
      const { claimId, uploadUrl } = await deps.generateUploadUrl();
      const response = await fetch(uploadUrl, {
        body: blob,
        headers: { "Content-Type": blob.type },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("画像のアップロードに失敗しました");
      }
      const json = (await response.json()) as { storageId?: Id<"_storage"> };
      if (json.storageId === undefined) {
        throw new Error("ストレージ ID を取得できませんでした");
      }
      await deps.claimAvatarUpload({ claimId, storageId: json.storageId });
      return json.storageId;
    },
  });

  return uploadResult;
}

//* AvatarUploadFailedError の message は既定の一般文言なので、cause がサーバのドメインエラー
//* (ConvexError の data に message/tag を持つもの)であれば presentError 経由で具体的な文言に差し替える。
//* それ以外(fetch 失敗など)の cause は presentError が既定文言にフォールバックし、既存の挙動を保つ
export function avatarUploadErrorMessage(error: AvatarUploadError): string {
  if (error instanceof AvatarUploadFailedError) {
    return presentError(error.cause, error.message).message;
  }
  return error.message;
}
