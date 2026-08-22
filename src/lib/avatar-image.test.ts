import { expect, test } from "vite-plus/test";

import {
  encodeAvatarStorageRef,
  isExternalAvatarUrl,
  parseAvatarStorageRef,
} from "~/lib/avatar-image";

test("encodeAvatarStorageRef / parseAvatarStorageRef は往復できる", () => {
  const storageId = "abc123" as import("~/../convex/_generated/dataModel").Id<"_storage">;
  const encoded = encodeAvatarStorageRef(storageId);
  expect(encoded).toBe("convex-storage:abc123");
  expect(parseAvatarStorageRef(encoded)).toBe(storageId);
});

test("parseAvatarStorageRef は外部 URL を null にする", () => {
  expect(parseAvatarStorageRef("https://example.com/avatar.jpg")).toBeNull();
});

test("isExternalAvatarUrl は http(s) URL のみ true", () => {
  expect(isExternalAvatarUrl("https://example.com/a.jpg")).toBe(true);
  expect(isExternalAvatarUrl("convex-storage:abc")).toBe(false);
});
