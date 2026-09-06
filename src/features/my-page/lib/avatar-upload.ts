import { Result, TaggedError } from "better-result";
import { validate } from "convex-helpers/validators";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { v as cv } from "convex/values";
import * as v from "valibot";

import type { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";
import { ALLOWED_AVATAR_CONTENT_TYPES, MAX_AVATAR_BYTES } from "~/../convex/lib/avatarStorage";
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

type ClaimAvatarUpload = typeof api.mutations.profile.claimAvatarUpload.claimAvatarUpload;
type GenerateAvatarUploadUrl =
  typeof api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl;

export type AvatarUploadDependencies = {
  claimAvatarUpload: (
    args: FunctionArgs<ClaimAvatarUpload>,
  ) => Promise<FunctionReturnType<ClaimAvatarUpload>>;
  generateUploadUrl: () => Promise<FunctionReturnType<GenerateAvatarUploadUrl>>;
};

const storageIdValidator = cv.id("_storage");
const uploadResponseSchema = v.object({
  storageId: v.pipe(
    v.custom<Id<"_storage">>((input) => validate(storageIdValidator, input)),
    v.nonEmpty("ストレージ ID を取得できませんでした"),
  ),
});

export async function uploadAvatarBlob(
  blob: Blob,
  deps: AvatarUploadDependencies,
): Promise<Result<Id<"_storage">, AvatarUploadError>> {
  if (!ALLOWED_AVATAR_CONTENT_TYPES.has(blob.type)) {
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
      const { storageId } = v.parse(uploadResponseSchema, await response.json());
      await deps.claimAvatarUpload({ claimId, storageId });
      return storageId;
    },
  });

  return uploadResult;
}

export function avatarUploadErrorMessage(error: AvatarUploadError): string {
  if (error instanceof AvatarUploadFailedError) {
    return presentError(error.cause, error.message).message;
  }
  return error.message;
}
