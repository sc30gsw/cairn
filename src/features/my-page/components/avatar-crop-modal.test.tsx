import { screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { AvatarCropModal } from "~/features/my-page/components/avatar-crop-modal";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("react-easy-crop", () => ({
  default: ({
    onCropComplete,
  }: {
    onCropComplete: (area: unknown, pixels: unknown) => void;
  }) => {
    useEffect(() => {
      onCropComplete(
        { height: 100, width: 100, x: 0, y: 0 },
        { height: 100, width: 100, x: 0, y: 0 },
      );
    }, [onCropComplete]);
    return null;
  },
}));

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
  ) {
    callback(new Blob(["jpeg"], { type: "image/jpeg" }));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("AvatarCropModal は onConfirm 失敗時にモーダルを閉じない", async () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn(async () => ({ errorMessage: "保存に失敗しました" }));

  renderWithMantine(
    <AvatarCropModal
      imageSrc="data:image/png;base64,iVBORw0KGgo="
      onClose={onClose}
      onConfirm={onConfirm}
      opened
    />,
  );

  screen.getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(screen.getByText("保存に失敗しました")).toBeDefined();
  });
  expect(onClose).not.toHaveBeenCalled();
});

test("AvatarCropModal は onConfirm 成功時に onClose を呼ぶ", async () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn(async () => ({ errorMessage: null }));

  renderWithMantine(
    <AvatarCropModal
      imageSrc="data:image/png;base64,iVBORw0KGgo="
      onClose={onClose}
      onConfirm={onConfirm}
      opened
    />,
  );

  screen.getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
