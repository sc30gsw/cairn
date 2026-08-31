import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { useAvatarUploadDeps } from "~/features/my-page/hooks/use-avatar-upload-deps";

const { generateUploadUrlMock, claimAvatarUploadMock } = vi.hoisted(() => ({
  claimAvatarUploadMock: vi.fn(async () => undefined),
  generateUploadUrlMock: vi.fn(async () => ({
    claimId: "claim123",
    uploadUrl: "https://example.com/upload",
  })),
}));

vi.mock("~/lib/use-convex-mutation", () => {
  let callCount = 0;
  return {
    useConvexMutation: vi.fn(() => {
      callCount += 1;
      return callCount === 1 ? generateUploadUrlMock : claimAvatarUploadMock;
    }),
  };
});

afterEach(() => {
  cleanup();
});

test("useAvatarUploadDeps は useConvexMutation 経由のハンドラを組み立てる", async () => {
  const { result } = renderHook(() => useAvatarUploadDeps());

  const uploadUrlResult = await result.current.generateUploadUrl();
  expect(generateUploadUrlMock).toHaveBeenCalledWith({});
  expect(uploadUrlResult).toEqual({
    claimId: "claim123",
    uploadUrl: "https://example.com/upload",
  });

  await result.current.claimAvatarUpload({
    claimId: "claim123" as Id<"avatarUploadClaims">,
    storageId: "storage123" as Id<"_storage">,
  });
  expect(claimAvatarUploadMock).toHaveBeenCalledWith({
    claimId: "claim123",
    storageId: "storage123",
  });
});
