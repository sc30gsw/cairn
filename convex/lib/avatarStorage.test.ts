import { expect, test } from "vite-plus/test";

import { MAX_AVATAR_BYTES, validateAvatarStorageMetadata } from "./avatarStorage";

test("validateAvatarStorageMetadata は null を拒否する", () => {
  expect(() => validateAvatarStorageMetadata(null)).toThrow("アップロードした画像が見つかりません");
});

test("validateAvatarStorageMetadata は JPEG / PNG のみ許可する", () => {
  expect(() => validateAvatarStorageMetadata({ contentType: "image/gif", size: 100 })).toThrow(
    "JPEG または PNG",
  );
  expect(() => validateAvatarStorageMetadata({ contentType: undefined, size: 100 })).toThrow(
    "JPEG または PNG",
  );

  expect(() =>
    validateAvatarStorageMetadata({ contentType: "image/jpeg", size: 100 }),
  ).not.toThrow();
  expect(() =>
    validateAvatarStorageMetadata({ contentType: "image/png", size: 100 }),
  ).not.toThrow();
});

test("validateAvatarStorageMetadata はサイズ上限を超える画像を拒否する", () => {
  expect(() =>
    validateAvatarStorageMetadata({
      contentType: "image/jpeg",
      size: MAX_AVATAR_BYTES + 1,
    }),
  ).toThrow("512KB");
});
