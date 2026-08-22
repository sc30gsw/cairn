export const MAX_AVATAR_BYTES = 512 * 1024;

const ALLOWED_AVATAR_CONTENT_TYPES = new Set(["image/jpeg", "image/png"]);

export type AvatarStorageMetadata = {
  contentType?: string;
  size: number;
};

export function validateAvatarStorageMetadata(metadata: AvatarStorageMetadata | null): void {
  if (metadata === null) {
    throw new Error("アップロードした画像が見つかりません");
  }

  if (
    metadata.contentType === undefined ||
    !ALLOWED_AVATAR_CONTENT_TYPES.has(metadata.contentType)
  ) {
    throw new Error("JPEG または PNG の画像を選んでください");
  }

  if (metadata.size > MAX_AVATAR_BYTES) {
    throw new Error("画像は 512KB 以下にしてください");
  }
}
