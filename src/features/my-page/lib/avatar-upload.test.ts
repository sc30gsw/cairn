import { Result } from "better-result";
import { expect, test, vi } from "vite-plus/test";

import {
  AvatarTooLargeError,
  AvatarUnsupportedTypeError,
  AvatarUploadFailedError,
  uploadAvatarBlob,
  avatarUploadErrorMessage,
} from "~/features/my-page/lib/avatar-upload";
import { AuthActionError } from "~/lib/errors";

const uploadDeps = {
  claimAvatarUpload: async () => {},
  generateUploadUrl: async () => ({
    claimId: "claim123" as import("~/../convex/_generated/dataModel").Id<"avatarUploadClaims">,
    uploadUrl: "https://example.com/upload",
  }),
};

test("JPEG 以外は拒否する", async () => {
  const blob = new Blob(["x"], { type: "image/gif" });
  const result = await uploadAvatarBlob(blob, uploadDeps);
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error).toBeInstanceOf(AvatarUnsupportedTypeError);
  }
});

test("512KB 超は拒否する", async () => {
  const blob = new Blob([new Uint8Array(513 * 1024)], { type: "image/jpeg" });
  const result = await uploadAvatarBlob(blob, uploadDeps);
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error).toBeInstanceOf(AvatarTooLargeError);
  }
});

test("アップロード成功時は storageId を返す", async () => {
  const blob = new Blob(["jpeg"], { type: "image/jpeg" });
  const fetchMock = vi.fn(async () => ({
    json: async () => ({ storageId: "storage123" }),
    ok: true,
  }));
  vi.stubGlobal("fetch", fetchMock);

  const result = await uploadAvatarBlob(blob, uploadDeps);

  expect(Result.isOk(result)).toBe(true);
  if (Result.isOk(result)) {
    expect(result.value).toBe("storage123");
  }
  vi.unstubAllGlobals();
});

test("HTTP エラーは AvatarUploadFailedError を返す", async () => {
  const blob = new Blob(["jpeg"], { type: "image/jpeg" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: false,
    })),
  );

  const result = await uploadAvatarBlob(blob, uploadDeps);

  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error).toBeInstanceOf(AvatarUploadFailedError);
  }
  vi.unstubAllGlobals();
});

test("avatarUploadErrorMessage は AuthActionError も表示できる", () => {
  expect(
    avatarUploadErrorMessage(new AuthActionError({ cause: null, message: "認証エラー" })),
  ).toBe("認証エラー");
});
