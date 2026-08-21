import { expect, test, vi } from "vite-plus/test";

import { LoginScreen } from "~/features/auth/components/login-screen";
import { renderWithMantine } from "~/test-utils/render";

test("未ログインなら記録ではなくログインボタンが見える", () => {
  const onNotionSignIn = vi.fn();
  const { getByRole, queryByText } = renderWithMantine(
    <LoginScreen onNotionSignIn={onNotionSignIn} showDevEmailAuth={false} showNotionSignIn />,
  );
  expect(queryByText("Distinction 2000")).toBeNull();
  getByRole("button", { name: "Notion でログイン" }).click();
  expect(onNotionSignIn).toHaveBeenCalledTimes(1);
});
