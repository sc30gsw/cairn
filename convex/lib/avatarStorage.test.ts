import { expect, test } from "vite-plus/test";

import { assertAvatarStorageMetadata } from "./avatarStorage";

test("metadata が無ければ拒否する", () => {
  expect(() => assertAvatarStorageMetadata(null)).toThrow("アップロードした画像が見つかりません");
});

test("JPEG / PNG 以外は拒否する", () => {
  expect(() => assertAvatarStorageMetadata({ contentType: "image/gif", size: 100 })).toThrow(
    "JPEG または PNG",
  );
});

test("512KB 超は拒否する", () => {
  expect(() =>
    assertAvatarStorageMetadata({ contentType: "image/png", size: 512 * 1024 + 1 }),
  ).toThrow("512KB 以下");
});

test("有効な PNG metadata は通る", () => {
  expect(() => assertAvatarStorageMetadata({ contentType: "image/png", size: 100 })).not.toThrow();
});
