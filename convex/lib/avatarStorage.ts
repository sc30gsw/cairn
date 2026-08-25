import { NotFoundError, ValidationFailedError } from "./errors";
import { throwDomain } from "./ownerFunctions";

export const MAX_AVATAR_BYTES = 512 * 1024;

const ALLOWED_AVATAR_CONTENT_TYPES = new Set(["image/jpeg", "image/png"]);

export type AvatarStorageMetadata = {
  contentType?: string;
  size: number;
};

//* claim 時に _storage のメタデータを検証する。想定内の失敗はドメインエラーとして投げる。
//? 素の Error は Convex が本番でメッセージを握りつぶすので、必ず throwDomain 経由にする。
export function assertAvatarStorageMetadata(metadata: AvatarStorageMetadata | null): void {
  if (metadata === null) {
    throwDomain(
      new NotFoundError({ message: "アップロードした画像が見つかりません", resource: "画像" }),
    );
  }

  if (
    metadata.contentType === undefined ||
    !ALLOWED_AVATAR_CONTENT_TYPES.has(metadata.contentType)
  ) {
    throwDomain(new ValidationFailedError({ message: "JPEG または PNG の画像を選んでください" }));
  }

  if (metadata.size > MAX_AVATAR_BYTES) {
    throwDomain(new ValidationFailedError({ message: "画像は 512KB 以下にしてください" }));
  }
}
