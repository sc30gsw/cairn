import { Result } from "better-result";
import { MAX_AVATAR_BYTES } from "~domain/avatarStorage";

import type { Id } from "~/../convex/_generated/dataModel";
import { AuthActionError } from "~/lib/errors";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

export type AvatarUploadError =
  | AuthActionError
  | { _tag: "AvatarTooLarge"; message: string }
  | { _tag: "AvatarUnsupportedType"; message: string }
  | { _tag: "AvatarUploadFailed"; message: string };

export async function uploadAvatarBlob(
  blob: Blob,
  deps: {
    claimAvatarUpload: (storageId: Id<"_storage">) => Promise<void>;
    generateUploadUrl: () => Promise<string>;
  },
): Promise<Result<Id<"_storage">, AvatarUploadError>> {
  if (!ALLOWED_TYPES.has(blob.type)) {
    return Result.err({
      _tag: "AvatarUnsupportedType",
      message: "JPEG または PNG の画像を選んでください",
    });
  }
  if (blob.size > MAX_AVATAR_BYTES) {
    return Result.err({
      _tag: "AvatarTooLarge",
      message: "画像は 512KB 以下にしてください",
    });
  }

  const uploadResult = await Result.tryPromise({
    catch: () => ({
      _tag: "AvatarUploadFailed" as const,
      message: "アップロードに失敗しました",
    }),
    try: async () => {
      const uploadUrl = await deps.generateUploadUrl();
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
      await deps.claimAvatarUpload(json.storageId);
      return json.storageId;
    },
  });

  return uploadResult;
}

export function avatarUploadErrorMessage(error: AvatarUploadError): string {
  if ("message" in error) {
    return error.message;
  }
  return "アップロードに失敗しました";
}
