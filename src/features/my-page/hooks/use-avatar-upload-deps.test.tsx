import { expect, test, vi } from "vite-plus/test";

import { useAvatarUploadDeps } from "~/features/my-page/hooks/use-avatar-upload-deps";
import { renderWithMantine } from "~/test-utils/render";

//? useAvatarUploadDeps は generateUploadUrl → claimAvatarUpload の順に useConvexMutation を呼ぶ
//? (use-avatar-upload-deps.ts の実装順)。呼び出し順序で、どちらのミューテーションを模した
//? モックを返すかを切り替える
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

let captured: ReturnType<typeof useAvatarUploadDeps> | null = null;

function Probe() {
  captured = useAvatarUploadDeps();
  return null;
}

test("useAvatarUploadDeps は useConvexMutation 経由のハンドラを組み立てる", async () => {
  renderWithMantine(<Probe />);

  const deps = captured;
  if (deps === null) {
    throw new Error("captured is null");
  }

  const uploadUrlResult = await deps.generateUploadUrl();
  expect(generateUploadUrlMock).toHaveBeenCalledWith({});
  expect(uploadUrlResult).toEqual({
    claimId: "claim123",
    uploadUrl: "https://example.com/upload",
  });

  await deps.claimAvatarUpload({
    claimId: "claim123" as import("~/../convex/_generated/dataModel").Id<"avatarUploadClaims">,
    storageId: "storage123" as import("~/../convex/_generated/dataModel").Id<"_storage">,
  });
  expect(claimAvatarUploadMock).toHaveBeenCalledWith({
    claimId: "claim123",
    storageId: "storage123",
  });
});
