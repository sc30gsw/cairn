import { waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { ProfileSection } from "~/features/my-page/components/profile-section";
import { renderWithMantine } from "~/test-utils/render";

const { notifyErrorMock } = vi.hoisted(() => ({
  notifyErrorMock: vi.fn(),
}));

vi.mock("~/lib/notify", () => ({
  notifyError: notifyErrorMock,
}));

vi.mock("~/hooks/use-avatar-display-url", () => ({
  useAvatarDisplayUrl: vi.fn(() => undefined),
}));

vi.mock("~/features/my-page/hooks/use-avatar-upload-deps", () => ({
  useAvatarUploadDeps: vi.fn(() => ({
    claimAvatarUpload: vi.fn(async () => undefined),
    generateUploadUrl: vi.fn(async () => ({
      claimId: "claim123",
      uploadUrl: "https://example.com/upload",
    })),
  })),
}));

vi.mock("~/features/my-page/hooks/use-my-page-user", () => ({
  useMyPageUser: vi.fn(() => ({
    email: "owner@example.com",
    image: null,
    name: "Owner",
    username: "owner",
  })),
}));

class FailingFileReader {
  error: DOMException | null = new DOMException("boom");
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  result: null | string = null;

  readAsDataURL() {
    queueMicrotask(() => {
      this.onerror?.();
    });
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("ファイル読み込みに失敗したら notifyError で知らせる", async () => {
  vi.stubGlobal("FileReader", FailingFileReader);

  const { container } = renderWithMantine(<ProfileSection />);
  const fileInput = container.querySelector('input[type="file"]');
  if (fileInput === null) {
    throw new Error("file input not found");
  }

  const file = new File(["jpeg"], "avatar.jpg", { type: "image/jpeg" });
  Object.defineProperty(fileInput, "files", { value: [file] });
  fileInput.dispatchEvent(new Event("change", { bubbles: true }));

  await waitFor(() => {
    expect(notifyErrorMock).toHaveBeenCalledWith(
      expect.any(DOMException),
      "画像の読み込みに失敗しました",
    );
  });
});
