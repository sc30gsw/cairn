import { Result } from "better-result";
import { expect, test, vi } from "vite-plus/test";

import { uploadAvatarBlob, avatarUploadErrorMessage } from "~/features/my-page/lib/avatar-upload";
import { AuthActionError } from "~/lib/errors";

test("JPEG 以外は拒否する", async () => {
  const blob = new Blob(["x"], { type: "image/gif" });
  const result = await uploadAvatarBlob(blob, {
    generateUploadUrl: async () => "https://example.com/upload",
    getAvatarUrl: async () => "https://example.com/avatar",
  });
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error._tag).toBe("AvatarUnsupportedType");
  }
});

test("512KB 超は拒否する", async () => {
  const blob = new Blob([new Uint8Array(513 * 1024)], { type: "image/jpeg" });
  const result = await uploadAvatarBlob(blob, {
    generateUploadUrl: async () => "https://example.com/upload",
    getAvatarUrl: async () => "https://example.com/avatar",
  });
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(result.error._tag).toBe("AvatarTooLarge");
  }
});

test("アップロード成功時は URL を返す", async () => {
  const blob = new Blob(["jpeg"], { type: "image/jpeg" });
  const fetchMock = vi.fn(async () => ({
    json: async () => ({ storageId: "storage123" }),
    ok: true,
  }));
  vi.stubGlobal("fetch", fetchMock);

  const result = await uploadAvatarBlob(blob, {
    generateUploadUrl: async () => "https://example.com/upload",
    getAvatarUrl: async () => "https://cdn.example.com/avatar.jpg",
  });

  expect(Result.isOk(result)).toBe(true);
  if (Result.isOk(result)) {
    expect(result.value).toBe("https://cdn.example.com/avatar.jpg");
  }
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
    generateUploadUrl: async () => "https://example.com/upload",
    getAvatarUrl: async () => "https://cdn.example.com/avatar.jpg",
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
    generateUploadUrl: async () => "https://example.com/upload",
    getAvatarUrl: async () => "https://cdn.example.com/avatar.jpg",
  });

  expect(Result.isError(result)).toBe(true);
  vi.unstubAllGlobals();
});

test("avatarUploadErrorMessage は AuthActionError も表示できる", () => {
  expect(
    avatarUploadErrorMessage(new AuthActionError({ cause: null, message: "認証エラー" })),
  ).toBe("認証エラー");
});
