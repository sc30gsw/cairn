import type { Id } from "~/../convex/_generated/dataModel";

export const AVATAR_STORAGE_PREFIX = "convex-storage:";

export function encodeAvatarStorageRef(storageId: Id<"_storage">): string {
  return `${AVATAR_STORAGE_PREFIX}${storageId}`;
}

export function parseAvatarStorageRef(image: null | string | undefined): Id<"_storage"> | null {
  if (image === null || image === undefined || !image.startsWith(AVATAR_STORAGE_PREFIX)) {
    return null;
  }
  return image.slice(AVATAR_STORAGE_PREFIX.length) as Id<"_storage">;
}

export function isExternalAvatarUrl(image: null | string | undefined): image is string {
  if (image === null || image === undefined || image === "") {
    return false;
  }
  return parseAvatarStorageRef(image) === null;
}
