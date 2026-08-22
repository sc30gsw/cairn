import { Result } from "better-result";
import { expect, test, vi } from "vite-plus/test";

import { uploadAvatarBlob, avatarUploadErrorMessage } from "~/features/my-page/lib/avatar-upload";
import { AuthActionError } from "~/lib/errors";

const STORAGE_ID = "storage123" as never;

test("JPEG 以外は拒否する", async () => {
  const blob = new Blob(["x"], { type: "image/gif" });
  const result = await uploadAvatarBlob(blob, {
    claimAvatarUpload: async () => {},
    generateUploadUrl: async () => "https://example.com/upload",
  });
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error._tag).toBe("AvatarUnsupportedType");
  }
});

test("512KB 超は拒否する", async () => {
  const blob = new Blob([new Uint8Array(513 * 1024)], { type: "image/jpeg" });
  const result = await uploadAvatarBlob(blob, {
    claimAvatarUpload: async () => {},
    generateUploadUrl: async () => "https://example.com/upload",
  });
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error._tag).toBe("AvatarTooLarge");
  }
});

test("アップロード成功時は storageId を返す", async () => {
  const blob = new Blob(["jpeg"], { type: "image/jpeg" });
  const fetchMock = vi.fn(async () => ({
    json: async () => ({ storageId: STORAGE_ID }),
    ok: true,
  }));
  vi.stubGlobal("fetch", fetchMock);

  const claimMock = vi.fn(async () => {});
  const result = await uploadAvatarBlob(blob, {
    claimAvatarUpload: claimMock,
    generateUploadUrl: async () => "https://example.com/upload",
  });

  expect(Result.isOk(result)).toBe(true);
  if (Result.isOk(result)) {
    expect(result.value).toBe(STORAGE_ID);
  }
  expect(claimMock).toHaveBeenCalledWith(STORAGE_ID);
  expect(fetchMock).toHaveBeenCalledWith(
    "https://example.com/upload",
    expect.objectContaining({ method: "POST" }),
  );
  vi.unstubAllGlobals();
});

test("HTTP エラーは AvatarUploadFailed を返す", async () => {
  const blob = new Blob(["jpeg"], { type: "image/jpeg" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: false,
    })),
  );

  const result = await uploadAvatarBlob(blob, {
    claimAvatarUpload: async () => {},
    generateUploadUrl: async () => "https://example.com/upload",
  });

  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error._tag).toBe("AvatarUploadFailed");
  }
  vi.unstubAllGlobals();
});

test("storageId が無いレスポンスは失敗する", async () => {
  const blob = new Blob(["jpeg"], { type: "image/jpeg" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      json: async () => ({}),
      ok: true,
    })),
  );

  const result = await uploadAvatarBlob(blob, {
    claimAvatarUpload: async () => {},
    generateUploadUrl: async () => "https://example.com/upload",
  });

  expect(Result.isError(result)).toBe(true);
  vi.unstubAllGlobals();
});

test("avatarUploadErrorMessage は AuthActionError も表示できる", () => {
  expect(
    avatarUploadErrorMessage(new AuthActionError({ cause: null, message: "認証エラー" })),
  ).toBe("認証エラー");
});
