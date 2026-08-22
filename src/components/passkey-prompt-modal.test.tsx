import { screen, waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { expect, test, vi } from "vite-plus/test";

import { PasskeyPromptModal } from "~/components/passkey-prompt-modal";
import { AuthActionError } from "~/lib/errors";
import { renderWithMantine } from "~/test-utils/render";

const { addPasskey } = vi.hoisted(() => ({
  addPasskey: vi.fn(),
}));

vi.mock("~/lib/profile-actions", () => ({
  addPasskey,
}));

test("PasskeyPromptModal は登録失敗時にエラーを表示しモーダルを開いたままにする", async () => {
  addPasskey.mockResolvedValue(Result.err(new AuthActionError({ message: "登録に失敗しました" })));
  const onClose = vi.fn();

  renderWithMantine(<PasskeyPromptModal context="signup" onClose={onClose} opened />);

  screen.getByRole("button", { name: "パスキーを追加" }).click();

  await waitFor(() => {
    expect(screen.getByText("登録に失敗しました")).toBeDefined();
  });
  expect(onClose).not.toHaveBeenCalled();
});

test("PasskeyPromptModal は登録成功時に onClose を呼ぶ", async () => {
  addPasskey.mockResolvedValue(Result.ok(undefined));
  const onClose = vi.fn();

  renderWithMantine(<PasskeyPromptModal context="signup" onClose={onClose} opened />);

  screen.getByRole("button", { name: "パスキーを追加" }).click();

  await waitFor(() => {
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
