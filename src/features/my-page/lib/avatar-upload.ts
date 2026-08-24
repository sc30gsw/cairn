import { TaggedError } from "better-result";
import { Result } from "better-result";

import type { Id } from "~/../convex/_generated/dataModel";
import { MAX_AVATAR_BYTES } from "~/../convex/lib/avatarStorage";
import { AuthActionError } from "~/lib/errors";

export class AvatarTooLargeError extends TaggedError("AvatarTooLarge")<{
  message: string;
}> {}

export class AvatarUnsupportedTypeError extends TaggedError("AvatarUnsupportedType")<{
  message: string;
}> {}

export class AvatarUploadFailedError extends TaggedError("AvatarUploadFailed")<{
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
    catch: () =>
      new AvatarUploadFailedError({
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

export function avatarUploadErrorMessage(error: AvatarUploadError): string {
  return error.message;
}
