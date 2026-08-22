import { screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { PasskeyPromptModal } from "~/features/auth/components/passkey-prompt-modal";
import { renderWithMantine } from "~/test-utils/render";

const { addPasskey } = vi.hoisted(() => ({
  addPasskey: vi.fn(),
}));

vi.mock("~/lib/profile-actions", () => ({
  addPasskey,
}));

test("PasskeyPromptModal は登録失敗時にエラーを表示しモーダルを開いたままにする", async () => {
  addPasskey.mockResolvedValue({ errorMessage: "登録に失敗しました" });
  const onClose = vi.fn();

  renderWithMantine(<PasskeyPromptModal context="signup" onClose={onClose} opened />);

  screen.getByRole("button", { name: "パスキーを追加" }).click();

  await waitFor(() => {
    expect(screen.getByText("登録に失敗しました")).toBeDefined();
  });
  expect(onClose).not.toHaveBeenCalled();
});

test("PasskeyPromptModal は登録成功時に onClose を呼ぶ", async () => {
  addPasskey.mockResolvedValue({ errorMessage: null });
  const onClose = vi.fn();

  renderWithMantine(<PasskeyPromptModal context="signup" onClose={onClose} opened />);

  screen.getByRole("button", { name: "パスキーを追加" }).click();

  await waitFor(() => {
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
